mod disk_usage;
mod docker;
mod environment;
mod filesystem_project;
mod git;
mod package_managers;
mod process_ports;
mod runtimes;
mod services;
mod ssh_config;

pub use disk_usage::DiskUsageProvider;
pub use docker::DockerProvider;
pub use environment::EnvironmentVariableProvider;
pub use filesystem_project::{default_search_roots, FilesystemProjectProvider};
pub use git::GitProvider;
pub use package_managers::PackageManagerProvider;
pub use process_ports::ProcessPortProvider;
pub use runtimes::RuntimeProvider;
pub use services::ServiceProvider;
pub use ssh_config::SshConfigProvider;

use crate::provider::DiscoveryProvider;
use std::sync::Arc;

/// The full set of providers shipped in this build. New providers are
/// added here and nowhere else; the engine, CLI, and Tauri commands all
/// go through this list rather than constructing providers themselves.
pub fn builtin_providers() -> Vec<Arc<dyn DiscoveryProvider>> {
    vec![
        Arc::new(FilesystemProjectProvider),
        Arc::new(GitProvider),
        Arc::new(ProcessPortProvider),
        Arc::new(DiskUsageProvider),
        Arc::new(ServiceProvider),
        Arc::new(EnvironmentVariableProvider),
        Arc::new(SshConfigProvider),
        Arc::new(DockerProvider),
        Arc::new(RuntimeProvider),
        Arc::new(PackageManagerProvider),
    ]
}
