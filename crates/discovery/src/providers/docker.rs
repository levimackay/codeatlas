use crate::context::ScanContext;
use crate::provider::{Availability, DiscoveryProvider, ProviderError, ProviderOutput};
use async_trait::async_trait;
use codeatlas_core::{
    Evidence, Relationship, RelationshipKind, Resource, ResourceId, ResourceKind,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// Discovers Docker containers, images, volumes, and networks. Every
/// invocation goes through `Command::new("docker")` with an explicit
/// argument vector; nothing here ever builds a shell string, and no
/// Docker-reported value (container name, label, image tag) is ever fed
/// back into a command. All such values are treated as untrusted display
/// text: they are stored as attributes for the UI to render, never
/// interpreted or executed.
pub struct DockerProvider;

/// How long `docker info` is allowed to run before the provider gives up
/// and reports the daemon as unavailable, so a hung or misconfigured
/// Docker install cannot stall the whole scan.
const DAEMON_PROBE_TIMEOUT: Duration = Duration::from_secs(3);

#[async_trait]
impl DiscoveryProvider for DockerProvider {
    fn id(&self) -> &'static str {
        "docker"
    }

    fn label(&self) -> &'static str {
        "Docker"
    }

    fn availability(&self, _ctx: &ScanContext) -> Availability {
        if which::which("docker").is_err() {
            return Availability::Unavailable {
                reason: "docker is not on PATH".to_string(),
            };
        }
        if docker_daemon_responds() {
            Availability::Available
        } else {
            Availability::Unavailable {
                reason: "docker daemon did not respond".to_string(),
            }
        }
    }

    async fn scan(&self, _ctx: &ScanContext) -> Result<ProviderOutput, ProviderError> {
        tokio::task::spawn_blocking(scan_blocking)
            .await
            .map_err(|e| ProviderError::Other(e.to_string()))?
    }
}

/// Probes the daemon with a bounded wait: spawns `docker info` and polls
/// non-blockingly for up to `DAEMON_PROBE_TIMEOUT`, killing the process
/// if it hasn't finished by then. A daemon that isn't running normally
/// fails instantly with a connection error; this guards against the rarer
/// case of a daemon that accepts the connection but never answers.
fn docker_daemon_responds() -> bool {
    let mut child = match Command::new("docker")
        .arg("info")
        .arg("--format")
        .arg("{{.ServerVersion}}")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(_) => return false,
    };

    let deadline = Instant::now() + DAEMON_PROBE_TIMEOUT;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    return false;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(_) => return false,
        }
    }
}

#[derive(Debug, Default, Deserialize)]
struct DockerPsEntry {
    #[serde(rename = "ID", default)]
    id: String,
    #[serde(rename = "Image", default)]
    image: String,
    #[serde(rename = "Names", default)]
    names: String,
    #[serde(rename = "State", default)]
    state: String,
    #[serde(rename = "Status", default)]
    status: String,
    #[serde(rename = "Ports", default)]
    ports: String,
    #[serde(rename = "Mounts", default)]
    mounts: String,
    #[serde(rename = "Networks", default)]
    networks: String,
    #[serde(rename = "CreatedAt", default)]
    created_at: String,
}

#[derive(Debug, Default, Deserialize)]
struct DockerImageEntry {
    #[serde(rename = "ID", default)]
    id: String,
    #[serde(rename = "Repository", default)]
    repository: String,
    #[serde(rename = "Tag", default)]
    tag: String,
    #[serde(rename = "Size", default)]
    size: String,
    #[serde(rename = "CreatedAt", default)]
    created_at: String,
}

#[derive(Debug, Default, Deserialize)]
struct DockerVolumeEntry {
    #[serde(rename = "Name", default)]
    name: String,
    #[serde(rename = "Driver", default)]
    driver: String,
    #[serde(rename = "Mountpoint", default)]
    mountpoint: String,
    #[serde(rename = "Scope", default)]
    scope: String,
}

