use crate::resource::{ResourceId, ResourceKind};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeKind {
    Discovered,
    Removed,
    Modified,
}

/// A single entry in the local timeline: something the discovery engine
/// noticed differed between two scans. This is built purely by diffing
/// consecutive scans, never fabricated or estimated.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEvent {
    pub id: Uuid,
    pub resource_id: ResourceId,
    pub resource_kind: ResourceKind,
    pub resource_name: String,
    pub kind: ChangeKind,
    pub summary: String,
    pub occurred_at: DateTime<Utc>,
}

impl ChangeEvent {
    pub fn new(
        resource_id: ResourceId,
        resource_kind: ResourceKind,
        resource_name: impl Into<String>,
        kind: ChangeKind,
        summary: impl Into<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            resource_id,
            resource_kind,
            resource_name: resource_name.into(),
            kind,
            summary: summary.into(),
            occurred_at: Utc::now(),
        }
    }
}

/// Diffs two scan generations of a resource set and produces the change
/// events between them. Pure function so it is trivially testable and
/// reusable from both the discovery engine and, later, from a
/// `codeatlas diff` CLI command.
pub fn diff_resources<'a>(
    previous: impl IntoIterator<Item = &'a crate::resource::Resource>,
    current: impl IntoIterator<Item = &'a crate::resource::Resource>,
) -> Vec<ChangeEvent> {
    use std::collections::HashMap;

    let previous: HashMap<_, _> = previous.into_iter().map(|r| (identity_key(r), r)).collect();
    let current: HashMap<_, _> = current.into_iter().map(|r| (identity_key(r), r)).collect();

    let mut events = Vec::new();

    for (key, resource) in &current {
        match previous.get(key) {
            None => events.push(ChangeEvent::new(
                resource.id,
                resource.kind,
                resource.name.clone(),
                ChangeKind::Discovered,
                format!("{} discovered", resource.kind.label()),
            )),
            Some(prev) if prev.attributes != resource.attributes => {
                events.push(ChangeEvent::new(
                    resource.id,
                    resource.kind,
                    resource.name.clone(),
                    ChangeKind::Modified,
                    format!("{} changed", resource.kind.label()),
                ));
            }
            Some(_) => {}
        }
    }

    for (key, resource) in &previous {
        if !current.contains_key(key) {
            events.push(ChangeEvent::new(
                resource.id,
                resource.kind,
                resource.name.clone(),
                ChangeKind::Removed,
                format!("{} no longer detected", resource.kind.label()),
            ));
        }
    }

    events
}

/// Resources are matched across scans by kind + path (or kind + name when
/// there is no path), not by id, since a fresh scan assigns fresh ids.
fn identity_key(resource: &crate::resource::Resource) -> (ResourceKind, String) {
    let discriminator = resource
        .path
        .clone()
        .unwrap_or_else(|| resource.name.clone());
    (resource.kind, discriminator)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::resource::{Resource, ResourceKind};

    #[test]
    fn detects_discovered_removed_and_modified() {
        let kept = Resource::new(ResourceKind::Tool, "node").with_path("/usr/local/bin/node");
        let removed = Resource::new(ResourceKind::Tool, "python2").with_path("/usr/bin/python2");
        let mut modified_before =
            Resource::new(ResourceKind::Runtime, "node").with_path("/usr/local");
        modified_before = modified_before.with_attribute("version", "20.0.0");
        let mut modified_after =
            Resource::new(ResourceKind::Runtime, "node").with_path("/usr/local");
        modified_after = modified_after.with_attribute("version", "22.0.0");
        let added = Resource::new(ResourceKind::Tool, "bun").with_path("/usr/local/bin/bun");

        let previous = vec![kept.clone(), removed, modified_before];
        let current = vec![kept, modified_after, added];

        let events = diff_resources(&previous, &current);
        assert_eq!(events.len(), 3);
        assert!(events
            .iter()
            .any(|e| e.kind == ChangeKind::Discovered && e.resource_name == "bun"));
        assert!(events
            .iter()
            .any(|e| e.kind == ChangeKind::Removed && e.resource_name == "python2"));
        assert!(events
            .iter()
            .any(|e| e.kind == ChangeKind::Modified && e.resource_name == "node"));
    }
}
