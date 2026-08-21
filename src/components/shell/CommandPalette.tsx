import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_ITEMS, useNavigation } from "../../state/navigation";
import { useGraphQuery, useRunScanMutation } from "../../lib/queries";
import { fuzzyFilter } from "../../lib/fuzzy";
import { Icon, type IconName } from "../icons/Icon";
import { kindLabel } from "../../lib/kind-colors";
import type { Resource } from "../../lib/types";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  group: "Actions" | "Navigate" | "Resources";
  run: () => void;
}

// The primary cross-cutting navigation device (DESIGN.md 4.3): Cmd/Ctrl+K,
// fully keyboard-driven, surface-overlay with the one permitted soft dark-
// mode shadow. Selected row gets a plain surface-panel wash — copper is
// reserved for actionable/destructive verbs, not selection state.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate, selectResource } = useNavigation();
  const { data: graph } = useGraphQuery();
  const runScan = useRunScanMutation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const close = (fn: () => void) => () => {
      fn();
      setOpen(false);
    };

    const actions: PaletteItem[] = [
      {
        id: "action:scan",
        label: "Run scan",
        hint: "⌘R",
        icon: "scan",
        group: "Actions",
        run: close(() => runScan.mutate(undefined)),
      },
      { id: "action:cleanup", label: "Open Cleanup Center", icon: "cache", group: "Actions", run: close(() => navigate("cleanup")) },
      { id: "action:changes", label: "View changes", icon: "timeline", group: "Actions", run: close(() => navigate("timeline")) },
      { id: "action:ports", label: "View ports & processes", icon: "port", group: "Actions", run: close(() => navigate("processes")) },
      { id: "action:docker", label: "View Docker resources", icon: "docker_container", group: "Actions", run: close(() => navigate("docker")) },
      { id: "action:settings", label: "Open settings", icon: "settings", group: "Actions", run: close(() => navigate("settings")) },
    ];

    const navItems: PaletteItem[] = NAV_ITEMS.map((item) => ({
      id: `nav:${item.id}`,
      label: `Go to ${item.label}`,
      icon: "chevron-right",
      group: "Navigate",
      run: close(() => navigate(item.id)),
    }));

    const resources: PaletteItem[] = Object.values(graph?.resources ?? {}).map((resource: Resource) => ({
      id: `resource:${resource.id}`,
      label: resource.name,
      hint: resource.path ?? kindLabel(resource.kind),
      icon: resource.kind,
      group: "Resources",
      run: close(() => {
        selectResource(resource.id);
        if (resource.kind === "project") navigate("projects", { projectId: resource.id });
        else navigate("graph", { focus: resource.id });
      }),
    }));

    return [...actions, ...navItems, ...resources];
  }, [graph, navigate, selectResource, runScan]);

  const filtered = useMemo(() => {
    const results = fuzzyFilter(items, query, (item) => `${item.label} ${item.hint ?? ""}`);
    return results.map((r) => r.item);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.run();
    }
  }

  let runningIndex = -1;
  let lastGroup: string | null = null;

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 5, 6, 0.5)",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        paddingTop: "20vh",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "min(60vh, 480px)",
          background: "var(--surface-overlay)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--palette-shadow-overlay)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-hairline)" }}>
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Run a command or jump to a resource…"
            aria-label="Command palette input"
            aria-activedescendant={filtered[activeIndex] ? `palette-item-${filtered[activeIndex].id}` : undefined}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-listbox"
            className="text-body"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none" }}
          />
        </div>
        <div id="palette-listbox" role="listbox" style={{ overflowY: "auto", padding: "var(--space-2)" }}>
          {filtered.length === 0 && (
            <div className="text-body-sm" style={{ padding: "var(--space-4)", color: "var(--text-tertiary)" }}>
              No matches.
            </div>
          )}
          {filtered.map((item) => {
            runningIndex++;
            const index = runningIndex;
            const showGroupLabel = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroupLabel && (
                  <div className="text-caption" style={{ padding: "var(--space-2) var(--space-2) var(--space-1)", color: "var(--text-tertiary)" }}>
                    {item.group.toUpperCase()}
                  </div>
                )}
                <button
                  id={`palette-item-${item.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => item.run()}
                  style={{
                    width: "100%",
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "0 var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    background: index === activeIndex ? "var(--surface-panel)" : "transparent",
                    color: "var(--text-primary)",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="text-label-lg" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>
                  {item.hint && (
                    <span className="text-data-sm" style={{ color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      {item.hint}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