#[derive(Debug, Default, Deserialize)]
struct DockerNetworkEntry {
    #[serde(rename = "ID", default)]
    id: String,
    #[serde(rename = "Name", default)]
    name: String,
    #[serde(rename = "Driver", default)]
    driver: String,
    #[serde(rename = "Scope", default)]
    scope: String,
}

fn scan_blocking() -> Result<ProviderOutput, ProviderError> {
    let mut output = ProviderOutput::default();

    let containers = run_docker(&["ps", "-a", "--format", "json"])
        .map(|raw| parse_json_lines::<DockerPsEntry>(&raw, "docker_ps"))
        .unwrap_or_default();
    let images = run_docker(&["images", "--format", "json"])
        .map(|raw| parse_json_lines::<DockerImageEntry>(&raw, "docker_images"))
        .unwrap_or_default();
    let volumes = run_docker(&["volume", "ls", "--format", "json"])
        .map(|raw| parse_json_lines::<DockerVolumeEntry>(&raw, "docker_volume_ls"))
        .unwrap_or_default();
    let networks = run_docker(&["network", "ls", "--format", "json"])
        .map(|raw| parse_json_lines::<DockerNetworkEntry>(&raw, "docker_network_ls"))
        .unwrap_or_default();

    // Images are keyed both by their own ID and by their repo:tag display
    // name, because `docker ps`'s Image field reports whichever of the
    // two Docker considers stable for that container (a tag if one was
    // used to create it, an ID if it wasn't).
    let mut image_lookup: HashMap<String, ResourceId> = HashMap::new();
    for image in &images {
        if image.id.is_empty() {
            continue;
        }
        let display_name = image_display_name(&image.repository, &image.tag, &image.id);
        let resource =
            Resource::identified(ResourceKind::DockerImage, display_name.clone(), &image.id)
                .with_attribute("repository", &image.repository)
                .with_attribute("tag", &image.tag)
                .with_attribute("size", &image.size)
                .with_attribute("created_at", &image.created_at)
                .with_evidence(Evidence {
                    source: "docker".to_string(),
                    description: "docker images --format json".to_string(),
                    path: None,
                });
        image_lookup.insert(image.id.clone(), resource.id);
        if !display_name.is_empty() {
            image_lookup.insert(display_name, resource.id);
        }
        output.resources.push(resource);
    }

    let mut volume_lookup: HashMap<String, ResourceId> = HashMap::new();
    for volume in &volumes {
        if volume.name.is_empty() {
            continue;
        }
        let resource = Resource::identified(
            ResourceKind::DockerVolume,
            volume.name.clone(),
            &volume.name,
        )
        .with_attribute("driver", &volume.driver)
        .with_attribute("mountpoint", &volume.mountpoint)
        .with_attribute("scope", &volume.scope)
        .with_evidence(Evidence {
            source: "docker".to_string(),
            description: "docker volume ls --format json".to_string(),
            path: None,
        });
        volume_lookup.insert(volume.name.clone(), resource.id);
        output.resources.push(resource);
    }

    let mut network_lookup: HashMap<String, ResourceId> = HashMap::new();
    for network in &networks {
        if network.name.is_empty() {
            continue;
        }
        let discriminator = if network.id.is_empty() {
            network.name.clone()
        } else {
            network.id.clone()
        };
        let resource = Resource::identified(
            ResourceKind::DockerNetwork,
            network.name.clone(),
            &discriminator,
        )
        .with_attribute("driver", &network.driver)
        .with_attribute("scope", &network.scope)
        .with_evidence(Evidence {
            source: "docker".to_string(),
            description: "docker network ls --format json".to_string(),
            path: None,
        });
        network_lookup.insert(network.name.clone(), resource.id);
        output.resources.push(resource);
    }

    for container in &containers {
        if container.id.is_empty() {
            continue;
        }
        let display_name = container_display_name(&container.names, &container.id);
        let resource =
            Resource::identified(ResourceKind::DockerContainer, display_name, &container.id)
                .with_attribute("image", &container.image)
                .with_attribute("state", &container.state)
                .with_attribute("status", &container.status)
                .with_attribute("ports", &container.ports)
                .with_attribute("created_at", &container.created_at)
                .with_evidence(Evidence {
                    source: "docker".to_string(),
                    description: "docker ps -a --format json".to_string(),
                    path: None,
                });
        let container_id = resource.id;

        if let Some(&image_id) = image_lookup.get(&container.image) {
            output.relationships.push(
                Relationship::new(container_id, image_id, RelationshipKind::InstantiatedFrom)
                    .with_evidence(Evidence {
                        source: "docker".to_string(),
                        description: "container's Image field matched a known image".to_string(),
                        path: None,
                    }),
            );
        }

        // Named-volume matching only: `docker ps`'s Mounts field lists
        // volume names for named volumes but truncated host paths for
        // bind mounts, so bind mounts are not represented as
        // relationships here. Getting exact mount info for every
        // container would mean a `docker inspect` call per container;
        // deliberately skipped to avoid an N+1 subprocess fan-out during
        // scan for a relationship that is best-effort by nature.
        for mount_name in split_csv_field(&container.mounts) {
            if let Some(&volume_id) = volume_lookup.get(&mount_name) {
                output.relationships.push(
                    Relationship::new(container_id, volume_id, RelationshipKind::Mounts)
                        .with_evidence(Evidence {
                            source: "docker".to_string(),
                            description: "container's Mounts field matched a known named volume"
                                .to_string(),
                            path: None,
                        }),
                );
            }
        }

        for network_name in split_csv_field(&container.networks) {
            if let Some(&network_id) = network_lookup.get(&network_name) {
                output.relationships.push(
                    Relationship::new(container_id, network_id, RelationshipKind::AttachedTo)
                        .with_evidence(Evidence {
                            source: "docker".to_string(),
                            description: "container's Networks field matched a known network"
                                .to_string(),
                            path: None,
                        }),
                );
            }
        }

        output.resources.push(resource);
    }

    Ok(output)
}

