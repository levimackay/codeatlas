use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

pub type ResourceId = Uuid;

/// Every kind of thing CodeAtlas can discover on a machine.
///
/// This list is deliberately flat rather than a type hierarchy: the
/// discovery engine, the database schema, and the frontend all switch on
/// it, and a flat enum keeps all three in sync without a class hierarchy
/// nobody actually needs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceKind {
    Project,
    GitRepository,
    Process,
    Port,
    DockerContainer,
    DockerImage,
    DockerVolume,
    DockerNetwork,
    Database,
    Runtime,
    PackageManager,
    Package,
    Tool,
    EnvironmentVariable,
    SshConfigEntry,
    BuildArtifact,
    Cache,
    Service,
    ConfigFile,
    DiskUsageEntry,
    NetworkListener,
}

impl ResourceKind {
    /// Kinds whose value should never be shown or persisted by default,
    /// even though the resource itself (its existence and name) is safe
    /// to display.
    pub fn is_sensitive_by_default(self) -> bool {
        matches!(
            self,
            ResourceKind::EnvironmentVariable | ResourceKind::SshConfigEntry
        )
    }

    pub fn label(self) -> &'static str {
        match self {
            ResourceKind::Project => "Project",
            ResourceKind::GitRepository => "Git repository",
            ResourceKind::Process => "Process",
            ResourceKind::Port => "Port",
            ResourceKind::DockerContainer => "Docker container",
            ResourceKind::DockerImage => "Docker image",
            ResourceKind::DockerVolume => "Docker volume",
            ResourceKind::DockerNetwork => "Docker network",
            ResourceKind::Database => "Database",
            ResourceKind::Runtime => "Runtime",
            ResourceKind::PackageManager => "Package manager",
            ResourceKind::Package => "Package",
            ResourceKind::Tool => "Tool",
            ResourceKind::EnvironmentVariable => "Environment variable",
            ResourceKind::SshConfigEntry => "SSH configuration entry",
            ResourceKind::BuildArtifact => "Build artifact",
            ResourceKind::Cache => "Cache",
            ResourceKind::Service => "Service",
            ResourceKind::ConfigFile => "Configuration file",
            ResourceKind::DiskUsageEntry => "Disk usage entry",
            ResourceKind::NetworkListener => "Network listener",
        }
    }
}

/// A single piece of evidence backing a discovered resource or a
/// relationship between two resources. Evidence is what lets the UI
/// answer "why do you think this?" instead of asserting facts on faith.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    /// Short machine identifier of the discovery provider that produced
    /// this evidence, e.g. "git", "process", "docker".
    pub source: String,
    /// Human-readable explanation, e.g. "package.json declares this
    /// dependency" or "process cwd matches project root".
    pub description: String,
    /// Optional path this evidence was derived from. Never a path to a
    /// file whose contents are sensitive (see `ResourceKind::is_sensitive_by_default`).
    pub path: Option<String>,
}

/// A normalized, discovered thing on the machine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub id: ResourceId,
    pub kind: ResourceKind,
    pub name: String,
    /// Filesystem path this resource is rooted at, if any.
    pub path: Option<String>,
    /// Kind-specific structured attributes. Never contains secret values;
    /// for sensitive kinds this holds only metadata (a variable's name,
    /// not its value; an SSH host alias, not the private key).
    pub attributes: BTreeMap<String, serde_json::Value>,
    pub evidence: Vec<Evidence>,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

/// Fixed namespace for deriving deterministic resource ids. Any provider
/// can independently compute the id another provider will assign to the
/// "same" real-world thing (the same project path, the same container
/// name) by hashing the same `(kind, discriminator)` pair through this
/// namespace, without the two providers coordinating at scan time. This
/// is what makes cross-provider relationships (a git provider linking to
/// a project a filesystem provider found) possible when providers run
/// independently and concurrently.
const RESOURCE_ID_NAMESPACE: Uuid = Uuid::from_bytes([
    0x6b, 0x2e, 0x3f, 0x0a, 0x9c, 0x7d, 0x4a, 0x1e, 0xb3, 0x52, 0x0d, 0x8f, 0x1a, 0x6c, 0x9e, 0x44,
]);

/// Derives the id a resource of this kind, at this path or name, will
/// always have. Two calls with the same inputs always produce the same
/// id, from any process, on any run.
pub fn deterministic_id(kind: ResourceKind, discriminator: &str) -> ResourceId {
    Uuid::new_v5(
        &RESOURCE_ID_NAMESPACE,
        format!("{kind:?}:{discriminator}").as_bytes(),
    )
}

impl Resource {
    /// A resource identified only by a display name, with no stable
    /// real-world discriminator (a transient process, for instance).
    /// Gets a random id: nothing else needs to reference it by a
    /// predictable id across scans.
    pub fn new(kind: ResourceKind, name: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            kind,
            name: name.into(),
            path: None,
            attributes: BTreeMap::new(),
            evidence: Vec::new(),
            first_seen: now,
            last_seen: now,
        }
    }

    /// A resource identified by a stable real-world discriminator
    /// (typically a filesystem path, sometimes a name like a Docker
    /// image tag). Its id is deterministic, so any other provider that
    /// knows the same discriminator can compute the same id and form a
    /// relationship to it without having scanned it directly.
    pub fn identified(kind: ResourceKind, name: impl Into<String>, discriminator: &str) -> Self {
        let now = Utc::now();
        Self {
            id: deterministic_id(kind, discriminator),
            kind,
            name: name.into(),
            path: None,
            attributes: BTreeMap::new(),
            evidence: Vec::new(),
            first_seen: now,
            last_seen: now,
        }
    }

    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }

    pub fn with_attribute(mut self, key: impl Into<String>, value: impl Serialize) -> Self {
        if let Ok(v) = serde_json::to_value(value) {
            self.attributes.insert(key.into(), v);
        }
        self
    }

    pub fn with_evidence(mut self, evidence: Evidence) -> Self {
        self.evidence.push(evidence);
        self
    }
}
