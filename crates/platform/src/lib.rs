//! Platform abstraction layer.
//!
//! Everything the discovery engine needs that differs by operating
//! system is defined here as a trait, with implementations selected at
//! compile time by `cfg(target_os = ...)`. Nothing outside this crate
//! should contain a `cfg(target_os = ...)` block; if a discovery
//! provider in the `discovery` crate finds itself wanting one, that is a
//! sign the abstraction here is missing something and should grow, not
//! that the `cfg` should live there instead.

pub mod capabilities;
pub mod process;
pub mod system;

#[cfg(any(target_os = "macos", target_os = "linux", target_os = "windows"))]
mod shared;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

pub use capabilities::PlatformCapabilities;
pub use process::{PortInfo, ProcessInfo, ProcessProvider, Protocol};
pub use system::{OperatingSystem, SystemInfo, SystemInfoProvider};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum PlatformError {
    #[error("permission denied: {0}")]
    PermissionDenied(String),
    #[error("not supported on this platform: {0}")]
    Unsupported(String),
    #[error("underlying system call failed: {0}")]
    SystemCall(String),
}

pub type PlatformResult<T> = Result<T, PlatformError>;

/// Constructs the process provider for the current operating system.
pub fn process_provider() -> Box<dyn ProcessProvider> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacProcessProvider)
    }
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxProcessProvider)
    }
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsProcessProvider)
    }
}

/// Constructs the system info provider for the current operating system.
pub fn system_info_provider() -> Box<dyn SystemInfoProvider> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacSystemInfoProvider)
    }
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxSystemInfoProvider)
    }
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsSystemInfoProvider)
    }
}
