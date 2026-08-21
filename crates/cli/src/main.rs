use clap::{Parser, Subcommand};
use codeatlas_db::Database;
use codeatlas_discovery::{DiscoveryEngine, ScanContext};
use std::path::PathBuf;

#[derive(Parser)]
#[command(
    name = "codeatlas",
    version,
    about = "Understand your development environment"
)]
struct Cli {
    /// Override the database location. Defaults to the OS application
    /// data directory, the same one the desktop app uses.
    #[arg(long, global = true)]
    db_path: Option<PathBuf>,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run a scan and persist the resulting machine model.
    Scan {
        /// Directories to search for projects. Defaults to common code
        /// folders under the home directory.
        #[arg(long)]
        root: Vec<PathBuf>,
    },
    /// List discovered resources, optionally filtered by kind.
    Ls { kind: Option<String> },
    /// Search the current machine model.
    Search { query: String },
    /// Show recent changes.
    Changes {
        #[arg(long, default_value_t = 20)]
        limit: usize,
    },
    /// Show scan history.
    Scans,
}

/// Restores the default SIGPIPE disposition so piping output into `head`
/// or `grep -q` ends the process quietly, the way `ls`, `git log`, and
/// every other well-behaved Unix CLI tool behaves, instead of Rust's
/// default of turning EPIPE into a panic on the next `println!`.
#[cfg(unix)]
fn restore_default_sigpipe() {
    unsafe {
        libc::signal(libc::SIGPIPE, libc::SIG_DFL);
    }
}

#[cfg(not(unix))]
fn restore_default_sigpipe() {}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    restore_default_sigpipe();
    let cli = Cli::parse();
    let db_path = cli.db_path.unwrap_or_else(default_db_path);
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let db = Database::open(&db_path)?;

    match cli.command {
        Command::Scan { root } => run_scan(&db, root).await?,
        Command::Ls { kind } => list_resources(&db, kind)?,
        Command::Search { query } => search(&db, &query)?,
        Command::Changes { limit } => print_changes(&db, limit)?,
        Command::Scans => print_scans(&db)?,
    }

    Ok(())
}

fn default_db_path() -> PathBuf {
    directories::ProjectDirs::from("com", "levimackay", "CodeAtlas")
        .map(|dirs| Database::default_path(dirs.data_dir()))
        .unwrap_or_else(|| PathBuf::from("codeatlas.sqlite3"))
}

async fn run_scan(db: &Database, roots: Vec<PathBuf>) -> anyhow::Result<()> {
    let home = home_dir();
    let search_roots = if roots.is_empty() {
        codeatlas_discovery::providers::default_search_roots(&home)
    } else {
        roots
    };

    println!("Scanning {} root(s):", search_roots.len());
    for root in &search_roots {
        println!("  {}", root.display());
    }

    let ctx = ScanContext::new(home, search_roots);
    let previous = db.latest_graph()?;
    let engine = DiscoveryEngine::with_builtin_providers();
    let outcome = engine.run_scan(&ctx, &previous).await;

    for provider in &outcome.record.providers_run {
        if let Some(reason) = &provider.unavailable_reason {
            println!("  [{}] unavailable: {reason}", provider.provider_id);
        } else if let Some(err) = &provider.error {
            println!("  [{}] error: {err}", provider.provider_id);
        } else {
            println!(
                "  [{}] {} resources in {}ms",
                provider.provider_id, provider.resources_found, provider.duration_ms
            );
        }
    }

    db.persist_scan(&outcome.record, &outcome.graph)?;
    db.record_changes(&outcome.changes)?;

    println!(
        "\nDone. {} resources, {} changes since last scan.",
        outcome.record.resources_found,
        outcome.changes.len()
    );
    Ok(())
}

fn list_resources(db: &Database, kind: Option<String>) -> anyhow::Result<()> {
    let graph = db.latest_graph()?;
    for resource in graph.resources() {
        if let Some(kind) = &kind {
            if !resource
                .kind
                .label()
                .to_lowercase()
                .replace(' ', "_")
                .contains(&kind.to_lowercase())
            {
                continue;
            }
        }
        println!(
            "{:<20} {:<30} {}",
            resource.kind.label(),
            resource.name,
            resource.path.as_deref().unwrap_or("")
        );
    }
    Ok(())
}

fn search(db: &Database, query: &str) -> anyhow::Result<()> {
    let results = db.search(query, 50)?;
    if results.is_empty() {
        println!("No matches for \"{query}\". Have you run `codeatlas scan` yet?");
        return Ok(());
    }
    for resource in results {
        println!(
            "{:<20} {:<30} {}",
            resource.kind.label(),
            resource.name,
            resource.path.unwrap_or_default()
        );
    }
    Ok(())
}

fn print_changes(db: &Database, limit: usize) -> anyhow::Result<()> {
    let changes = db.list_changes(limit)?;
    for change in changes {
        println!(
            "{}  {:?}  {}",
            change.occurred_at.to_rfc3339(),
            change.kind,
            change.summary
        );
    }
    Ok(())
}

fn print_scans(db: &Database) -> anyhow::Result<()> {
    let scans = db.list_scans(20)?;
    for scan in scans {
        println!(
            "{}  {:?}  {} resources",
            scan.started_at.to_rfc3339(),
            scan.status,
            scan.resources_found
        );
    }
    Ok(())
}

fn home_dir() -> PathBuf {
    directories::UserDirs::new()
        .map(|dirs| dirs.home_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."))
}
