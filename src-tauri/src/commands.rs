use crate::state::AppState;
use codeatlas_core::{ChangeEvent, CleanupCandidate, Graph, Resource, ScanRecord};
use codeatlas_discovery::{providers, DiscoveryEngine, ScanContext};
use codeatlas_platform::{PlatformCapabilities, SystemInfo};
use serde::Serialize;
use tauri::State;

/// Every command returns `Result<T, String>` rather than a typed error:
/// the frontend only ever needs to show the message, and this keeps
/// internal error variants (which may include filesystem paths) from
/// becoming part of the IPC contract by accident.
type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    codeatlas_platform::system_info_provider().system_info()
}

#[tauri::command]
pub fn get_platform_capabilities() -> PlatformCapabilities {
    PlatformCapabilities::current()
}

#[derive(Serialize)]
pub struct ScanSummary {
    pub record: ScanRecord,
    pub changes: Vec<ChangeEvent>,
}

#[tauri::command]
pub async fn run_scan(
    state: State<'_, AppState>,
    roots: Option<Vec<String>>,
) -> CmdResult<ScanSummary> {
    let db = state.db.clone();
    let home = home_dir();

    let search_roots = match roots {
        Some(roots) if !roots.is_empty() => {
            roots.into_iter().map(std::path::PathBuf::from).collect()
        }
        _ => {
            let stored: Option<Vec<String>> = db.get_setting("search_roots").map_err(stringify)?;
            match stored {
                Some(roots) if !roots.is_empty() => {
                    roots.into_iter().map(std::path::PathBuf::from).collect()
                }
                _ => providers::default_search_roots(&home),
            }
        }
    };

    let ctx = ScanContext::new(home, search_roots);
    let previous = db.latest_graph().map_err(stringify)?;
    let engine = DiscoveryEngine::with_builtin_providers();
    let outcome = engine.run_scan(&ctx, &previous).await;

    db.persist_scan(&outcome.record, &outcome.graph)
        .map_err(stringify)?;
    db.record_changes(&outcome.changes).map_err(stringify)?;

    let candidates = codeatlas_discovery::cleanup::analyze(&outcome.graph);
    db.save_cleanup_candidates(outcome.record.id, &candidates)
        .map_err(stringify)?;

    Ok(ScanSummary {
        record: outcome.record,
        changes: outcome.changes,
    })
}

#[tauri::command]
pub fn get_graph(state: State<'_, AppState>) -> CmdResult<Graph> {
    state.db.latest_graph().map_err(stringify)
}

#[tauri::command]
pub fn search_resources(
    state: State<'_, AppState>,
    query: String,
    limit: Option<usize>,
) -> CmdResult<Vec<Resource>> {
    state
        .db
        .search(&query, limit.unwrap_or(50))
        .map_err(stringify)
}

#[tauri::command]
pub fn list_changes(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> CmdResult<Vec<ChangeEvent>> {
    state
        .db
        .list_changes(limit.unwrap_or(100))
        .map_err(stringify)
}

#[tauri::command]
pub fn list_scans(state: State<'_, AppState>, limit: Option<usize>) -> CmdResult<Vec<ScanRecord>> {
    state.db.list_scans(limit.unwrap_or(20)).map_err(stringify)
}

#[tauri::command]
pub fn list_cleanup_candidates(state: State<'_, AppState>) -> CmdResult<Vec<CleanupCandidate>> {
    state.db.list_cleanup_candidates().map_err(stringify)
}

#[tauri::command]
pub fn get_search_roots(state: State<'_, AppState>) -> CmdResult<Vec<String>> {
    let stored: Option<Vec<String>> = state.db.get_setting("search_roots").map_err(stringify)?;
    Ok(stored.unwrap_or_else(|| {
        providers::default_search_roots(&home_dir())
            .into_iter()
            .map(|p| p.display().to_string())
            .collect()
    }))
}

#[tauri::command]
pub fn set_search_roots(state: State<'_, AppState>, roots: Vec<String>) -> CmdResult<()> {
    state
        .db
        .set_setting("search_roots", &roots)
        .map_err(stringify)
}

#[tauri::command]
pub fn get_onboarding_complete(state: State<'_, AppState>) -> CmdResult<bool> {
    Ok(state
        .db
        .get_setting::<bool>("onboarding_complete")
        .map_err(stringify)?
        .unwrap_or(false))
}

#[tauri::command]
pub fn set_onboarding_complete(state: State<'_, AppState>) -> CmdResult<()> {
    state
        .db
        .set_setting("onboarding_complete", &true)
        .map_err(stringify)
}

fn home_dir() -> std::path::PathBuf {
    directories::UserDirs::new()
        .map(|dirs| dirs.home_dir().to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("."))
}

fn stringify(err: impl std::fmt::Display) -> String {
    err.to_string()
}
