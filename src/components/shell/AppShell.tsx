import { Suspense, lazy } from "react";
import { useNavigation } from "../../state/navigation";
import { useRunScanMutation } from "../../lib/queries";
import { Sidebar } from "./Sidebar";
import { StatusStrip } from "./StatusStrip";
import { DetailPane } from "./DetailPane";
import { CommandPalette } from "./CommandPalette";
import { Icon } from "../icons/Icon";
import { useTheme } from "../../state/theme";

const Overview = lazy(() => import("../views/Overview").then((m) => ({ default: m.Overview })));
const Projects = lazy(() => import("../views/Projects").then((m) => ({ default: m.Projects })));
const GraphView = lazy(() => import("../views/GraphView").then((m) => ({ default: m.GraphView })));
const ProcessesPorts = lazy(() => import("../views/ProcessesPorts").then((m) => ({ default: m.ProcessesPorts })));
const Docker = lazy(() => import("../views/Docker").then((m) => ({ default: m.Docker })));
const Runtimes = lazy(() => import("../views/Runtimes").then((m) => ({ default: m.Runtimes })));
const Cleanup = lazy(() => import("../views/Cleanup").then((m) => ({ default: m.Cleanup })));
const Timeline = lazy(() => import("../views/Timeline").then((m) => ({ default: m.Timeline })));
const SearchView = lazy(() => import("../views/Search").then((m) => ({ default: m.SearchView })));
const Settings = lazy(() => import("../views/Settings").then((m) => ({ default: m.Settings })));

function ViewSwitch() {
  const { view } = useNavigation();
  switch (view) {
    case "overview":
      return <Overview />;
    case "projects":
      return <Projects />;
    case "graph":
      return <GraphView />;
    case "processes":
      return <ProcessesPorts />;
    case "docker":
      return <Docker />;
    case "runtimes":
      return <Runtimes />;
    case "cleanup":
      return <Cleanup />;
    case "timeline":
      return <Timeline />;
    case "search":
      return <SearchView />;
    case "settings":
      return <Settings />;
    default:
      return null;
  }
}

// Application shell — DESIGN.md 4.2: ⌘K bar / sidebar / workspace / detail
// pane / status strip. Panel transitions cross-fade + shift 4px per
// DESIGN.md 6; keyed on `view` so switching sidebar sections replays it.
export function AppShell() {
  const { view } = useNavigation();
  const runScan = useRunScanMutation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface-content)", color: "var(--text-primary)" }}>
      <header
        data-tauri-drag-region
        style={{
          height: 40,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "0 var(--space-3)",
          background: "var(--surface-canvas)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <div className="text-label-lg" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--accent-copper)", marginLeft: 64 }}>
          <Icon name="project" size={16} />
          CodeAtlas
        </div>
        <button
          type="button"
          onClick={() => runScan.mutate(undefined)}
          disabled={runScan.isPending}
          className="text-label"
          style={{
            marginLeft: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "var(--space-1) var(--space-2)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-hairline-strong)",
            color: runScan.isPending ? "var(--text-disabled)" : "var(--text-secondary)",
          }}
        >
          <Icon name="scan" size={16} />
          {runScan.isPending ? "Scanning…" : "Run scan"}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="text-label"
          style={{ marginLeft: "auto", color: "var(--text-tertiary)", padding: "var(--space-1) var(--space-2)" }}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <span className="text-data-sm" style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="command" size={16} />K
        </span>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <main
          key={view}
          className="view-enter"
          style={{ flex: 1, minWidth: 480, overflow: "auto", background: "var(--surface-content)" }}
        >
          <Suspense fallback={<div className="text-body-sm" style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>Loading…</div>}>
            <ViewSwitch />
          </Suspense>
        </main>
        <DetailPane />
      </div>

      <StatusStrip scanning={runScan.isPending} />
      <CommandPalette />
    </div>
  );
}
