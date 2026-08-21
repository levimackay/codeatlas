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

/// Key names that indicate a `KEY=VALUE` or `--key=value` token is
/// carrying a credential rather than an ordinary flag.
const SECRET_KEY_MARKERS: &[&str] = &[
    "token",
    "secret",
    "key",
    "password",
    "passwd",
    "pwd",
    "auth",
    "credential",
    "apikey",
    "api_key",
    "access_key",
    "private_key",
    "bearer",
    "session",
];

/// A real scan of a real machine found actual secrets (an env var value
/// that had been passed through as a command-line argument by some other
/// tool) surfacing in this preview. Truncating to a couple of tokens is
/// not sufficient on its own — the secret can land in either of the
/// tokens that survive truncation — so every surviving token is also
/// redacted if it looks like it's carrying a credential, before it's
/// ever joined into the stored preview string.
fn redact_secret_like_token(token: &str) -> String {
    if let Some(eq_pos) = token.find('=') {
        let (key, value) = token.split_at(eq_pos);
        let key_lower = key.trim_start_matches('-').to_lowercase();
        if SECRET_KEY_MARKERS
            .iter()
            .any(|marker| key_lower.contains(marker))
        {
            return format!("{key}=[REDACTED]");
        }
        // A bare KEY=VALUE with no recognizable flag prefix and a long
        // value is treated as suspicious even without a matching key
        // name — most legitimate CLI flags are short (`--port=3000`).
        if !key.starts_with('-') && value.len() > 12 {
            return format!("{key}=[REDACTED]");
        }
    }

    if let Some(at_pos) = token.find('@') {
        if token.contains("://") {
            return redact_userinfo_in_url(token, at_pos);
        }
    }

    // A long, high-entropy-looking token with no spaces and no clear
    // structure (not a path, not a flag) is redacted defensively even
    // without a recognizable key name.
    if token.len() > 24
        && !token.contains('/')
        && !token.contains('\\')
        && token
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
    {
        return "[REDACTED]".to_string();
    }

    token.to_string()
}

fn redact_userinfo_in_url(token: &str, first_at: usize) -> String {
    let mut result = String::with_capacity(token.len());
    if let Some(scheme_end) = token.find("://") {
        let authority_start = scheme_end + 3;
        let userinfo_end = token[authority_start..]
            .find('@')
            .map(|p| authority_start + p)
            .unwrap_or(first_at);
        result.push_str(&token[..authority_start]);
        result.push_str("[REDACTED]");
        result.push_str(&token[userinfo_end..]);
        return result;
    }
    token.to_string()
}

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
                    .map(|token| redact_secret_like_token(token))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_key_value_tokens_with_a_secret_marker_name() {
        assert_eq!(
            redact_secret_like_token("TOKEN=abc123xyzdef456"),
            "TOKEN=[REDACTED]"
        );
        assert_eq!(
            redact_secret_like_token("--api-key=sk-live-abcdef1234567890"),
            "--api-key=[REDACTED]"
        );
        assert_eq!(
            redact_secret_like_token("CLAUDE_CODE_MESSAGING_TOKEN=eyJhbGciOiJIUzI1NiJ9"),
            "CLAUDE_CODE_MESSAGING_TOKEN=[REDACTED]"
        );
    }

    #[test]
    fn redacts_long_bare_key_value_even_without_a_recognized_marker() {
        assert_eq!(
            redact_secret_like_token("SESSION_ID=9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c"),
            "SESSION_ID=[REDACTED]"
        );
    }

    #[test]
    fn keeps_short_ordinary_flags_intact() {
        assert_eq!(redact_secret_like_token("--port=3000"), "--port=3000");
        assert_eq!(redact_secret_like_token("server.js"), "server.js");
        assert_eq!(redact_secret_like_token("--verbose"), "--verbose");
    }

    #[test]
    fn redacts_userinfo_in_connection_strings() {
        assert_eq!(
            redact_secret_like_token("mongodb://admin:hunter2@db.internal:27017/prod"),
            "mongodb://[REDACTED]@db.internal:27017/prod"
        );
    }

    #[test]
    fn redacts_long_opaque_looking_bearer_tokens_with_no_equals_sign() {
        let token = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789";
        assert_eq!(redact_secret_like_token(token), "[REDACTED]");
    }

    #[test]
    fn does_not_redact_ordinary_filesystem_paths() {
        let token = "/Users/dev/Developer/some-project/src/main.rs";
        assert_eq!(redact_secret_like_token(token), token);
    }
}