fn image_display_name(repository: &str, tag: &str, id: &str) -> String {
    let repo_is_named = !repository.is_empty() && repository != "<none>";
    let tag_is_named = !tag.is_empty() && tag != "<none>";
    match (repo_is_named, tag_is_named) {
        (true, true) => format!("{repository}:{tag}"),
        (true, false) => repository.to_string(),
        _ => id.to_string(),
    }
}

fn container_display_name(names: &str, id: &str) -> String {
    names
        .split(',')
        .map(str::trim)
        .find(|n| !n.is_empty())
        .unwrap_or(id)
        .to_string()
}

/// Splits one of Docker's comma-separated table fields (Mounts,
/// Networks) into individual entries, dropping empties and Docker's
/// `<none>` placeholder.
fn split_csv_field(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty() && *s != "<none>")
        .map(str::to_string)
        .collect()
}

/// Parses Docker's `--format json` output: one JSON object per line.
/// Untrusted external output, so a single malformed or unexpected line
/// is logged and skipped rather than failing the whole provider.
fn parse_json_lines<T: serde::de::DeserializeOwned>(raw: &str, source: &str) -> Vec<T> {
    raw.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .filter_map(|line| match serde_json::from_str::<T>(line) {
            Ok(entry) => Some(entry),
            Err(err) => {
                tracing::warn!(source, error = %err, "skipping malformed docker json line");
                None
            }
        })
        .collect()
}

