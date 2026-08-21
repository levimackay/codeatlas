//! Normalized domain model shared by every other CodeAtlas crate.
//!
//! This crate performs no I/O. It defines what a discovered resource is,
//! how resources relate to each other, how changes between scans are
//! computed, and how cleanup candidates are represented. The discovery
//! engine produces these types, the db crate persists them, and the
//! Tauri commands and CLI serialize them straight to the frontend.

pub mod change;
pub mod cleanup;
pub mod graph;
pub mod resource;
pub mod scan;

pub use change::{diff_resources, ChangeEvent, ChangeKind};
pub use cleanup::{CleanupCandidate, CleanupCategory};
pub use graph::{Graph, Relationship, RelationshipKind};
pub use resource::{deterministic_id, Evidence, Resource, ResourceId, ResourceKind};
pub use scan::{ProviderRunSummary, ScanRecord, ScanStatus};
