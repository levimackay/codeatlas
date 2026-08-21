//! Local SQLite persistence for the CodeAtlas machine model.
//!
//! One `Database` wraps one SQLite connection behind a mutex. Tauri
//! commands and the CLI both go through this crate; nothing outside it
//! constructs SQL. Every scan replaces the `resources` and
//! `relationships` rows for that scan (the machine model is always "as
//! of the last scan"), while `scans`, `changes`, and
//! `cleanup_candidates` accumulate as history.

mod convert;
mod repository;

use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};
use std::path::Path;
use std::sync::Mutex;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("migration error: {0}")]
    Migration(#[from] rusqlite_migration::Error),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("data integrity error: {0}")]
    Integrity(String),
}

pub type DbResult<T> = Result<T, DbError>;

fn migrations() -> Migrations<'static> {
    Migrations::new(vec![
        M::up(include_str!("../migrations/0001_init.sql")),
        M::up(include_str!("../migrations/0002_settings.sql")),
    ])
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Opens (creating if necessary) the database at `path` and applies
    /// any pending migrations. This is the entry point used by both the
    /// desktop app and the CLI so their data directories share a schema.
    pub fn open(path: impl AsRef<Path>) -> DbResult<Self> {
        let mut conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations().to_latest(&mut conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    /// In-memory database for tests and short-lived CLI invocations that
    /// do not need persistence across runs.
    pub fn open_in_memory() -> DbResult<Self> {
        let mut conn = Connection::open_in_memory()?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        migrations().to_latest(&mut conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    /// The default on-disk location for the database, inside the OS
    /// standard application data directory. Tauri's path resolver is the
    /// canonical source of this at runtime; this is used by the CLI and
    /// by tests that want the real default path without depending on
    /// `tauri`.
    pub fn default_path(app_data_dir: &Path) -> std::path::PathBuf {
        app_data_dir.join("codeatlas.sqlite3")
    }
}
