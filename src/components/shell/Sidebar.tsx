import { useState } from "react";
import { NAV_ITEMS, useNavigation, type ViewId } from "../../state/navigation";
import { Icon, type IconName } from "../icons/Icon";
import type { ResourceKind } from "../../lib/types";

// Fixed sidebar, collapsible to icon-only — DESIGN.md 4.2. Active item gets
// accent-copper-wash background and a 2px accent-copper left rule, never a
// filled copper background. Each item's glyph stays text-secondary at rest
// and only picks up its resource-kind family hue in the active state
// (DESIGN.md 7) — sections with no natural single kind (Overview, Graph,
// Timeline, Search, Settings) tint copper instead, since copper is the
// product's own default "active" signal.
const ICON_MAP: Record<ViewId, { icon: IconName; kind?: ResourceKind }> = {
  overview: { icon: "scan" },
  projects: { icon: "project", kind: "project" },
  graph: { icon: "project" },
  processes: { icon: "process", kind: "process" },
  docker: { icon: "docker_container", kind: "docker_container" },
  runtimes: { icon: "package_manager", kind: "package_manager" },
  cleanup: { icon: "cache", kind: "cache" },
  timeline: { icon: "timeline" },
  search: { icon: "search" },
  settings: { icon: "settings" },
};

export function Sidebar() {
  const { view, navigate } = useNavigation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      aria-label="Primary"
      style={{
        width: collapsed ? 56 : 240,
        flexShrink: 0,
        background: "var(--surface-canvas)",
        borderRight: "1px solid var(--border-hairline)",
        display: "flex",
        flexDirection: "column",
        transition: "width 180ms ease-in-out",
        overflow: "hidden",
      }}
    >
      <ul style={{ listStyle: "none", margin: 0, padding: "var(--space-3) var(--space-2)", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          const { icon, kind } = ICON_MAP[item.id];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className="text-label-lg"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-2)",
                  marginBottom: 2,
                  borderRadius: "var(--radius-sm)",
                  background: active ? "var(--accent-copper-wash)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent-copper)" : "2px solid transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    color: active ? (kind ? `var(--kind-${kind})` : "var(--accent-copper)") : "var(--text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={icon} size={16} />
                </span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div style={{ padding: "var(--space-2)", borderTop: "1px solid var(--border-hairline)" }}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-label"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: "var(--space-2)",
            padding: "var(--space-2)",
            color: "var(--text-tertiary)",
          }}
        >
          <Icon name={collapsed ? "expand" : "collapse"} size={16} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </nav>
  );
}
