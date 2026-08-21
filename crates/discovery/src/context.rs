use std::path::PathBuf;
use std::sync::Arc;

/// Everything a provider needs to know about *this* scan: where to look
/// and what the platform layer can do. Providers never read global state
/// or environment configuration directly; everything comes through here
/// so a scan is reproducible and testable with a constructed context.
#[derive(Clone)]
pub struct ScanContext {
    /// Directories to search for projects, in priority order. Populated
    /// from onboarding (the user picks or confirms these) with a
    /// sensible default of the home directory's common code folders.
    pub search_roots: Vec<PathBuf>,
    pub home_dir: PathBuf,
    /// How many directory levels deep the filesystem provider will
    /// descend from each search root before giving up on a subtree, to
    /// bound scan time on machines with enormous unrelated trees.
    pub max_fs_depth: usize,
    /// Directory names skipped entirely during filesystem walks:
    /// `node_modules`, `.git` internals, build output, etc. Prevents the
    /// classic "walked into node_modules and took ten minutes" failure.
    pub ignored_directory_names: Vec<String>,
    pub process_provider: Arc<dyn codeatlas_platform::ProcessProvider>,
}

impl ScanContext {
    pub fn new(home_dir: PathBuf, search_roots: Vec<PathBuf>) -> Self {
        Self {
            search_roots,
            home_dir,
            max_fs_depth: 6,
            ignored_directory_names: default_ignored_directories(),
            process_provider: codeatlas_platform::process_provider().into(),
        }
    }
}

fn default_ignored_directories() -> Vec<String> {
    [
        "node_modules",
        "target",
        ".git",
        "dist",
        "build",
        ".next",
        ".venv",
        "venv",
        "__pycache__",
        ".cargo",
        ".rustup",
        "vendor",
        ".pnpm-store",
        "Library",
        "Applications",
        ".Trash",
    ]
    .into_iter()
    .map(String::from)
    .collect()
}
