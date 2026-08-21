use crate::process::{PortInfo, ProcessInfo, ProcessProvider};
use crate::shared;
use crate::system::{OperatingSystem, SystemInfo, SystemInfoProvider};
use crate::PlatformResult;

pub struct WindowsProcessProvider;

impl ProcessProvider for WindowsProcessProvider {
    fn list_processes(&self) -> PlatformResult<Vec<ProcessInfo>> {
        Ok(shared::list_processes_via_sysinfo())
    }

    fn list_listening_ports(&self) -> PlatformResult<Vec<PortInfo>> {
        shared::list_listening_ports_via_netstat2()
    }
}

pub struct WindowsSystemInfoProvider;

impl SystemInfoProvider for WindowsSystemInfoProvider {
    fn system_info(&self) -> SystemInfo {
        shared::build_system_info(OperatingSystem::Windows)
    }
}
