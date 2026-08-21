use crate::PlatformResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    /// The full command line, if the OS exposes it and the current user
    /// has permission to read it. Treated as potentially sensitive by
    /// every caller: never persisted verbatim, never shown in full by
    /// default (see `SECURITY.md`).
    pub command_line: Option<Vec<String>>,
    pub working_directory: Option<String>,
    pub executable_path: Option<String>,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    Tcp,
    Udp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: Protocol,
    pub pid: Option<u32>,
    /// "0.0.0.0", "127.0.0.1", "::", etc.
    pub local_address: String,
}

/// Process and listening-port enumeration for the current OS.
pub trait ProcessProvider: Send + Sync {
    fn list_processes(&self) -> PlatformResult<Vec<ProcessInfo>>;
    fn list_listening_ports(&self) -> PlatformResult<Vec<PortInfo>>;
}
