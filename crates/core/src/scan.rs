use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScanStatus {
    Running,
    Completed,
    Failed,
}

/// Record of one full or incremental scan. Persisted so the timeline and
/// scan history views have something real to show, and so "last scanned
/// at" is an actual fact rather than derived from process uptime.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRecord {
    pub id: Uuid,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub status: ScanStatus,
    pub resources_found: usize,
    pub providers_run: Vec<ProviderRunSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderRunSummary {
    pub provider_id: String,
    pub available: bool,
    pub unavailable_reason: Option<String>,
    pub resources_found: usize,
    pub duration_ms: u64,
    pub error: Option<String>,
}

impl ScanRecord {
    pub fn start() -> Self {
        Self {
            id: Uuid::new_v4(),
            started_at: Utc::now(),
            finished_at: None,
            status: ScanStatus::Running,
            resources_found: 0,
            providers_run: Vec::new(),
        }
    }
}
