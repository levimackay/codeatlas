import { useCallback, useRef, useState } from "react";
import { useNavigation } from "../../state/navigation";
import { useGraphQuery } from "../../lib/queries";
import { Icon } from "../icons/Icon";
import { KindBadge } from "../ui/KindBadge";
import { formatAbsoluteTime, formatRelativeTime } from "../../lib/format";
import { neighborResources } from "../../lib/graph-utils";
import { kindLabel } from "../../lib/kind-colors";

const MIN_WIDTH = 320;
const MAX_WIDTH = 520;

// The single most important density decision in the product (DESIGN.md
// 4.2/4.4): hover-then-click for detail, never a modal, never a separate
// route. Renders the full Resource record — name, kind badge, path,
// every attributes entry as a mono key/value list, and Evidence[].
export function DetailPane() {
  const { selectedResourceId, detailPaneOpen, closeDetailPane, selectResource, navigate } = useNavigation();
  const { data: graph } = useGraphQuery();
  const [width, setWidth] = useState(380);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      dragState.current = { startX: e.clientX, startWidth: width };
      const onMove = (ev: PointerEvent) => {
        if (!dragState.current) return;
        const delta = dragState.current.startX - ev.clientX;
        setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragState.current.startWidth + delta)));
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width],
  );

  if (!detailPaneOpen || !selectedResourceId || !graph) return null;
  const resource = graph.resources[selectedResourceId];
  if (!resource) return null;

  const neighbors = neighborResources(graph, resource.id);

  return (
    <aside
      aria-label={`${resource.name} detail`}
      style={{
        width,
        flexShrink: 0,
        display: "flex",
        background: "var(--surface-panel)",
        borderLeft: "1px solid var(--border-hairline)",
        position: "relative",
        transition: dragState.current ? "none" : "width 180ms ease-in-out",
      }}
    >
      <div
        onPointerDown={onDragStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize detail pane"
        style={{
          position: "absolute",
          left: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: "col-resize",
          zIndex: 1,
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--border-hairline)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="text-panel-title" style={{ overflowWrap: "break-word" }}>
              {resource.name}
            </div>
            <div style={{ marginTop: "var(--space-2)" }}>
              <KindBadge kind={resource.kind} />
            </div>
          </div>
          <button type="button" onClick={closeDetailPane} aria-label="Close detail pane" style={{ color: "var(--text-tertiary)" }}>
            <Icon name="close" size={16} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {resource.path && (
            <section>
              <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>
                PATH
              </div>
              <div className="text-data" style={{ overflowWrap: "anywhere", color: "var(--text-primary)" }}>
                {resource.path}
              </div>
            </section>
          )}

          <section>
            <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>
              SEEN
            </div>
            <div className="text-data-sm" style={{ color: "var(--text-secondary)" }}>
              First: {formatAbsoluteTime(resource.first_seen)}
              <br />
              Last: {formatRelativeTime(resource.last_seen)} ({formatAbsoluteTime(resource.last_seen)})
            </div>
          </section>

          {Object.keys(resource.attributes).length > 0 && (
            <section>
              <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                ATTRIBUTES
              </div>
              <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                {Object.entries(resource.attributes).map(([key, value]) => (
                  <div key={key} style={{ display: "flex", gap: "var(--space-2)", alignItems: "baseline" }}>
                    <dt className="text-data-sm" style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {key}
                    </dt>
                    <dd className="text-data-sm" style={{ margin: 0, color: "var(--text-primary)", overflowWrap: "anywhere" }}>
                      {typeof value === "string" ? value : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {resource.evidence.length > 0 && (
            <section>
              <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                EVIDENCE
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {resource.evidence.map((ev, i) => (
                  <li key={i} style={{ borderLeft: "2px solid var(--border-hairline-strong)", paddingLeft: "var(--space-2)" }}>
                    <div className="text-label" style={{ color: "var(--text-secondary)" }}>
                      {ev.source}
                    </div>
                    <div className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
                      {ev.description}
                    </div>
                    {ev.path && (
                      <div className="text-data-sm" style={{ color: "var(--text-tertiary)", overflowWrap: "anywhere" }}>
                        {ev.path}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {neighbors.length > 0 && (
            <section>
              <div className="text-label" style={{ color: "var(--text-tertiary)", marginBottom: "var(--space-2)" }}>
                RELATED ({neighbors.length})
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                {neighbors.slice(0, 30).map(({ resource: n, edge }) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => selectResource(n.id)}
                      className="text-body-sm"
                      style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", width: "100%", padding: "var(--space-1) 0", textAlign: "left", color: "var(--text-secondary)" }}
                    >
                      <Icon name={n.kind} size={16} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{n.name}</span>
                      <span className="text-caption" style={{ color: "var(--text-tertiary)" }}>
                        {edge.direction === "outgoing" ? edge.relationship.kind : `${edge.relationship.kind} ←`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resource.kind === "project" && (
            <button
              type="button"
              className="text-label-lg"
              onClick={() => navigate("projects", { projectId: resource.id })}
              style={{
                marginTop: "auto",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-hairline-strong)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-1)",
              }}
            >
              Open in Projects <Icon name="chevron-right" size={16} />
            </button>
          )}
          <div className="text-label-lg" style={{ color: kindLabel(resource.kind) ? undefined : undefined }} />
        </div>
      </div>
    </aside>
  );
}
