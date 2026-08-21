mod filesystem_project;
mod git;
mod process_ports;

pub use filesystem_project::{default_search_roots, FilesystemProjectProvider};
pub use git::GitProvider;
pub use process_ports::ProcessPortProvider;

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
    ]
}
