import { useEffect, useState } from "react";
import {
  usePlatformCapabilitiesQuery,
  useScansQuery,
  useSearchRootsQuery,
  useSetSearchRootsMutation,
  useSystemInfoQuery,
} from "../../lib/queries";
import { Icon } from "../icons/Icon";
import { StatusDot, type StatusKind } from "../ui/StatusDot";
import { formatBytes } from "../../lib/format";
import type { ProviderRunSummary } from "../../lib/types";

function providerStatus(p: ProviderRunSummary): StatusKind {
  if (p.error) return "error";
  if (!p.available) return "warning";
  return "healthy";
}

export function Settings() {
  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-8)", maxWidth: 720 }}>
      <h1 className="text-display" style={{ margin: 0 }}>
        Settings
      </h1>
      <SearchRootsSection />
      <DiagnosticsSection />
      <AboutSection />
    </div>
  );
}

function SearchRootsSection() {
  const { data: savedRoots, isLoading } = useSearchRootsQuery();
  const setRoots = useSetSearchRootsMutation();
  const [roots, setLocalRoots] = useState<string[]>([]);
  const [newRoot, setNewRoot] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedRoots && !dirty) setLocalRoots(savedRoots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedRoots]);

  function addRoot() {
    const trimmed = newRoot.trim();
    if (!trimmed || roots.includes(trimmed)) {
      setNewRoot("");
      return;
    }
    setLocalRoots((r) => [...r, trimmed]);
    setNewRoot("");
    setDirty(true);
  }

  function removeRoot(root: string) {
    setLocalRoots((r) => r.filter((x) => x !== root));
    setDirty(true);
  }

  async function save() {
    await setRoots.mutateAsync(roots);
    setDirty(false);
  }

  return (
    <section>
      <h2 className="text-panel-title" style={{ margin: "0 0 var(--space-1)" }}>
        Search roots
      </h2>
      <p className="text-body-sm" style={{ margin: "0 0 var(--space-3)", color: "var(--text-tertiary)" }}>
        CodeAtlas only scans inside these directories.
      </p>

      {isLoading ? (
        <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          Loading…
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {roots.map((root) => (
            <li
              key={root}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Icon name="folder" size={16} />
              <span className="text-data" style={{ flex: 1, overflowWrap: "anywhere" }}>
                {root}
              </span>
              <button type="button" onClick={() => removeRoot(root)} aria-label={`Remove ${root}`} style={{ color: "var(--text-tertiary)" }}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <input
          value={newRoot}
          onChange={(e) => setNewRoot(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addRoot();
            }
          }}
          placeholder="/Users/you/Projects"
          aria-label="Add search root"
          className="text-data"
          style={{ flex: 1, padding: "var(--space-2) var(--space-3)", background: "var(--surface-panel)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        />
        <button
          type="button"
          onClick={addRoot}
          className="text-label"
          style={{ padding: "var(--space-2) var(--space-4)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
        >
          Add
        </button>
      </div>

      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={setRoots.isPending}
          className="text-label-lg"
          style={{ marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-4)", background: "var(--accent-copper)", color: "#0b0c0f", borderRadius: "var(--radius-sm)" }}
        >
          {setRoots.isPending ? "Saving…" : "Save changes"}
        </button>
      )}
    </section>
  );
}

function DiagnosticsSection() {
  const { data: capabilities } = usePlatformCapabilitiesQuery();
  const { data: scans } = useScansQuery(1);
  const latest = scans?.[0];

  return (
    <section>
      <h2 className="text-panel-title" style={{ margin: "0 0 var(--space-1)" }}>
        Diagnostics
      </h2>
      <p className="text-body-sm" style={{ margin: "0 0 var(--space-3)", color: "var(--text-tertiary)" }}>
        What this platform can report, and how the last scan's providers actually behaved.
      </p>

      {capabilities && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
            PLATFORM CAPABILITIES
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-1)" }}>
            {Object.entries(capabilities).map(([key, value]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)" }}>
                <StatusDot status={value ? "healthy" : "warning"} />
                <span className="text-body-sm" style={{ color: "var(--text-secondary)" }}>
                  {key.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
          LAST SCAN PROVIDERS
        </div>
        {!latest ? (
          <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            No scan run yet.
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            {latest.providers_run.map((p) => (
              <li
                key={p.provider_id}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)" }}
              >
                <StatusDot status={providerStatus(p)} />
                <span className="text-data-sm" style={{ flexShrink: 0, width: 160 }}>
                  {p.provider_id}
                </span>
                <span className="text-body-sm" style={{ color: "var(--text-tertiary)", flex: 1 }}>
                  {p.error ?? p.unavailable_reason ?? `${p.resources_found} resources · ${p.duration_ms}ms`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AboutSection() {
  const { data: info } = useSystemInfoQuery();

  return (
    <section>
      <h2 className="text-panel-title" style={{ margin: "0 0 var(--space-3)" }}>
        About
      </h2>
      {info && (
        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {[
            ["Hostname", info.hostname],
            ["OS", `${info.os} ${info.os_version}`],
            ["Architecture", info.architecture],
            ["CPU cores", String(info.cpu_cores)],
            ["Memory", formatBytes(info.total_memory_bytes)],
            ["Home directory", info.home_directory],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: "var(--space-3)" }}>
              <dt className="text-body-sm" style={{ width: 140, color: "var(--text-tertiary)", flexShrink: 0 }}>
                {label}
              </dt>
              <dd className="text-data-sm" style={{ margin: 0, color: "var(--text-primary)", overflowWrap: "anywhere" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-body-sm" style={{ marginTop: "var(--space-4)", color: "var(--text-tertiary)" }}>
        CodeAtlas is local-first: no telemetry, no account, no network access from the discovery engine. See
        PRIVACY.md and SECURITY.md in the repository for the full detail.
      </p>
    </section>
  );
}
