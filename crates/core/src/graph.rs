use crate::resource::{Evidence, Resource, ResourceId};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RelationshipKind {
    /// A project directory contains a git repository.
    Contains,
    /// A process is running as / for a project.
    RunsAs,
    /// A process listens on a port.
    ListensOn,
    /// A project or process declares a dependency on a package.
    DependsOn,
    /// A runtime or package manager produced a build artifact or cache.
    Produces,
    /// A docker container was created from a docker image.
    InstantiatedFrom,
    /// A docker container mounts a docker volume.
    Mounts,
    /// A docker container is attached to a docker network.
    AttachedTo,
    /// A process or container connects to a database.
    ConnectsTo,
    /// A project uses a runtime, tool, or package manager.
    Uses,
}

impl RelationshipKind {
    pub fn label(self) -> &'static str {
        match self {
            RelationshipKind::Contains => "contains",
            RelationshipKind::RunsAs => "runs as",
            RelationshipKind::ListensOn => "listens on",
            RelationshipKind::DependsOn => "depends on",
            RelationshipKind::Produces => "produces",
            RelationshipKind::InstantiatedFrom => "instantiated from",
            RelationshipKind::Mounts => "mounts",
            RelationshipKind::AttachedTo => "attached to",
            RelationshipKind::ConnectsTo => "connects to",
            RelationshipKind::Uses => "uses",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    pub from: ResourceId,
    pub to: ResourceId,
    pub kind: RelationshipKind,
    pub evidence: Vec<Evidence>,
}

impl Relationship {
    pub fn new(from: ResourceId, to: ResourceId, kind: RelationshipKind) -> Self {
        Self { from, to, kind, evidence: Vec::new() }
    }

    pub fn with_evidence(mut self, evidence: Evidence) -> Self {
        self.evidence.push(evidence);
        self
    }
}

/// The machine model: every discovered resource and every relationship
/// between them, built entirely from evidence the discovery engine
/// actually produced. Nothing in here is inferred without a
/// corresponding `Evidence` entry on the relationship.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Graph {
    resources: HashMap<ResourceId, Resource>,
    relationships: Vec<Relationship>,
    #[serde(skip)]
    outgoing: HashMap<ResourceId, Vec<usize>>,
    #[serde(skip)]
    incoming: HashMap<ResourceId, Vec<usize>>,
}

impl Graph {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn upsert_resource(&mut self, resource: Resource) {
        self.resources.insert(resource.id, resource);
    }

    pub fn add_relationship(&mut self, relationship: Relationship) {
        let idx = self.relationships.len();
        self.outgoing.entry(relationship.from).or_default().push(idx);
        self.incoming.entry(relationship.to).or_default().push(idx);
        self.relationships.push(relationship);
    }

    pub fn resource(&self, id: ResourceId) -> Option<&Resource> {
        self.resources.get(&id)
    }

    pub fn resources(&self) -> impl Iterator<Item = &Resource> {
        self.resources.values()
    }

    pub fn relationships(&self) -> &[Relationship] {
        &self.relationships
    }

    pub fn len(&self) -> usize {
        self.resources.len()
    }

    pub fn is_empty(&self) -> bool {
        self.resources.is_empty()
    }

    /// Direct outgoing relationships from a resource.
    pub fn outgoing(&self, id: ResourceId) -> impl Iterator<Item = &Relationship> {
        self.outgoing
            .get(&id)
            .into_iter()
            .flatten()
            .map(move |&idx| &self.relationships[idx])
    }

    /// Direct incoming relationships to a resource.
    pub fn incoming(&self, id: ResourceId) -> impl Iterator<Item = &Relationship> {
        self.incoming
            .get(&id)
            .into_iter()
            .flatten()
            .map(move |&idx| &self.relationships[idx])
    }

    /// Everything reachable from `id` within `max_depth` hops, following
    /// relationships in either direction, for interactive graph
    /// expansion in the UI.
    pub fn neighborhood(&self, id: ResourceId, max_depth: usize) -> HashSet<ResourceId> {
        let mut visited = HashSet::new();
        let mut frontier = VecDeque::new();
        frontier.push_back((id, 0usize));
        visited.insert(id);

        while let Some((current, depth)) = frontier.pop_front() {
            if depth >= max_depth {
                continue;
            }
            for rel in self.outgoing(current).chain(self.incoming(current)) {
                let next = if rel.from == current { rel.to } else { rel.from };
                if visited.insert(next) {
                    frontier.push_back((next, depth + 1));
                }
            }
        }

        visited
    }

    /// What would be affected if `id` were removed: everything that
    /// depends on it, transitively, via any relationship that implies
    /// dependency (DependsOn, RunsAs, ListensOn, ConnectsTo, Mounts,
    /// AttachedTo, InstantiatedFrom). Used by the cleanup center to
    /// answer "what will happen if removed".
    pub fn dependents_of(&self, id: ResourceId) -> HashSet<ResourceId> {
        let dependency_kinds = [
            RelationshipKind::DependsOn,
            RelationshipKind::RunsAs,
            RelationshipKind::ListensOn,
            RelationshipKind::ConnectsTo,
            RelationshipKind::Mounts,
            RelationshipKind::AttachedTo,
            RelationshipKind::InstantiatedFrom,
        ];

        let mut visited = HashSet::new();
        let mut frontier = VecDeque::new();
        frontier.push_back(id);

        while let Some(current) = frontier.pop_front() {
            for rel in self.incoming(current) {
                if dependency_kinds.contains(&rel.kind) && visited.insert(rel.from) {
                    frontier.push_back(rel.from);
                }
            }
        }

        visited
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::resource::ResourceKind;

    fn resource(kind: ResourceKind, name: &str) -> Resource {
        Resource::new(kind, name)
    }

    #[test]
    fn neighborhood_respects_depth() {
        let mut graph = Graph::new();
        let a = resource(ResourceKind::Project, "a");
        let b = resource(ResourceKind::Process, "b");
        let c = resource(ResourceKind::Port, "c");
        let (a_id, b_id, c_id) = (a.id, b.id, c.id);
        graph.upsert_resource(a);
        graph.upsert_resource(b);
        graph.upsert_resource(c);
        graph.add_relationship(Relationship::new(a_id, b_id, RelationshipKind::RunsAs));
        graph.add_relationship(Relationship::new(b_id, c_id, RelationshipKind::ListensOn));

        let one_hop = graph.neighborhood(a_id, 1);
        assert!(one_hop.contains(&a_id));
        assert!(one_hop.contains(&b_id));
        assert!(!one_hop.contains(&c_id));

        let two_hop = graph.neighborhood(a_id, 2);
        assert!(two_hop.contains(&c_id));
    }

    #[test]
    fn dependents_of_follows_dependency_edges_only() {
        let mut graph = Graph::new();
        let image = resource(ResourceKind::DockerImage, "image");
        let container = resource(ResourceKind::DockerContainer, "container");
        let unrelated = resource(ResourceKind::Tool, "unrelated");
        let (image_id, container_id, unrelated_id) = (image.id, container.id, unrelated.id);
        graph.upsert_resource(image);
        graph.upsert_resource(container);
        graph.upsert_resource(unrelated);
        graph.add_relationship(Relationship::new(
            container_id,
            image_id,
            RelationshipKind::InstantiatedFrom,
        ));

        let dependents = graph.dependents_of(image_id);
        assert!(dependents.contains(&container_id));
        assert!(!dependents.contains(&unrelated_id));
    }
}
