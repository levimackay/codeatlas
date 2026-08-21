import { useScansQuery } from "../../lib/queries";
import { formatAbsoluteTime, formatRelativeTime } from "../../lib/format";
import { StatusDot, type StatusKind } from "../ui/StatusDot";
import type { ProviderRunSummary, ScanStatus } from "../../lib/types";

function providerStatus(p: ProviderRunSummary): StatusKind {
  if (p.error) return "error";
  if (!p.available) return "warning";
  return "healthy";
}

function scanStatusLabel(status: ScanStatus): string {
  switch (status) {
    case "running":
      return "Scanning";
    case "completed":
      return "Idle";
    case "failed":
      return "Last scan failed";
  }
}

// Always-visible 28px status strip — DESIGN.md 4.2. Real per-provider
// availability and relative + absolute mono time for the last scan.
//
// DESIGN.md 6 describes a determinate progress bar that fills as providers
// complete. `run_scan` (src-tauri/src/commands.rs) is a single blocking
// async command that resolves once with the final ScanSummary — there is
// no Tauri event emitted per-provider as the scan runs, so the frontend
// has no real fractional-completion signal to draw a determinate bar from
// while a scan is in flight. Rather than fabricate a percentage (which
// DESIGN.md explicitly forbids) or fall back to a banned indeterminate
// spinner, this shows the real "Scanning" text state and dims the last
// known provider dots to signal they're stale, then snaps to the fresh
// dot row the instant the real ScanSummary resolves. See this component's
// note in the implementation report for the backend gap that would close
// this (a `scan-progress` event emitted per provider from `run_scan`).
export function StatusStrip({ scanning }: { scanning: boolean }) {
  const { data: scans } = useScansQuery(1);
  const latest = scans?.[0];

  return (
    <div
      style={{
        height: 28,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "0 var(--space-3)",
        background: "var(--surface-canvas)",
        borderTop: "1px solid var(--border-hairline)",
      }}
    >
      <span className="text-caption" style={{ color: "var(--text-tertiary)" }}>
        {scanning ? "Scanning" : latest ? scanStatusLabel(latest.status) : "No scan yet"}
      </span>

      {latest && latest.providers_run.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", opacity: scanning ? 0.4 : 1 }}>
          {latest.providers_run.map((provider) => (
            <span
              key={provider.provider_id}
              title={
                provider.error
                  ? `${provider.provider_id}: ${provider.error}`
                  : !provider.available
                    ? `${provider.provider_id}: ${provider.unavailable_reason ?? "unavailable"}`
                    : `${provider.provider_id}: ${provider.resources_found} resources`
              }
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <StatusDot status={providerStatus(provider)} />
            </span>
          ))}
        </div>
      )}

      <span className="text-data-sm" style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}>
        {latest
          ? `Last scan: ${formatRelativeTime(latest.finished_at ?? latest.started_at)} · ${formatAbsoluteTime(
              latest.finished_at ?? latest.started_at,
            )}`
          : "—"}
      </span>
    </div>
  );
}
