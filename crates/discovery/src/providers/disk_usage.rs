use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use codeatlas_core::{
    deterministic_id, Evidence, Relationship, RelationshipKind, Resource, ResourceKind,
};
use std::path::Path;
use walkdir::WalkDir;

/// Well-known cache and build-output directory names, and the
/// `ResourceKind` each should be reported as. Checked by exact directory
/// name against every directory encountered while walking the search
/// roots (not just directories directly inside a detected project), so
/// e.g. a `node_modules` nested a few levels down is still found.
const CACHE_DIR_NAMES: &[&str] = &[
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".pnpm-store",
    ".gradle",
    ".cache",
];
const BUILD_ARTIFACT_DIR_NAMES: &[&str] =
    &["target", "dist", "build", ".next", "Pods", "DerivedData"];

/// How many levels deep, relative to the directory itself, the sizing
/// walk will descend when summing file sizes. Bounds pathological cases
/// (a `node_modules` with an absurdly deep dependency tree) without
/// meaningfully affecting accuracy for the directories this provider
/// looks for.
const MAX_SIZE_WALK_DEPTH: usize = 20;

/// Reports on-disk size and staleness of caches and build artifacts
/// (`node_modules`, `target`, `.venv`, `dist`, etc.) found under the
/// configured search roots, linked back to the project that owns them so
/// the cleanup center (`crate::cleanup`) can recommend reclaiming space.
///
/// This provider only ever reads directory listings and file metadata
/// (names, sizes, modification times) — it never opens file contents.
pub struct DiskUsageProvider;

