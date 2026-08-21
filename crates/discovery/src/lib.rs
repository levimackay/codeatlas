//! Discovery engine: orchestrates independent discovery providers,
//! merges their output into a `codeatlas_core::Graph`, and diffs
//! against the previous scan to produce timeline entries.

mod context;
mod engine;
mod provider;
pub mod providers;

pub use context::ScanContext;
pub use engine::{DiscoveryEngine, ScanOutcome};
pub use provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
