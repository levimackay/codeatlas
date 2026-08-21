use serde::{Deserialize, Serialize};

/// What the current platform build can actually inspect. The frontend
/// uses this to explain gaps honestly ("port discovery is not yet
/// implemented on Linux") instead of silently showing an empty section.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformCapabilities {
    pub processes: bool,
    pub ports: bool,
    pub services: bool,
    pub disk_usage: bool,
    pub application_inventory: bool,
}

impl PlatformCapabilities {
    pub fn current() -> Self {
        Self {
            processes: true,
            ports: true,
            services: cfg!(any(target_os = "macos", target_os = "linux")),
            disk_usage: true,
            application_inventory: cfg!(target_os = "macos"),
        }
    }
}
