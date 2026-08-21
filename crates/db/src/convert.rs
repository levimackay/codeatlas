use chrono::{DateTime, Utc};
use codeatlas_core::{
    ChangeKind, CleanupCategory, Evidence, RelationshipKind, ResourceId, ResourceKind, ScanStatus,
};
use std::str::FromStr;

pub(crate) fn kind_to_str(kind: ResourceKind) -> &'static str {
    match kind {
        ResourceKind::Project => "project",
        ResourceKind::GitRepository => "git_repository",
        ResourceKind::Process => "process",
        ResourceKind::Port => "port",
        ResourceKind::DockerContainer => "docker_container",
        ResourceKind::DockerImage => "docker_image",
        ResourceKind::DockerVolume => "docker_volume",
        ResourceKind::DockerNetwork => "docker_network",
        ResourceKind::Database => "database",
        ResourceKind::Runtime => "runtime",
        ResourceKind::PackageManager => "package_manager",
        ResourceKind::Package => "package",
        ResourceKind::Tool => "tool",
        ResourceKind::EnvironmentVariable => "environment_variable",
        ResourceKind::SshConfigEntry => "ssh_config_entry",
        ResourceKind::BuildArtifact => "build_artifact",
        ResourceKind::Cache => "cache",
        ResourceKind::Service => "service",
        ResourceKind::ConfigFile => "config_file",
        ResourceKind::DiskUsageEntry => "disk_usage_entry",
        ResourceKind::NetworkListener => "network_listener",
    }
}

pub(crate) fn kind_from_str(s: &str) -> Result<ResourceKind, String> {
    Ok(match s {
        "project" => ResourceKind::Project,
        "git_repository" => ResourceKind::GitRepository,
        "process" => ResourceKind::Process,
        "port" => ResourceKind::Port,
        "docker_container" => ResourceKind::DockerContainer,
        "docker_image" => ResourceKind::DockerImage,
        "docker_volume" => ResourceKind::DockerVolume,
        "docker_network" => ResourceKind::DockerNetwork,
        "database" => ResourceKind::Database,
        "runtime" => ResourceKind::Runtime,
        "package_manager" => ResourceKind::PackageManager,
        "package" => ResourceKind::Package,
        "tool" => ResourceKind::Tool,
        "environment_variable" => ResourceKind::EnvironmentVariable,
        "ssh_config_entry" => ResourceKind::SshConfigEntry,
        "build_artifact" => ResourceKind::BuildArtifact,
        "cache" => ResourceKind::Cache,
        "service" => ResourceKind::Service,
        "config_file" => ResourceKind::ConfigFile,
        "disk_usage_entry" => ResourceKind::DiskUsageEntry,
        "network_listener" => ResourceKind::NetworkListener,
        other => return Err(format!("unknown resource kind: {other}")),
    })
}

pub(crate) fn parse_timestamp(s: &str) -> rusqlite::Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| {
            rusqlite::Error::InvalidColumnType(0, e.to_string(), rusqlite::types::Type::Text)
        })
}

pub(crate) fn parse_uuid(s: &str) -> rusqlite::Result<ResourceId> {
    uuid::Uuid::from_str(s).map_err(|e| {
        rusqlite::Error::InvalidColumnType(0, e.to_string(), rusqlite::types::Type::Text)
    })
}

pub(crate) fn evidence_to_json(evidence: &[Evidence]) -> String {
    serde_json::to_string(evidence).unwrap_or_else(|_| "[]".to_string())
}

pub(crate) fn evidence_from_json(s: &str) -> Vec<Evidence> {
    serde_json::from_str(s).unwrap_or_default()
}

pub(crate) fn relationship_kind_to_str(kind: RelationshipKind) -> &'static str {
    match kind {
        RelationshipKind::Contains => "contains",
        RelationshipKind::RunsAs => "runs_as",
        RelationshipKind::ListensOn => "listens_on",
        RelationshipKind::DependsOn => "depends_on",
        RelationshipKind::Produces => "produces",
        RelationshipKind::InstantiatedFrom => "instantiated_from",
        RelationshipKind::Mounts => "mounts",
        RelationshipKind::AttachedTo => "attached_to",
        RelationshipKind::ConnectsTo => "connects_to",
        RelationshipKind::Uses => "uses",
    }
}

pub(crate) fn relationship_kind_from_str(s: &str) -> Result<RelationshipKind, String> {
    Ok(match s {
        "contains" => RelationshipKind::Contains,
        "runs_as" => RelationshipKind::RunsAs,
        "listens_on" => RelationshipKind::ListensOn,
        "depends_on" => RelationshipKind::DependsOn,
        "produces" => RelationshipKind::Produces,
        "instantiated_from" => RelationshipKind::InstantiatedFrom,
        "mounts" => RelationshipKind::Mounts,
        "attached_to" => RelationshipKind::AttachedTo,
        "connects_to" => RelationshipKind::ConnectsTo,
        "uses" => RelationshipKind::Uses,
        other => return Err(format!("unknown relationship kind: {other}")),
    })
}

pub(crate) fn change_kind_to_str(kind: ChangeKind) -> &'static str {
    match kind {
        ChangeKind::Discovered => "discovered",
        ChangeKind::Removed => "removed",
        ChangeKind::Modified => "modified",
    }
}

pub(crate) fn change_kind_from_str(s: &str) -> Result<ChangeKind, String> {
    Ok(match s {
        "discovered" => ChangeKind::Discovered,
        "removed" => ChangeKind::Removed,
        "modified" => ChangeKind::Modified,
        other => return Err(format!("unknown change kind: {other}")),
    })
}

pub(crate) fn scan_status_to_str(status: ScanStatus) -> &'static str {
    match status {
        ScanStatus::Running => "running",
        ScanStatus::Completed => "completed",
        ScanStatus::Failed => "failed",
    }
}

pub(crate) fn scan_status_from_str(s: &str) -> Result<ScanStatus, String> {
    Ok(match s {
        "running" => ScanStatus::Running,
        "completed" => ScanStatus::Completed,
        "failed" => ScanStatus::Failed,
        other => return Err(format!("unknown scan status: {other}")),
    })
}

pub(crate) fn cleanup_category_to_str(category: CleanupCategory) -> &'static str {
    match category {
        CleanupCategory::UnusedDockerImage => "unused_docker_image",
        CleanupCategory::UnusedDockerVolume => "unused_docker_volume",
        CleanupCategory::StaleBuildArtifact => "stale_build_artifact",
        CleanupCategory::Cache => "cache",
        CleanupCategory::UnusedPackageManagerArtifact => "unused_package_manager_artifact",
        CleanupCategory::StaleEnvironment => "stale_environment",
        CleanupCategory::LargeDependencyTree => "large_dependency_tree",
        CleanupCategory::OldGeneratedFile => "old_generated_file",
    }
}

pub(crate) fn cleanup_category_from_str(s: &str) -> Result<CleanupCategory, String> {
    Ok(match s {
        "unused_docker_image" => CleanupCategory::UnusedDockerImage,
        "unused_docker_volume" => CleanupCategory::UnusedDockerVolume,
        "stale_build_artifact" => CleanupCategory::StaleBuildArtifact,
        "cache" => CleanupCategory::Cache,
        "unused_package_manager_artifact" => CleanupCategory::UnusedPackageManagerArtifact,
        "stale_environment" => CleanupCategory::StaleEnvironment,
        "large_dependency_tree" => CleanupCategory::LargeDependencyTree,
        "old_generated_file" => CleanupCategory::OldGeneratedFile,
        other => return Err(format!("unknown cleanup category: {other}")),
    })
}
