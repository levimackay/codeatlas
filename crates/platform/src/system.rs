use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OperatingSystem {
    MacOs,
    Linux,
    Windows,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: OperatingSystem,
    pub os_version: String,
    pub architecture: String,
    pub hostname: String,
    pub home_directory: String,
    pub cpu_cores: usize,
    pub total_memory_bytes: u64,
}

pub trait SystemInfoProvider: Send + Sync {
    fn system_info(&self) -> SystemInfo;
}
