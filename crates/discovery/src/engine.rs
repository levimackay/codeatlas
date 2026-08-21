use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderOutput};
use codeatlas_core::{
    diff_resources, ChangeEvent, Graph, ProviderRunSummary, ScanRecord, ScanStatus,
};
use std::sync::Arc;
use std::time::Instant;

/// Orchestrates every registered provider for one scan: checks
/// availability, runs each available provider concurrently with a panic
/// boundary around it, merges the results into a `Graph`, and diffs
/// against the previous graph to produce the timeline entries for this
/// scan.
pub struct DiscoveryEngine {
    providers: Vec<Arc<dyn DiscoveryProvider>>,
}

pub struct ScanOutcome {
    pub record: ScanRecord,
    pub graph: Graph,
    pub changes: Vec<ChangeEvent>,
}

impl DiscoveryEngine {
    pub fn new(providers: Vec<Arc<dyn DiscoveryProvider>>) -> Self {
        Self { providers }
    }

    /// Registers the full built-in provider set. Kept as a free function
    /// on the engine (rather than a `Default` impl) so callers that want
    /// a reduced provider set for testing can build one with `new`
    /// directly.
    pub fn with_builtin_providers() -> Self {
        Self::new(crate::providers::builtin_providers())
    }

    pub async fn run_scan(&self, ctx: &ScanContext, previous_graph: &Graph) -> ScanOutcome {
        let mut record = ScanRecord::start();
        let mut graph = Graph::new();

        let mut tasks = Vec::with_capacity(self.providers.len());
        for provider in &self.providers {
            let provider = Arc::clone(provider);
            let ctx = ctx.clone();
            tasks.push(tokio::spawn(async move {
                let id = provider.id();
                let availability = provider.availability(&ctx);
                let started = Instant::now();

                match availability {
                    Availability::Unavailable { reason } => ProviderRun {
                        summary: ProviderRunSummary {
                            provider_id: id.to_string(),
                            available: false,
                            unavailable_reason: Some(reason),
                            resources_found: 0,
                            duration_ms: 0,
                            error: None,
                        },
                        output: None,
                    },
                    Availability::Available => match provider.scan(&ctx).await {
                        Ok(output) => ProviderRun {
                            summary: ProviderRunSummary {
                                provider_id: id.to_string(),
                                available: true,
                                unavailable_reason: None,
                                resources_found: output.resources.len(),
                                duration_ms: started.elapsed().as_millis() as u64,
                                error: None,
                            },
                            output: Some(output),
                        },
                        Err(err) => ProviderRun {
                            summary: ProviderRunSummary {
                                provider_id: id.to_string(),
                                available: true,
                                unavailable_reason: None,
                                resources_found: 0,
                                duration_ms: started.elapsed().as_millis() as u64,
                                error: Some(err.to_string()),
                            },
                            output: None,
                        },
                    },
                }
            }));
        }

        for task in tasks {
            let run = match task.await {
                Ok(run) => run,
                // A provider panicked. The scan continues; this provider
                // is reported as failed rather than taking the app down.
                Err(join_error) => ProviderRun {
                    summary: ProviderRunSummary {
                        provider_id: "unknown".to_string(),
                        available: true,
                        unavailable_reason: None,
                        resources_found: 0,
                        duration_ms: 0,
                        error: Some(format!("provider panicked: {join_error}")),
                    },
                    output: None,
                },
            };

            if let Some(output) = run.output {
                apply_output(&mut graph, output);
            }
            record.providers_run.push(run.summary);
        }

        record.resources_found = graph.len();
        record.status = ScanStatus::Completed;
        record.finished_at = Some(chrono::Utc::now());

        let changes = diff_resources(previous_graph.resources(), graph.resources());

        ScanOutcome {
            record,
            graph,
            changes,
        }
    }
}

struct ProviderRun {
    summary: ProviderRunSummary,
    output: Option<ProviderOutput>,
}

fn apply_output(graph: &mut Graph, output: ProviderOutput) {
    for resource in output.resources {
        graph.upsert_resource(resource);
    }
    for relationship in output.relationships {
        graph.add_relationship(relationship);
    }
}
