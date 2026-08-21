use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{Evidence, Resource, ResourceKind};
use std::process::Command;

/// Discovers background services registered with the platform's service
/// manager: `launchctl` on macOS, the systemd user bus on Linux. Windows
/// service discovery is not implemented; the provider reports itself
/// unavailable there rather than returning an empty or fabricated list.
///
/// Both OS-specific commands are invoked as plain argument vectors
/// (never through a shell), and their output is treated as untrusted
/// text: a malformed or unexpected line is skipped rather than causing a
/// panic.
pub struct ServiceProvider;

#[async_trait]
impl DiscoveryProvider for ServiceProvider {
    fn id(&self) -> &'static str {
        "services"
    }

    fn label(&self) -> &'static str {
        "Services"
    }

    fn availability(&self, _ctx: &ScanContext) -> Availability {
        if cfg!(any(target_os = "macos", target_os = "linux")) {
            Availability::Available
        } else {
            Availability::Unavailable {
                reason: "service discovery is not yet implemented on Windows".to_string(),
            }
        }
    }

    async fn scan(&self, _ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        tokio::task::spawn_blocking(scan_blocking)
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

fn scan_blocking() -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    if cfg!(target_os = "macos") {
        if let Some(raw) = run_launchctl_list() {
            output.resources.extend(parse_launchctl_list(&raw));
        }
    } else if cfg!(target_os = "linux") {
        if let Some(raw) = run_systemctl_list() {
            output.resources.extend(parse_systemctl_list(&raw));
        }
    }

    Ok(output)
}

fn run_launchctl_list() -> Option<String> {
    let output = Command::new("launchctl").arg("list").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}

/// `launchctl list` output is tab-separated: `PID\tStatus\tLabel`, with a
/// header line of the same shape. PID is `-` when the job is not
/// currently running; status is an exit code or `-`.
fn parse_launchctl_list(raw: &str) -> Vec<Resource> {
    raw.lines()
        .skip(1) // header: "PID\tStatus\tLabel"
        .filter_map(|line| {
            let mut fields = line.splitn(3, '\t');
            let pid = fields.next()?.trim();
            let status = fields.next()?.trim();
            let label = fields.next()?.trim();
            if label.is_empty() {
                return None;
            }

            let mut resource = Resource::identified(ResourceKind::Service, label, label)
                .with_attribute("running", pid != "-")
                .with_attribute("status", status)
                .with_evidence(Evidence {
                    source: "services".to_string(),
                    description: "reported by launchctl list".to_string(),
                    path: None,
                });

            if let Ok(pid) = pid.parse::<i64>() {
                resource = resource.with_attribute("pid", pid);
            }

            Some(resource)
        })
        .collect()
}

fn run_systemctl_list() -> Option<String> {
    let output = Command::new("systemctl")
        .args([
            "--user",
            "list-units",
            "--type=service",
            "--no-pager",
            "--no-legend",
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}

/// `systemctl --user list-units --type=service --no-pager --no-legend`
/// output, with the legend suppressed, is whitespace-separated columns:
/// `UNIT LOAD ACTIVE SUB DESCRIPTION...`. The description can itself
/// contain spaces, so it is captured as the remainder of the line.
fn parse_systemctl_list(raw: &str) -> Vec<Resource> {
    raw.lines()
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            let unit = fields.next()?;
            let load = fields.next()?;
            let active = fields.next()?;
            let sub = fields.next()?;
            let description: String = fields.collect::<Vec<_>>().join(" ");

            if unit.is_empty() {
                return None;
            }

            let resource = Resource::identified(ResourceKind::Service, unit, unit)
                .with_attribute("load_state", load)
                .with_attribute("active_state", active)
                .with_attribute("sub_state", sub)
                .with_attribute("description", description)
                .with_evidence(Evidence {
                    source: "services".to_string(),
                    description: "reported by systemctl --user list-units".to_string(),
                    path: None,
                });

            Some(resource)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_launchctl_list_output() {
        let raw = "PID\tStatus\tLabel\n1234\t0\tcom.apple.something\n-\t-\tcom.example.stopped\n";
        let resources = parse_launchctl_list(raw);
        assert_eq!(resources.len(), 2);

        let running = resources
            .iter()
            .find(|r| r.name == "com.apple.something")
            .unwrap();
        assert_eq!(
            running.attributes.get("running").and_then(|v| v.as_bool()),
            Some(true)
        );
        assert_eq!(
            running.attributes.get("pid").and_then(|v| v.as_i64()),
            Some(1234)
        );

        let stopped = resources
            .iter()
            .find(|r| r.name == "com.example.stopped")
            .unwrap();
        assert_eq!(
            stopped.attributes.get("running").and_then(|v| v.as_bool()),
            Some(false)
        );
    }

    #[test]
    fn skips_malformed_launchctl_lines() {
        let raw = "PID\tStatus\tLabel\nnot enough columns\n1234\t0\tcom.example.ok\n";
        let resources = parse_launchctl_list(raw);
        assert_eq!(resources.len(), 1);
        assert_eq!(resources[0].name, "com.example.ok");
    }

    #[test]
    fn parses_systemctl_list_output() {
        let raw = "sshd.service loaded active running OpenSSH server daemon\nfoo.service loaded inactive dead A description\n";
        let resources = parse_systemctl_list(raw);
        assert_eq!(resources.len(), 2);

        let sshd = resources.iter().find(|r| r.name == "sshd.service").unwrap();
        assert_eq!(
            sshd.attributes.get("active_state").and_then(|v| v.as_str()),
            Some("active")
        );
        assert_eq!(
            sshd.attributes.get("description").and_then(|v| v.as_str()),
            Some("OpenSSH server daemon")
        );
    }
}
