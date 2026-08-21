mod commands;
mod state;

use state::AppState;
use std::sync::Arc;
use tauri::Manager;

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = codeatlas_db::Database::default_path(&app_data_dir);
            let db = codeatlas_db::Database::open(db_path)?;
            app.manage(AppState { db: Arc::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::get_platform_capabilities,
            commands::run_scan,
            commands::get_graph,
            commands::search_resources,
            commands::list_changes,
            commands::list_scans,
            commands::list_cleanup_candidates,
            commands::get_search_roots,
            commands::set_search_roots,
            commands::get_onboarding_complete,
            commands::set_onboarding_complete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CodeAtlas");
}