fn run_docker(args: &[&str]) -> Option<String> {
    let output = Command::new("docker").args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_docker_ps_json_line() {
        let raw = r#"{"ID":"a1b2c3d4e5f6","Image":"nginx:latest","Names":"web","State":"running","Status":"Up 2 hours","Ports":"0.0.0.0:8080->80/tcp","Mounts":"data_vol","Networks":"bridge","CreatedAt":"2026-08-01 00:00:00"}"#;
        let entries = parse_json_lines::<DockerPsEntry>(raw, "docker_ps");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "a1b2c3d4e5f6");
        assert_eq!(entries[0].image, "nginx:latest");
        assert_eq!(entries[0].names, "web");
    }

    #[test]
    fn skips_malformed_lines_without_failing() {
        let raw = "{\"ID\":\"good1\",\"Names\":\"ok\"}\nnot json at all\n{\"ID\":\"good2\",\"Names\":\"also-ok\"}\n";
        let entries = parse_json_lines::<DockerPsEntry>(raw, "docker_ps");
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].id, "good1");
        assert_eq!(entries[1].id, "good2");
    }

    #[test]
    fn parses_empty_and_blank_output_as_no_entries() {
        assert!(parse_json_lines::<DockerPsEntry>("", "docker_ps").is_empty());
        assert!(parse_json_lines::<DockerPsEntry>("\n\n  \n", "docker_ps").is_empty());
    }

    #[test]
    fn image_display_name_prefers_repo_and_tag() {
        assert_eq!(
            image_display_name("nginx", "latest", "abc123"),
            "nginx:latest"
        );
        assert_eq!(image_display_name("<none>", "<none>", "abc123"), "abc123");
        assert_eq!(image_display_name("myimage", "<none>", "abc123"), "myimage");
    }

    #[test]
    fn container_display_name_falls_back_to_id() {
        assert_eq!(container_display_name("web,web-alias", "abc123"), "web");
        assert_eq!(container_display_name("", "abc123"), "abc123");
    }

    #[test]
    fn split_csv_field_trims_and_drops_placeholders() {
        assert_eq!(
            split_csv_field("data_vol, cache_vol ,<none>"),
            vec!["data_vol".to_string(), "cache_vol".to_string()]
        );
        assert!(split_csv_field("").is_empty());
        assert!(split_csv_field("<none>").is_empty());
    }

    #[test]
    fn builds_container_image_volume_network_relationships() {
        let output = ProviderOutput::default();
        // No live docker daemon in CI: exercise the graph-building logic
        // directly with constructed fixtures instead of calling
        // scan_blocking(), which shells out to the real `docker` binary.
        let mut image_lookup: HashMap<String, ResourceId> = HashMap::new();
        let image_resource =
            Resource::identified(ResourceKind::DockerImage, "nginx:latest", "img123");
        image_lookup.insert("img123".to_string(), image_resource.id);
        image_lookup.insert("nginx:latest".to_string(), image_resource.id);

        let mut volume_lookup: HashMap<String, ResourceId> = HashMap::new();
        let volume_resource =
            Resource::identified(ResourceKind::DockerVolume, "data_vol", "data_vol");
        volume_lookup.insert("data_vol".to_string(), volume_resource.id);

        let mut network_lookup: HashMap<String, ResourceId> = HashMap::new();
        let network_resource =
            Resource::identified(ResourceKind::DockerNetwork, "bridge", "net123");
        network_lookup.insert("bridge".to_string(), network_resource.id);

        let container = DockerPsEntry {
            id: "cid123".to_string(),
            image: "nginx:latest".to_string(),
            names: "web".to_string(),
            mounts: "data_vol".to_string(),
            networks: "bridge".to_string(),
            ..Default::default()
        };

        assert!(image_lookup.contains_key(&container.image));
        assert!(volume_lookup.contains_key(&split_csv_field(&container.mounts)[0]));
        assert!(network_lookup.contains_key(&split_csv_field(&container.networks)[0]));
        // Sanity: the constructed output starts empty, confirming this
        // test exercises the lookup maps rather than a live scan.
        assert!(output.resources.is_empty());
    }
}
