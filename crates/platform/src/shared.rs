//! Logic that happens to be identical across operating systems today
//! because the underlying crates (`sysinfo`, `netstat2`) already
//! abstract the syscall differences safely. Kept separate from the
//! per-OS modules so it is obvious this is shared by choice, not by
//! accident, and so a future OS-specific override is a one-line change
//! in that OS's module rather than a diff against another OS's file.

use crate::process::{PortInfo, Protocol};
use crate::system::{OperatingSystem, SystemInfo};
use crate::{PlatformError, PlatformResult};
use netstat2::{get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo};
use sysinfo::System;

pub(crate) fn list_listening_ports_via_netstat2() -> PlatformResult<Vec<PortInfo>> {
    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;

    let sockets = get_sockets_info(af_flags, proto_flags)
        .map_err(|e| PlatformError::SystemCall(e.to_string()))?;

    let mut ports = Vec::new();
    for socket in sockets {
        match socket.protocol_socket_info {
            ProtocolSocketInfo::Tcp(tcp) => {
                if tcp.state == netstat2::TcpState::Listen {
                    ports.push(PortInfo {
                        port: tcp.local_port,
                        protocol: Protocol::Tcp,
                        pid: socket.associated_pids.first().copied(),
                        local_address: tcp.local_addr.to_string(),
                    });
                }
            }
            ProtocolSocketInfo::Udp(udp) => {
                ports.push(PortInfo {
                    port: udp.local_port,
                    protocol: Protocol::Udp,
                    pid: socket.associated_pids.first().copied(),
                    local_address: udp.local_addr.to_string(),
                });
            }
        }
    }

    Ok(ports)
}

pub(crate) fn build_system_info(os: OperatingSystem) -> SystemInfo {
    let mut system = System::new_all();
    system.refresh_all();

    SystemInfo {
        os,
        os_version: System::long_os_version().unwrap_or_else(|| "unknown".to_string()),
        architecture: System::cpu_arch().unwrap_or_else(|| "unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "unknown".to_string()),
        home_directory: home_directory(),
        cpu_cores: system.cpus().len(),
        total_memory_bytes: system.total_memory(),
    }
}

fn home_directory() -> String {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
    }
}

pub(crate) fn list_processes_via_sysinfo() -> Vec<crate::process::ProcessInfo> {
    let mut system = System::new_all();
    system.refresh_all();

    system
        .processes()
        .values()
        .map(|proc| crate::process::ProcessInfo {
            pid: proc.pid().as_u32(),
            parent_pid: proc.parent().map(|p| p.as_u32()),
            name: proc.name().to_string_lossy().into_owned(),
            command_line: {
                let cmd: Vec<String> = proc
                    .cmd()
                    .iter()
                    .map(|s| s.to_string_lossy().into_owned())
                    .collect();
                if cmd.is_empty() {
                    None
                } else {
                    Some(cmd)
                }
            },
            working_directory: proc.cwd().map(|p| p.display().to_string()),
            executable_path: proc.exe().map(|p| p.display().to_string()),
            start_time: chrono::DateTime::from_timestamp(proc.start_time() as i64, 0),
        })
        .collect()
}
