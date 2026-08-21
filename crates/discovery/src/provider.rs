use crate::context::ScanContext;
use async_trait::async_trait;
use codeatlas_core::{Relationship, Resource};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Availability {
    Available,
    Unavailable { reason: String },
}

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Other(String),
}

/// What a single provider contributes to one scan.
#[derive(Debug, Default)]
pub struct ProviderOutput {
    pub resources: Vec<Resource>,
    pub relationships: Vec<Relationship>,
}

impl ProviderOutput {
    pub fn merge(&mut self, other: ProviderOutput) {
        self.resources.extend(other.resources);
        self.relationships.extend(other.relationships);
    }
}

/// One independent unit of discovery. Providers never assume they are
/// the only one running, never assume the current OS, and never let an
/// internal error escape `scan` as a panic — the engine will catch a
/// panic at the task boundary regardless, but a provider that returns
/// `Err` instead gives the user an actual reason in the diagnostics view.
#[async_trait]
pub trait DiscoveryProvider: Send + Sync {
    /// Short, stable, machine identifier. Used in diagnostics, in the
    /// database, and in the provider allowlist/denylist in settings.
    fn id(&self) -> &'static str;

    /// Human label for the diagnostics and settings UI.
    fn label(&self) -> &'static str;

    /// Cheap check for whether this provider can run at all in this
    /// environment. Called before `scan`; the engine skips `scan`
    /// entirely when this returns `Unavailable`.
    fn availability(&self, ctx: &ScanContext) -> Availability;

    async fn scan(&self, ctx: &ScanContext) -> Result<ProviderOutput, ProviderError>;
}
