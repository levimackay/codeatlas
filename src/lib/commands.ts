import { invoke } from "@tauri-apps/api/core";
import type {
  ChangeEvent,
  CleanupCandidate,
  Graph,
  PlatformCapabilities,
  Resource,
  ScanRecord,
  ScanSummary,
  SystemInfo,
} from "./types";

// Thin, typed wrappers around the Tauri IPC commands defined in
// src-tauri/src/commands.rs. Nothing in the UI should call `invoke`
// directly; going through here keeps the command names and argument
// shapes in exactly one place on the frontend side.

export const commands = {
  getSystemInfo: () => invoke<SystemInfo>("get_system_info"),
  getPlatformCapabilities: () => invoke<PlatformCapabilities>("get_platform_capabilities"),
  runScan: (roots?: string[]) => invoke<ScanSummary>("run_scan", { roots: roots ?? null }),
  getGraph: () => invoke<Graph>("get_graph"),
  searchResources: (query: string, limit?: number) =>
    invoke<Resource[]>("search_resources", { query, limit: limit ?? null }),
  listChanges: (limit?: number) => invoke<ChangeEvent[]>("list_changes", { limit: limit ?? null }),
  listScans: (limit?: number) => invoke<ScanRecord[]>("list_scans", { limit: limit ?? null }),
  listCleanupCandidates: () => invoke<CleanupCandidate[]>("list_cleanup_candidates"),
  getSearchRoots: () => invoke<string[]>("get_search_roots"),
  setSearchRoots: (roots: string[]) => invoke<void>("set_search_roots", { roots }),
  getOnboardingComplete: () => invoke<boolean>("get_onboarding_complete"),
  setOnboardingComplete: () => invoke<void>("set_onboarding_complete"),
};
