//! Turns the machine model into cleanup recommendations.
//!
//! This is deliberately generic over which provider produced a resource:
//! it looks at `ResourceKind` plus a small, documented set of optional
//! attributes any provider can set (`size_bytes`, `last_used`), and at
//! the graph's own dependency edges (`Graph::dependents_of`) to decide
//! whether something is safe to suggest removing. A new provider that
//! wants its resources considered for cleanup does not require a change
//! here: it just needs to emit `ResourceKind::Cache`,
//! `ResourceKind::BuildArtifact`, `ResourceKind::DockerImage`, or
//! `ResourceKind::DockerVolume` resources with those attributes set.

use codeatlas_core::{CleanupCandidate, CleanupCategory, Graph, Resource, ResourceKind};

/// Reads a resource's `size_bytes` attribute if the provider that found
/// it reported one.
fn size_bytes(resource: &Resource) -> Option<u64> {
    resource.attributes.get("size_bytes").and_then(|v| v.as_u64())
}

fn last_used(resource: &Resource) -> Option<chrono::DateTime<chrono::Utc>> {
    resource
        .attributes
        .get("last_used")
        .and_then(|v| v.as_str())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc))
}

fn category_for(kind: ResourceKind) -> Option<CleanupCategory> {
    match kind {
        ResourceKind::Cache => Some(CleanupCategory::Cache),
        ResourceKind::BuildArtifact => Some(CleanupCategory::StaleBuildArtifact),
        ResourceKind::DockerImage => Some(CleanupCategory::UnusedDockerImage),
        ResourceKind::DockerVolume => Some(CleanupCategory::UnusedDockerVolume),
        _ => None,
    }
}

pub fn analyze(graph: &Graph) -> Vec<CleanupCandidate> {
    let mut candidates = Vec::new();

    for resource in graph.resources() {
        let Some(category) = category_for(resource.kind) else { continue };

        let dependents: Vec<_> = graph.dependents_of(resource.id).into_iter().collect();
        let reversible = matches!(resource.kind, ResourceKind::Cache | ResourceKind::BuildArtifact);

        let reasoning = if dependents.is_empty() {
            format!(
                "{} is not referenced by anything else CodeAtlas discovered",
                resource.kind.label().to_lowercase()
            )
        } else {
            format!(
                "{} is referenced by {} other resource(s); review before removing",
                resource.kind.label().to_lowercase(),
                dependents.len()
            )
        };

        let consequence = match resource.kind {
            ResourceKind::DockerImage => {
                "removes the image; any stopped containers created from it are also removed".to_string()
            }
            ResourceKind::DockerVolume => {
                "permanently deletes the volume's data; this cannot be undone".to_string()
            }
            ResourceKind::Cache => "deletes the cache directory; it will be rebuilt automatically on next use".to_string(),
            ResourceKind::BuildArtifact => "deletes the build output; rerunning the build regenerates it".to_string(),
            _ => "removes the resource".to_string(),
        };

        candidates.push(CleanupCandidate {
            resource_id: resource.id,
            resource_kind: resource.kind,
            name: resource.name.clone(),
            path: resource.path.clone(),
            category,
            reasoning,
            evidence: resource.evidence.clone(),
            last_used: last_used(resource),
            depended_on_by: dependents,
            size_bytes: size_bytes(resource),
            reversible,
            consequence,
        });
    }

    candidates.sort_by(|a, b| b.size_bytes.unwrap_or(0).cmp(&a.size_bytes.unwrap_or(0)));
    candidates
}

#[cfg(test)]
mod tests {
    use super::*;
    use codeatlas_core::{Relationship, RelationshipKind};

    #[test]
    fn uncontested_cache_is_flagged_with_no_dependents() {
        let mut graph = Graph::new();
        let cache = Resource::new(ResourceKind::Cache, "pnpm-store")
            .with_path("/Users/dev/.pnpm-store")
            .with_attribute("size_bytes", 4_000_000_000u64);
        let cache_id = cache.id;
        graph.upsert_resource(cache);

        let candidates = analyze(&graph);
        assert_eq!(candidates.len(), 1);
        assert!(candidates[0].is_uncontested());
        assert_eq!(candidates[0].resource_id, cache_id);
        assert_eq!(candidates[0].size_bytes, Some(4_000_000_000));
    }

    #[test]
    fn docker_image_with_running_container_is_not_uncontested() {
        let mut graph = Graph::new();
        let image = Resource::new(ResourceKind::DockerImage, "postgres:16");
        let container = Resource::new(ResourceKind::DockerContainer, "db-1");
        let (image_id, container_id) = (image.id, container.id);
        graph.upsert_resource(image);
        graph.upsert_resource(container);
        graph.add_relationship(Relationship::new(
            container_id,
            image_id,
            RelationshipKind::InstantiatedFrom,
        ));

        let candidates = analyze(&graph);
        let image_candidate = candidates.iter().find(|c| c.resource_id == image_id).unwrap();
        assert!(!image_candidate.is_uncontested());
        assert_eq!(image_candidate.depended_on_by, vec![container_id]);
    }
}
