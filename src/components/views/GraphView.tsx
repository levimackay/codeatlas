import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphQuery } from "../../lib/queries";
import { useNavigation } from "../../state/navigation";
import { useTheme } from "../../state/theme";
import { KIND_FAMILIES, kindColor, kindFamily } from "../../lib/kind-colors";
import { degreeOf } from "../../lib/graph-utils";
import { seedPositions, stepSimulation, type LayoutLink, type LayoutNode } from "../../lib/force-layout";
import { fuzzyMatch } from "../../lib/fuzzy";
import { Icon } from "../icons/Icon";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const LABEL_ZOOM_THRESHOLD = 0.8;
// Above this many nodes, labeling everything produces an unreadable
// hairball (confirmed against a real 1449-node scan of a real machine)
// rather than the precise, legible readout DESIGN.md calls for. Past
// this density, only the hovered/selected/focused node and its immediate
// neighborhood (and any active search match) get a label; panning in and
// interacting is how you read a dense graph, not a wall of overlapping text.
const LABEL_DENSE_THRESHOLD = 80;
const MOTION_EPSILON = 0.6;
const MAX_SIM_TICKS = 240; // ~800ms-ish at a 60fps rAF cadence, per DESIGN.md 5.1

interface Transform {
  x: number;
  y: number;
  k: number;
}

