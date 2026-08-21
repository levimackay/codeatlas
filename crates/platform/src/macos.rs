use crate::process::{PortInfo, ProcessInfo, ProcessProvider};
use crate::shared;
use crate::system::{OperatingSystem, SystemInfo, SystemInfoProvider};
use crate::PlatformResult;

pub struct MacProcessProvider;

impl ProcessProvider for MacProcessProvider {
    fn list_processes(&self) -> PlatformResult<Vec<ProcessInfo>> {
        Ok(shared::list_processes_via_sysinfo())
    }

    fn list_listening_ports(&self) -> PlatformResult<Vec<PortInfo>> {
        shared::list_listening_ports_via_netstat2()
    }
}

pub struct MacSystemInfoProvider;

impl SystemInfoProvider for MacSystemInfoProvider {
    fn system_info(&self) -> SystemInfo {
        shared::build_system_info(OperatingSystem::MacOs)
    }
}
