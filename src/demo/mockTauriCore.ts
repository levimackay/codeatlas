// Demo-mode stand-in for `@tauri-apps/api/core`, swapped in only by the
// `resolve.alias` in vite.config.ts when VITE_DEMO_MODE=true. Never part
// of a normal dev/build/test module graph — see vite.config.ts for the
// gating mechanism. Backed entirely by the static fixture in this
// directory so the real app UI can be screenshotted outside a Tauri
// window, with no network or filesystem access of its own.
//
// Re-exports stub versions of every other named export of the real
// `@tauri-apps/api/core` module (checked against
// node_modules/@tauri-apps/api/core.d.ts) so this alias doesn't break
// anything else in the dependency graph that imports from that module
// specifier, even though only `invoke` is actually used from src/.

import fixture from "./fixture.json";
import type {
  ChangeEvent,
  CleanupCandidate,
  Graph,
  PlatformCapabilities,
  Resource,
  ScanRecord,
  ScanSummary,
  SystemInfo,
} from "../lib/types";

interface Fixture {
  graph: Graph;
  changes: ChangeEvent[];
  scans: ScanRecord[];
  cleanup_candidates: CleanupCandidate[];
}

const data = fixture as unknown as Fixture;

const DEMO_SYSTEM_INFO: SystemInfo = {
  os: "macos",
  os_version: "15.5",
  architecture: "arm64",
  hostname: "demo-machine",
  home_directory: "/Users/demo",
  cpu_cores: 12,
  total_memory_bytes: 34_359_738_368,
};

const DEMO_PLATFORM_CAPABILITIES: PlatformCapabilities = {
  processes: true,
  ports: true,
  services: true,
  disk_usage: true,
  application_inventory: true,
};

const DEMO_SEARCH_ROOTS = ["/Users/levimackay/Developer"];

const DEFAULT_SEARCH_LIMIT = 50;

function slice<T>(items: T[], limit: unknown): T[] {
  if (typeof limit === "number" && Number.isFinite(limit)) {
    return items.slice(0, limit);
  }
  return items;
}

function searchResources(query: unknown, limit: unknown): Resource[] {
  const needle = typeof query === "string" ? query.toLowerCase() : "";
  const matches = Object.values(data.graph.resources).filter((resource) => {
    const name = resource.name.toLowerCase();
    const path = resource.path?.toLowerCase() ?? "";
    return name.includes(needle) || path.includes(needle);
  });
  const cap = typeof limit === "number" && Number.isFinite(limit) ? limit : DEFAULT_SEARCH_LIMIT;
  return matches.slice(0, cap);
}

function runScan(): ScanSummary {
  return { record: data.scans[0], changes: data.changes };
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  switch (cmd) {
    case "get_system_info":
      return DEMO_SYSTEM_INFO as T;
    case "get_platform_capabilities":
      return DEMO_PLATFORM_CAPABILITIES as T;
    case "run_scan":
      return runScan() as T;
    case "get_graph":
      return data.graph as T;
    case "search_resources":
      return searchResources(args?.query, args?.limit) as T;
    case "list_changes":
      return slice(data.changes, args?.limit) as T;
    case "list_scans":
      return slice(data.scans, args?.limit) as T;
    case "list_cleanup_candidates":
      return data.cleanup_candidates as T;
    case "get_search_roots":
      return DEMO_SEARCH_ROOTS as T;
    case "set_search_roots":
      return undefined as T;
    case "get_onboarding_complete":
      return true as T;
    case "set_onboarding_complete":
      return undefined as T;
    default:
      throw new Error(`Unhandled invoke in demo mode: ${cmd} ${JSON.stringify(args)}`);
  }
}

// Stubs for the rest of `@tauri-apps/api/core`'s named exports, in case
// something else in the module graph imports them via this same
// specifier. None of these are exercised by demo mode.

export class Channel<T = unknown> {
  id = 0;
  onmessage: (response: T) => void = () => {};
}

export class PluginListener {
  constructor(
    private plugin: string,
    private event: string,
    private channelId: number,
  ) {}
  async unregister(): Promise<void> {
    void this.plugin;
    void this.event;
    void this.channelId;
  }
}

export async function addPluginListener(): Promise<PluginListener> {
  return new PluginListener("", "", 0);
}

export function transformCallback(): number {
  return 0;
}

export function convertFileSrc(filePath: string): string {
  return filePath;
}

export function isTauri(): boolean {
  return false;
}

export type PermissionState = "granted" | "denied" | "prompt";

export async function checkPermissions(): Promise<never> {
  throw new Error("checkPermissions is not available in demo mode");
}

export async function requestPermissions(): Promise<never> {
  throw new Error("requestPermissions is not available in demo mode");
}