#[async_trait]
impl DiscoveryProvider for DiskUsageProvider {
    fn id(&self) -> &'static str {
        "disk_usage"
    }

    fn label(&self) -> &'static str {
        "Disk usage"
    }

    fn availability(&self, ctx: &ScanContext) -> Availability {
        if ctx.search_roots.is_empty() {
            Availability::Unavailable {
                reason: "no search roots configured".to_string(),
            }
        } else {
            Availability::Available
        }
    }

    async fn scan(&self, ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        let ctx = ctx.clone();
        tokio::task::spawn_blocking(move || scan_blocking(&ctx))
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

fn scan_blocking(ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    for root in &ctx.search_roots {
        if !root.exists() {
            continue;
        }
        walk_for_disk_usage(root, ctx, &mut output);
    }

    Ok(output)
}

fn walk_for_disk_usage(root: &Path, ctx: &ScanContext, output: &mut ProviderOutput) {
    // The current project root, tracked as we descend, so a found
    // cache/build directory can be linked to the project that owns it
    // via the same deterministic id `filesystem_project` computes.
    let mut walker = WalkDir::new(root)
        .max_depth(ctx.max_fs_depth)
        .follow_links(false)
        .into_iter();

    loop {
        let entry = match walker.next() {
            Some(Ok(entry)) => entry,
            Some(Err(_)) => continue,
            None => break,
        };

        if !entry.file_type().is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().into_owned();

        let kind = if CACHE_DIR_NAMES.contains(&name.as_str()) {
            Some(ResourceKind::Cache)
        } else if BUILD_ARTIFACT_DIR_NAMES.contains(&name.as_str()) {
            Some(ResourceKind::BuildArtifact)
        } else {
            None
        };

        if let Some(kind) = kind {
            if let Some(resource) = build_resource(entry.path(), &name, kind) {
                if let Some(parent) = entry.path().parent() {
                    let project_dir_display = parent.display().to_string();
                    let project_id = deterministic_id(ResourceKind::Project, &project_dir_display);
                    output.relationships.push(
                        Relationship::new(project_id, resource.id, RelationshipKind::Contains)
                            .with_evidence(Evidence {
                                source: "disk_usage".to_string(),
                                description: format!(
                                    "found {name} directly under project directory"
                                ),
                                path: None,
                            }),
                    );
                }
                output.resources.push(resource);
            }
            // Never descend into a cache/build directory itself looking
            // for more caches: the whole point of sizing it here is to
            // treat it as a single opaque unit.
            walker.skip_current_dir();
            continue;
        }

        // Also respect the context's generic ignore list for anything
        // not already handled above (e.g. `.git`), so we don't waste
        // time walking into it.
        if ctx
            .ignored_directory_names
            .iter()
            .any(|ignored| ignored == &name)
            && !CACHE_DIR_NAMES.contains(&name.as_str())
            && !BUILD_ARTIFACT_DIR_NAMES.contains(&name.as_str())
        {
            walker.skip_current_dir();
        }
    }
}

fn build_resource(dir: &Path, name: &str, kind: ResourceKind) -> Option<Resource> {
    let dir_display = dir.display().to_string();
    let dir_metadata = std::fs::symlink_metadata(dir).ok()?;
    if !dir_metadata.is_dir() {
        return None;
    }

    let size_bytes = directory_size_bytes(dir);
    let last_used = dir_metadata.modified().ok().map(DateTime::<Utc>::from);

    let mut resource = Resource::identified(kind, name, &dir_display)
        .with_path(dir_display.clone())
        .with_attribute("size_bytes", size_bytes);

    if let Some(last_used) = last_used {
        resource = resource.with_attribute("last_used", last_used.to_rfc3339());
    }

    resource = resource.with_evidence(Evidence {
        source: "disk_usage".to_string(),
        description: format!("found {name} directory and summed its contents"),
        path: Some(dir_display),
    });

    Some(resource)
}

/// Sums the size of every regular file under `dir`, following no
/// symlinks and descending no more than `MAX_SIZE_WALK_DEPTH` levels.
/// Unreadable entries (permission errors, races with concurrent
/// deletion) are silently skipped rather than failing the whole scan.
fn directory_size_bytes(dir: &Path) -> u64 {
    WalkDir::new(dir)
        .max_depth(MAX_SIZE_WALK_DEPTH)
        .follow_links(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok())
        .map(|metadata| metadata.len())
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn finds_node_modules_as_cache_with_size_and_last_used() {
        let root = tempdir().unwrap();
        let project_dir = root.path().join("web-app");
        let node_modules = project_dir.join("node_modules");
        std::fs::create_dir_all(&node_modules).unwrap();
        std::fs::write(project_dir.join("package.json"), "{}").unwrap();
        std::fs::write(node_modules.join("some-file.js"), "hello world").unwrap();

        let ctx = ScanContext::new(root.path().to_path_buf(), vec![root.path().to_path_buf()]);
        let output = DiskUsageProvider.scan(&ctx).await.unwrap();

        let cache = output
            .resources
            .iter()
            .find(|r| r.name == "node_modules")
            .expect("node_modules should be reported");
        assert_eq!(cache.kind, ResourceKind::Cache);

        let size = cache
            .attributes
            .get("size_bytes")
            .and_then(|v| v.as_u64())
            .unwrap();
        assert_eq!(size, "hello world".len() as u64);

        assert!(cache
            .attributes
            .get("last_used")
            .and_then(|v| v.as_str())
            .is_some());

        // Should be linked to the owning project via a Contains relationship.
        let project_id =
            deterministic_id(ResourceKind::Project, &project_dir.display().to_string());
        assert!(output.relationships.iter().any(|r| r.from == project_id
            && r.to == cache.id
            && r.kind == RelationshipKind::Contains));
    }

    #[tokio::test]
    async fn classifies_target_as_build_artifact() {
        let root = tempdir().unwrap();
        let project_dir = root.path().join("cli-tool");
        let target = project_dir.join("target");
        std::fs::create_dir_all(target.join("debug")).unwrap();
        std::fs::write(project_dir.join("Cargo.toml"), "[package]\nname=\"x\"").unwrap();
        std::fs::write(target.join("debug/binary"), [0u8; 128]).unwrap();

        let ctx = ScanContext::new(root.path().to_path_buf(), vec![root.path().to_path_buf()]);
        let output = DiskUsageProvider.scan(&ctx).await.unwrap();

        let artifact = output
            .resources
            .iter()
            .find(|r| r.name == "target")
            .expect("target should be reported");
        assert_eq!(artifact.kind, ResourceKind::BuildArtifact);
        assert_eq!(
            artifact
                .attributes
                .get("size_bytes")
                .and_then(|v| v.as_u64()),
            Some(128)
        );
    }

    #[tokio::test]
    async fn does_not_descend_into_found_cache_directories() {
        let root = tempdir().unwrap();
        let project_dir = root.path().join("web-app");
        let nested = project_dir.join("node_modules/some-dep/node_modules");
        std::fs::create_dir_all(&nested).unwrap();
        std::fs::write(nested.join("f.txt"), "x").unwrap();

        let ctx = ScanContext::new(root.path().to_path_buf(), vec![root.path().to_path_buf()]);
        let output = DiskUsageProvider.scan(&ctx).await.unwrap();

        let node_modules_count = output
            .resources
            .iter()
            .filter(|r| r.name == "node_modules")
            .count();
        assert_eq!(
            node_modules_count, 1,
            "should only report the outer node_modules once"
        );
    }
}
