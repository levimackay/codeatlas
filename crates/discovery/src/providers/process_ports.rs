use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Evidence, Relationship, RelationshipKind, Resource, ResourceKind};
use std::collections::HashMap;

/// Discovers running processes and the ports they listen on. Command
/// lines are recorded but truncated and flagged: full argv can contain
/// tokens or credentials passed on the command line, so only the
/// executable name and first argument are ever kept, and the resource's
/// `sensitive` evidence note travels with it into the UI layer.
pub struct ProcessPortProvider;

const MAX_COMMAND_LINE_TOKENS: usize = 2;

#[async_trait]
impl DiscoveryProvider for ProcessPortProvider {
    fn id(&self) -> &'static str {
        "process_port"
    }

    fn label(&self) -> &'static str {
        "Processes and ports"
    }

    fn availability(&self, _ctx: &ScanContext) -> Availability {
        Availability::Available
    }

    async fn scan(&self, ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        let process_provider = ctx.process_provider.clone();
        let (processes, ports) = tokio::task::spawn_blocking(move || {
            let processes = process_provider.list_processes();
            let ports = process_provider.list_listening_ports();
            (processes, ports)
        })
        .await
        .map_err(|e| ProviderError::Other(e.to_string()))?;

        let processes = processes.map_err(|e| ProviderError::Other(e.to_string()))?;
        let ports = ports.map_err(|e| ProviderError::Other(e.to_string()))?;

        let mut output = ProviderOutput::default();
        let mut process_resource_by_pid = HashMap::new();

        for proc in &processes {
            let truncated_command = proc.command_line.as_ref().map(|cmd| {
                cmd.iter()
                    .take(MAX_COMMAND_LINE_TOKENS)
                    .cloned()
                    .collect::<Vec<_>>()
                    .join(" ")
            });

            let mut resource = Resource::new(ResourceKind::Process, proc.name.clone())
                .with_attribute("pid", proc.pid)
                .with_attribute("parent_pid", proc.parent_pid);

            if let Some(cwd) = &proc.working_directory {
                resource = resource.with_path(cwd.clone());
            }
            if let Some(cmd) = truncated_command {
                resource = resource.with_attribute("command_preview", cmd);
            }
            resource = resource.with_evidence(Evidence {
                source: self.id().to_string(),
                description: "Reported by the operating system's process table".to_string(),
                path: proc.executable_path.clone(),
            });

            process_resource_by_pid.insert(proc.pid, resource.id);
            output.resources.push(resource);
        }

        for port in &ports {
            let mut resource = Resource::new(ResourceKind::Port, format!(":{}", port.port))
                .with_attribute("port", port.port)
                .with_attribute("protocol", format!("{:?}", port.protocol).to_lowercase())
                .with_attribute("local_address", port.local_address.clone())
                .with_evidence(Evidence {
                    source: self.id().to_string(),
                    description: "Reported by the operating system's socket table".to_string(),
                    path: None,
                });

            let port_id = resource.id;
            if let Some(pid) = port.pid {
                if let Some(&process_id) = process_resource_by_pid.get(&pid) {
                    resource = resource.with_attribute("owning_pid", pid);
                    output.relationships.push(
                        Relationship::new(process_id, port_id, RelationshipKind::ListensOn)
                            .with_evidence(Evidence {
                                source: self.id().to_string(),
                                description: format!("Process {pid} owns the listening socket"),
                                path: None,
                            }),
                    );
                }
            }

            output.resources.push(resource);
        }

        Ok(output)
    }
}