// Canvas-rendered dependency graph — DESIGN.md section 5. Deliberately not
// a DOM-per-node library: the graph can realistically carry several
// hundred nodes, and DESIGN.md is explicit that density is the reason for
// canvas rendering. Node positions live in a ref (mutated imperatively by
// the simulation and drawn each frame) rather than React state, since
// re-rendering the component 60 times/sec to update a handful of circles
// would be the wrong tool for this job.
export function GraphView() {
  const { data: graph, isLoading } = useGraphQuery();
  const { selectedResourceId, selectResource } = useNavigation();
  const { theme } = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Map<string, LayoutNode>>(new Map());
  const linksRef = useRef<LayoutLink[]>([]);
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const sizeRef = useRef({ width: 800, height: 600 });
  const animFrameRef = useRef<number | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const topologyKeyRef = useRef<string>("");

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ x: number; y: number; label: string } | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [hiddenFamilies, setHiddenFamilies] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState("");
  const [zoomLabel, setZoomLabel] = useState("100%");

  const relevantResources = useMemo(() => {
    if (!graph) return [];
    // Only kinds that make sense as graph nodes — everything in the
    // resource map, since the graph view's whole job is to show all of it.
    return Object.values(graph.resources);
  }, [graph]);

  // Mirrors the same filter the topology effect below applies when it
  // builds `linksRef.current` (a ref, so reading its `.length` directly in
  // JSX shows a stale count until some unrelated state update happens to
  // trigger a re-render afterward — confirmed stuck at "0 edges" in a real
  // capture). This is real React state driven off the query result
  // instead, so the footer stat is correct on the very first paint.
  const edgeCount = useMemo(() => {
    if (!graph) return 0;
    return graph.relationships.filter((r) => graph.resources[r.from] && graph.resources[r.to]).length;
  }, [graph]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !graph) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = sizeRef.current;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface-content").trim() || "#131519";
    ctx.fillRect(0, 0, width, height);

    const t = transformRef.current;
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    // Faint fixed-position crosshair at canvas center — a re-center
    // affordance target, not decoration (DESIGN.md 5.1).
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1 / t.k;
    ctx.beginPath();
    ctx.moveTo(cx - 16 / t.k, cy);
    ctx.lineTo(cx + 16 / t.k, cy);
    ctx.moveTo(cx, cy - 16 / t.k);
    ctx.lineTo(cx, cy + 16 / t.k);
    ctx.stroke();

    const nodes = nodesRef.current;
    const focusSet = focusNodeId
      ? new Set([focusNodeId, ...linksRef.current.filter((l) => l.source === focusNodeId || l.target === focusNodeId).map((l) => (l.source === focusNodeId ? l.target : l.source))])
      : null;

    const selectedEdges = selectedResourceId
      ? new Set(linksRef.current.filter((l) => l.source === selectedResourceId || l.target === selectedResourceId).map((l) => `${l.source}->${l.target}`))
      : null;

    const hairline = getComputedStyle(document.documentElement).getPropertyValue("--border-hairline-strong").trim() || "#383c44";

    // Edges first, under nodes.
    for (const link of linksRef.current) {
      const a = nodes.get(link.source);
      const b = nodes.get(link.target);
      if (!a || !b) continue;
      const isSelected = selectedEdges?.has(`${link.source}->${link.target}`);
      const inFocus = !focusSet || (focusSet.has(link.source) && focusSet.has(link.target));

      let alpha = inFocus ? 1 : 0.08;
      let color = hairline;
      let width_ = 1;
      if (isSelected) {
        color = "#C4783E";
        alpha = 0.7;
        width_ = 1.5;
      } else if (selectedEdges && selectedEdges.size > 0) {
        alpha = Math.min(alpha, 0.08);
      }

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width_ / t.k;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Arrowhead at the `to` end only.
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const arrowLen = 4 / t.k;
      const edgeX = b.x - Math.cos(angle) * b.radius;
      const edgeY = b.y - Math.sin(angle) * b.radius;
      ctx.beginPath();
      ctx.moveTo(edgeX, edgeY);
      ctx.lineTo(edgeX - arrowLen * Math.cos(angle - Math.PI / 6), edgeY - arrowLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(edgeX - arrowLen * Math.cos(angle + Math.PI / 6), edgeY - arrowLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Nodes.
    const query = filterQuery.trim();
    const showAllLabels = relevantResources.length <= LABEL_DENSE_THRESHOLD;
    const focusSetIsLabelable = !!focusSet && focusSet.size <= LABEL_DENSE_THRESHOLD;
    for (const resource of relevantResources) {
      const node = nodes.get(resource.id);
      if (!node) continue;
      const family = kindFamily(resource.kind);
      const familyHidden = hiddenFamilies.has(family);
      const matchesFilter = !query || fuzzyMatch(query, resource.name) !== null;
      const inFocus = !focusSet || focusSet.has(resource.id);

      let alpha = 1;
      if (familyHidden) alpha = 0.06;
      if (!matchesFilter) alpha = Math.min(alpha, 0.15);
      if (!inFocus) alpha = Math.min(alpha, 0.2);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = kindColor(resource.kind, theme);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();

      const isSelected = selectedResourceId === resource.id;
      const isHovered = hoveredNodeId === resource.id;
      if (isSelected || isHovered) {
        ctx.globalAlpha = isSelected ? 1 : 0.5;
        ctx.strokeStyle = "#C4783E";
        ctx.lineWidth = 2 / t.k;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      const shouldLabel =
        showAllLabels ||
        isSelected ||
        isHovered ||
        (query !== "" && matchesFilter) ||
        (focusSetIsLabelable && inFocus);

      if (t.k >= LABEL_ZOOM_THRESHOLD && alpha > 0.5 && shouldLabel) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim() || "#EDEEF0";
        ctx.font = `${11.5 / t.k}px "Berkeley Mono", "Commit Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(resource.name, node.x, node.y + node.radius + 4 / t.k);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }, [graph, relevantResources, theme, selectedResourceId, hoveredNodeId, focusNodeId, hiddenFamilies, filterQuery]);

  const stopSim = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const runSimulation = useCallback(() => {
    stopSim();
    let ticks = 0;
    function tick() {
      const nodes = [...nodesRef.current.values()];
      const motion = stepSimulation(nodes, linksRef.current, sizeRef.current.width, sizeRef.current.height);
      draw();
      ticks++;
      if (motion > MOTION_EPSILON && ticks < MAX_SIM_TICKS) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, [draw, stopSim]);

  // (Re)seed the layout only when the graph's topology actually changed —
  // DESIGN.md 5.1: re-run the simulation on a topology change or an
  // explicit re-layout action, never idle-drift.
  useEffect(() => {
    if (!graph) return;
    const ids = Object.keys(graph.resources).sort();
    const key = `${ids.join(",")}|${graph.relationships.length}`;
    if (key === topologyKeyRef.current) return;
    topologyKeyRef.current = key;

    const existing = nodesRef.current;
    const { width, height } = sizeRef.current;
    const seeded = seedPositions(
      ids.filter((id) => !existing.has(id)),
      width,
      height,
    );
    const nextNodes = new Map<string, LayoutNode>();
    for (const id of ids) {
      const prior = existing.get(id);
      const resource = graph.resources[id];
      const degree = degreeOf(graph, id);
      const radius = Math.min(22, Math.max(6, 6 + degree * 1.6));
      if (prior) {
        nextNodes.set(id, { ...prior, radius });
      } else {
        const pos = seeded.get(id) ?? { x: width / 2, y: height / 2 };
        nextNodes.set(id, { id, x: pos.x, y: pos.y, vx: 0, vy: 0, radius });
      }
      void resource;
    }
    nodesRef.current = nextNodes;
    linksRef.current = graph.relationships
      .filter((r) => graph.resources[r.from] && graph.resources[r.to])
      .map((r) => ({ source: r.from, target: r.to }));

    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Resize observer keeps the canvas backing store in sync with layout.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { width, height };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  function toCanvasPoint(e: React.MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = transformRef.current;
    return { x: (e.clientX - rect.left - t.x) / t.k, y: (e.clientY - rect.top - t.y) / t.k };
  }

  function hitTestNode(x: number, y: number): string | null {
    for (const [id, node] of nodesRef.current) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= (node.radius + 3) * (node.radius + 3)) return id;
    }
    return null;
  }

  function hitTestEdge(x: number, y: number): { link: LayoutLink; midX: number; midY: number } | null {
    const threshold = 6 / transformRef.current.k;
    for (const link of linksRef.current) {
      const a = nodesRef.current.get(link.source);
      const b = nodesRef.current.get(link.target);
      if (!a || !b) continue;
      const distSq = distanceToSegmentSq(x, y, a.x, a.y, b.x, b.y);
      if (distSq <= threshold * threshold) {
        return { link, midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
      }
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTx: transformRef.current.x, startTy: transformRef.current.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      transformRef.current = { ...transformRef.current, x: dragRef.current.startTx + dx, y: dragRef.current.startTy + dy };
      draw();
      return;
    }
    const p = toCanvasPoint(e);
    const nodeId = hitTestNode(p.x, p.y);
    if (nodeId !== hoveredNodeId) setHoveredNodeId(nodeId);
    if (!nodeId) {
      const edgeHit = hitTestEdge(p.x, p.y);
      if (edgeHit) {
        const rel = graph?.relationships.find((r) => r.from === edgeHit.link.source && r.to === edgeHit.link.target);
        const t = transformRef.current;
        setHoveredEdge({ x: edgeHit.midX * t.k + t.x, y: edgeHit.midY * t.k + t.y, label: rel?.kind ?? "" });
      } else if (hoveredEdge) {
        setHoveredEdge(null);
      }
    } else if (hoveredEdge) {
      setHoveredEdge(null);
    }
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onClick(e: React.MouseEvent) {
    const p = toCanvasPoint(e);
    const nodeId = hitTestNode(p.x, p.y);
    selectResource(nodeId);
  }

  function onDoubleClick(e: React.MouseEvent) {
    const p = toCanvasPoint(e);
    const nodeId = hitTestNode(p.x, p.y);
    setFocusNodeId((current) => (current === nodeId ? null : nodeId));
    if (nodeId) selectResource(nodeId);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const t = transformRef.current;
    const factor = Math.exp(-e.deltaY * 0.001);
    const nextK = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.k * factor));
    const worldX = (px - t.x) / t.k;
    const worldY = (py - t.y) / t.k;
    transformRef.current = { k: nextK, x: px - worldX * nextK, y: py - worldY * nextK };
    setZoomLabel(`${Math.round(nextK * 100)}%`);
    draw();
  }

  useEffect(() => {
    draw();
  }, [draw]);

  const legendChips = KIND_FAMILIES;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-6)" }}>
        <h1 className="text-display" style={{ margin: 0 }}>
          Dependency Graph
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginLeft: "auto" }}>
          <Icon name="search" size={16} />
          <input
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter nodes by name…"
            aria-label="Filter graph nodes"
            className="text-body-sm"
            style={{ padding: "var(--space-1) var(--space-2)", background: "var(--surface-panel)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", width: 220 }}
          />
          <button
            type="button"
            onClick={() => {
              setFocusNodeId(null);
              transformRef.current = { x: 0, y: 0, k: 1 };
              setZoomLabel("100%");
              draw();
            }}
            className="text-label"
            style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={runSimulation}
            className="text-label"
            style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--border-hairline-strong)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
          >
            Re-layout
          </button>
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {isLoading ? (
          <div className="text-body-sm" style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>
            Loading…
          </div>
        ) : relevantResources.length === 0 ? (
          <div className="text-body-sm" style={{ padding: "var(--space-6)", color: "var(--text-tertiary)" }}>
            No resources to graph yet. Run a scan first.
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Dependency graph canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onWheel={onWheel}
            style={{ display: "block", width: "100%", height: "100%", cursor: dragRef.current ? "grabbing" : "grab" }}
          />
        )}

        {hoveredEdge && (
          <div
            className="text-caption text-data-sm"
            style={{
              position: "absolute",
              left: hoveredEdge.x,
              top: hoveredEdge.y,
              transform: "translate(-50%, -140%)",
              background: "var(--surface-overlay)",
              border: "1px solid var(--border-hairline)",
              borderRadius: "var(--radius-sm)",
              padding: "2px 8px",
              pointerEvents: "none",
              fontFamily: "var(--font-data)",
            }}
          >
            {hoveredEdge.label}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-4)",
            background: "var(--surface-content)",
            borderTop: "1px solid var(--border-hairline)",
            flexWrap: "wrap",
          }}
        >
          {legendChips.map((family) => {
            const hidden = hiddenFamilies.has(family.id);
            return (
              <button
                key={family.id}
                type="button"
                onClick={() =>
                  setHiddenFamilies((prev) => {
                    const next = new Set(prev);
                    if (next.has(family.id)) next.delete(family.id);
                    else next.add(family.id);
                    return next;
                  })
                }
                className="text-caption"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border-hairline-strong)",
                  opacity: hidden ? 0.4 : 1,
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: kindColor(family.kinds[0], theme), display: "inline-block" }} />
                {family.label}
              </button>
            );
          })}
          <span className="text-data-sm" style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}>
            {relevantResources.length} nodes · {edgeCount} edges · {zoomLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function distanceToSegmentSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy;
}
