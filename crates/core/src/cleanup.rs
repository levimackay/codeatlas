use crate::resource::{Evidence, ResourceId, ResourceKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CleanupCategory {
    UnusedDockerImage,
    UnusedDockerVolume,
    StaleBuildArtifact,
    Cache,
    UnusedPackageManagerArtifact,
    StaleEnvironment,
    LargeDependencyTree,
    OldGeneratedFile,
}

impl CleanupCategory {
    pub fn label(self) -> &'static str {
        match self {
            CleanupCategory::UnusedDockerImage => "Unused Docker image",
            CleanupCategory::UnusedDockerVolume => "Unused Docker volume",
            CleanupCategory::StaleBuildArtifact => "Old build artifact",
            CleanupCategory::Cache => "Cache",
            CleanupCategory::UnusedPackageManagerArtifact => "Unused package manager artifact",
            CleanupCategory::StaleEnvironment => "Stale development environment",
            CleanupCategory::LargeDependencyTree => "Large project dependency tree",
            CleanupCategory::OldGeneratedFile => "Old generated file",
        }
    }
}

/// A cleanup recommendation. CodeAtlas never deletes anything itself;
/// this is the full disclosure a user needs to decide for themselves,
/// and every field here must be backed by real evidence from a scan,
/// never estimated or assumed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupCandidate {
    pub resource_id: ResourceId,
    pub resource_kind: ResourceKind,
    pub name: String,
    pub path: Option<String>,
    pub category: CleanupCategory,
    /// Why this was flagged, in plain language.
    pub reasoning: String,
    pub evidence: Vec<Evidence>,
    /// Last-modified or last-accessed time if the filesystem or Docker
    /// reported one. `None` means "unknown", never "never used".
    pub last_used: Option<chrono::DateTime<chrono::Utc>>,
    /// What else in the graph depends on this resource. Non-empty means
    /// the recommendation should be shown with a warning, not hidden.
    pub depended_on_by: Vec<ResourceId>,
    pub size_bytes: Option<u64>,
    pub reversible: bool,
    /// What actually happens if the user confirms removal, in plain
    /// language, e.g. "deletes the image and any containers created from
    /// it that are already stopped".
    pub consequence: String,
}

impl CleanupCandidate {
    /// A candidate is safe to surface as a one-click suggestion only when
    /// nothing else in the graph depends on it. Anything with dependents
    /// is still shown, but the caller must present the dependency
    /// warning rather than a plain "clean up" affordance.
    pub fn is_uncontested(&self) -> bool {
        self.depended_on_by.is_empty()
    }
}
