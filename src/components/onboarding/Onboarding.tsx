import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commands } from "../../lib/commands";
import { useSearchRootsQuery } from "../../lib/queries";
import { Icon } from "../icons/Icon";
import { StatusDot, type StatusKind } from "../ui/StatusDot";
import type { ProviderRunSummary, ScanSummary } from "../../lib/types";

type Step = "welcome" | "roots" | "scanning" | "done";

// First-run flow: what CodeAtlas scans and never collects (from
// PRIVACY.md), a search-roots editor prefilled from getSearchRoots(),
// then a first scan with real per-provider status — never a fake
// percentage, only what run_scan's ScanSummary actually reports.
export function Onboarding() {
  const [step, setStep] = useState<Step>("welcome");
  const [roots, setRoots] = useState<string[]>([]);
  const [newRoot, setNewRoot] = useState("");
  const [scanResult, setScanResult] = useState<ScanSummary | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: defaultRoots, isLoading: rootsLoading } = useSearchRootsQuery();

  useEffect(() => {
    if (defaultRoots) setRoots(defaultRoots);
  }, [defaultRoots]);

  const setRootsMutation = useMutation({ mutationFn: (r: string[]) => commands.setSearchRoots(r) });
  const runScanMutation = useMutation({ mutationFn: (r: string[]) => commands.runScan(r) });
  const completeMutation = useMutation({
    mutationFn: () => commands.setOnboardingComplete(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-complete"] }),
  });

  function addRoot() {
    const trimmed = newRoot.trim();
    if (!trimmed) return;
    if (roots.includes(trimmed)) {
      setNewRoot("");
      return;
    }
    setRoots((r) => [...r, trimmed]);
    setNewRoot("");
  }

  function removeRoot(root: string) {
    setRoots((r) => r.filter((x) => x !== root));
  }

  async function startScan() {
    setStep("scanning");
    setScanError(null);
    try {
      await setRootsMutation.mutateAsync(roots);
      const result = await runScanMutation.mutateAsync(roots);
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["graph"] });
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["scans"] });
      queryClient.invalidateQueries({ queryKey: ["cleanup-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["search-roots"] });
      setStep("done");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    }
  }

  async function finish() {
    await completeMutation.mutateAsync();
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-canvas)",
      }}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          background: "var(--surface-panel)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--accent-copper)" }}>
          <Icon name="project" size={20} />
          <span className="text-panel-title">CodeAtlas</span>
        </div>

        {step === "welcome" && <WelcomeStep onNext={() => setStep("roots")} />}

        {step === "roots" && (
          <RootsStep
            roots={roots}
            newRoot={newRoot}
            loading={rootsLoading}
            onNewRootChange={setNewRoot}
            onAdd={addRoot}
            onRemove={removeRoot}
            onBack={() => setStep("welcome")}
            onNext={startScan}
          />
        )}

        {step === "scanning" && <ScanningStep error={scanError} onRetry={startScan} />}

        {step === "done" && scanResult && <DoneStep result={scanResult} onFinish={finish} finishing={completeMutation.isPending} />}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <h1 className="text-display" style={{ margin: 0 }}>
        A surveyor's instrument for your machine
      </h1>
      <p className="text-body" style={{ margin: 0, color: "var(--text-secondary)" }}>
        CodeAtlas builds a real, local map of your development environment: projects and git repos, running
        processes and listening ports, Docker resources, installed runtimes and package managers, disk usage and
        caches, and how they all depend on each other.
      </p>

      <div>
        <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
          WHAT IT READS
        </div>
        <ul className="text-body-sm" style={{ margin: 0, paddingLeft: "var(--space-4)", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <li>Directory listings and project manifest files under the search roots you choose</li>
          <li>Git metadata for repositories it finds there</li>
          <li>The OS process table and listening-socket table</li>
          <li>Docker container/image/volume/network metadata, if Docker is running</li>
          <li>Installed language runtime and package manager versions on your PATH</li>
          <li><code className="text-data-sm">~/.ssh/config</code> host aliases only, if present</li>
          <li>Environment variable names only — never their values</li>
        </ul>
      </div>

      <div>
        <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
          WHAT IT NEVER DOES
        </div>
        <ul className="text-body-sm" style={{ margin: 0, paddingLeft: "var(--space-4)", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <li>Never uploads anything — there is no server component or network client in discovery/storage</li>
          <li>Never collects telemetry or crash reports by default</li>
          <li>Never reads file contents beyond identifying a resource</li>
          <li>Never stores secret values (env values, SSH keys, embedded credentials)</li>
          <li>Never deletes anything for you — Cleanup Center only recommends</li>
        </ul>
      </div>

      <button type="button" onClick={onNext} className="text-label-lg" style={primaryButtonStyle}>
        Continue
      </button>
    </>
  );
}

function RootsStep({
  roots,
  newRoot,
  loading,
  onNewRootChange,
  onAdd,
  onRemove,
  onBack,
  onNext,
}: {
  roots: string[];
  newRoot: string;
  loading: boolean;
  onNewRootChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (root: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-panel-title" style={{ margin: 0 }}>
        Search roots
      </h2>
      <p className="text-body-sm" style={{ margin: 0, color: "var(--text-tertiary)" }}>
        CodeAtlas only looks inside these directories for projects. Add or remove roots below, then run the first
        scan.
      </p>

      {loading ? (
        <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          Loading defaults…
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {roots.length === 0 && (
            <li className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
              No search roots configured.
            </li>
          )}
          {roots.map((root) => (
            <li
              key={root}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--surface-content)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Icon name="folder" size={16} />
              <span className="text-data" style={{ flex: 1, overflowWrap: "anywhere" }}>
                {root}
              </span>
              <button type="button" onClick={() => onRemove(root)} aria-label={`Remove ${root}`} style={{ color: "var(--text-tertiary)" }}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <input
          value={newRoot}
          onChange={(e) => onNewRootChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder="/Users/you/Developer"
          aria-label="Add search root"
          className="text-data"
          style={{
            flex: 1,
            padding: "var(--space-2) var(--space-3)",
            background: "var(--surface-content)",
            border: "1px solid var(--border-hairline-strong)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
          }}
        />
        <button type="button" onClick={onAdd} className="text-label" style={secondaryButtonStyle}>
          Add
        </button>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="button" onClick={onBack} className="text-label-lg" style={secondaryButtonStyle}>
          Back
        </button>
        <button type="button" onClick={onNext} disabled={roots.length === 0} className="text-label-lg" style={{ ...primaryButtonStyle, flex: 1, opacity: roots.length === 0 ? 0.5 : 1 }}>
          Run first scan
        </button>
      </div>
    </>
  );
}

function ScanningStep({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (error) {
    return (
      <>
        <div className="text-panel-title">Scan failed</div>
        <p className="text-body-sm" style={{ color: "var(--status-error)" }}>
          {error}
        </p>
        <button type="button" onClick={onRetry} className="text-label-lg" style={primaryButtonStyle}>
          Retry
        </button>
      </>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-4) 0" }}>
      <Icon name="scan" size={20} />
      <span className="text-body">Scanning your machine…</span>
    </div>
  );
}

function providerStatus(p: ProviderRunSummary): StatusKind {
  if (p.error) return "error";
  if (!p.available) return "warning";
  return "healthy";
}

function DoneStep({ result, onFinish, finishing }: { result: ScanSummary; onFinish: () => void; finishing: boolean }) {
  return (
    <>
      <h2 className="text-panel-title" style={{ margin: 0 }}>
        Scan complete
      </h2>
      <p className="text-body-sm" style={{ margin: 0, color: "var(--text-secondary)" }}>
        {result.record.resources_found} resources found across {result.record.providers_run.length} providers.
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {result.record.providers_run.map((provider) => (
          <li
            key={provider.provider_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--border-hairline)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <StatusDot status={providerStatus(provider)} />
            <span className="text-data-sm" style={{ flex: 1 }}>
              {provider.provider_id}
            </span>
            <span className="text-data-sm" style={{ color: "var(--text-tertiary)" }}>
              {provider.error ? provider.error : !provider.available ? provider.unavailable_reason ?? "unavailable" : `${provider.resources_found} found`}
            </span>
          </li>
        ))}
      </ul>

      <button type="button" onClick={onFinish} disabled={finishing} className="text-label-lg" style={primaryButtonStyle}>
        {finishing ? "Opening CodeAtlas…" : "Open CodeAtlas"}
      </button>
    </>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-4)",
  background: "var(--accent-copper)",
  color: "#0b0c0f",
  borderRadius: "var(--radius-sm)",
  textAlign: "center",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "var(--space-2) var(--space-4)",
  border: "1px solid var(--border-hairline-strong)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  textAlign: "center",
};
