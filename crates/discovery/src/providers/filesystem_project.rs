use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Evidence, Resource, ResourceKind};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// A file whose presence in a directory identifies it as a project root
/// for a given ecosystem. Checked in order; a directory can match more
/// than one (a Node project with a Dockerfile, for instance).
const PROJECT_MARKERS: &[(&str, &str)] = &[
    ("package.json", "node"),
    ("Cargo.toml", "rust"),
    ("go.mod", "go"),
    ("pyproject.toml", "python"),
    ("requirements.txt", "python"),
    ("Pipfile", "python"),
    ("Gemfile", "ruby"),
    ("pom.xml", "java"),
    ("build.gradle", "java"),
    ("build.gradle.kts", "kotlin"),
    (".csproj", "dotnet"),
    ("composer.json", "php"),
    ("mix.exs", "elixir"),
];

/// Walks the configured search roots looking for project directories:
/// anything containing a recognized manifest file or a `.git` directory.
/// Descent stops at the first match in a subtree (a project's own
/// `node_modules` is never itself treated as a nested project) and at
/// any directory named in `ctx.ignored_directory_names`.
pub struct FilesystemProjectProvider;

#[async_trait]
impl DiscoveryProvider for FilesystemProjectProvider {
    fn id(&self) -> &'static str {
        "filesystem_project"
    }

    fn label(&self) -> &'static str {
        "Projects"
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
        walk_for_projects(root, ctx, &mut output);
    }

    Ok(output)
}

fn walk_for_projects(root: &Path, ctx: &ScanContext, output: &mut ProviderOutput) {
    let mut walker = WalkDir::new(root).max_depth(ctx.max_fs_depth).into_iter();

    loop {
        let entry = match walker.next() {
            Some(Ok(entry)) => entry,
            Some(Err(_)) => continue,
            None => break,
        };

        if !entry.file_type().is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy();
        if ctx
            .ignored_directory_names
            .iter()
            .any(|ignored| ignored == name.as_ref())
        {
            walker.skip_current_dir();
            continue;
        }

        if let Some(project) = detect_project(entry.path()) {
            output.resources.push(project);
            // Do not descend into a detected project: its own dependency
            // directories and build output would otherwise be walked
            // looking for nested "projects" that are really just vendored
            // code.
            walker.skip_current_dir();
        }
    }
}

fn detect_project(dir: &Path) -> Option<Resource> {
    let mut ecosystems = Vec::new();
    let mut evidence = Vec::new();

    for (marker, ecosystem) in PROJECT_MARKERS {
        let marker_path = dir.join(marker);
        if marker_path.is_file() {
            ecosystems.push(*ecosystem);
            evidence.push(Evidence {
                source: "filesystem_project".to_string(),
                description: format!("found {marker}"),
                path: Some(marker_path.display().to_string()),
            });
        }
    }

    let has_git = dir.join(".git").exists();
    if ecosystems.is_empty() && !has_git {
        return None;
    }

    let name = dir.file_name()?.to_string_lossy().into_owned();
    let dir_display = dir.display().to_string();
    let mut resource =
        Resource::identified(ResourceKind::Project, name, &dir_display).with_path(dir_display);
    resource = resource.with_attribute("ecosystems", ecosystems);
    resource = resource.with_attribute("has_git", has_git);

    for e in evidence {
        resource = resource.with_evidence(e);
    }
    if has_git {
        resource = resource.with_evidence(Evidence {
            source: "filesystem_project".to_string(),
            description: "found .git directory".to_string(),
            path: Some(dir.join(".git").display().to_string()),
        });
    }

    Some(resource)
}

/// Reasonable defaults for onboarding: the directories developers
/// actually keep code in, filtered to the ones that exist on this
/// machine. The user can add or remove roots afterward in settings.
pub fn default_search_roots(home: &Path) -> Vec<PathBuf> {
    ["Developer", "Projects", "code", "src", "workspace", "repos"]
        .iter()
        .map(|dir| home.join(dir))
        .filter(|path| path.is_dir())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn finds_node_and_rust_projects_and_skips_node_modules() {
        let root = tempdir().unwrap();

        let node_project = root.path().join("web-app");
        std::fs::create_dir_all(node_project.join("node_modules/some-dep")).unwrap();
        std::fs::write(node_project.join("package.json"), "{}").unwrap();
        std::fs::write(
            node_project.join("node_modules/some-dep/package.json"),
            "{}",
        )
        .unwrap();

        let rust_project = root.path().join("cli-tool");
        std::fs::create_dir_all(&rust_project).unwrap();
        std::fs::write(rust_project.join("Cargo.toml"), "[package]\nname=\"x\"").unwrap();

        let ctx = ScanContext::new(root.path().to_path_buf(), vec![root.path().to_path_buf()]);
        let output = FilesystemProjectProvider.scan(&ctx).await.unwrap();

        let names: Vec<_> = output.resources.iter().map(|r| r.name.as_str()).collect();
        assert!(names.contains(&"web-app"));
        assert!(names.contains(&"cli-tool"));
        assert!(
            !names.contains(&"some-dep"),
            "should not descend into node_modules: {names:?}"
        );
        assert_eq!(output.resources.len(), 2);
    }
}
