// The site's real interactive dependency graph demo. Ports the app's own
// force-directed layout (src/lib/force-layout.ts) and kind-color mapping
// (src/lib/kind-colors.ts) unmodified, and follows the canvas/node/edge
// rendering rules from the app's own DESIGN.md sections 5.1-5.3: force
// layout settles under ~800ms then stops simulating, nodes are filled
// circles sized by degree, edges are neutral until hover/selection reveals
// a copper highlight on direct edges and dims everything else to 8%.
//
// Fed entirely by the synthetic sample fixture in src/data/sample-fixture.ts
// — never real data, and every mount of this component is paired with a
// visible "sample data" label in the surrounding markup.

import { kindColor, kindFamily, kindLabel, KIND_FAMILIES } from "../lib/kind-colors";
import { seedPositions, stepSimulation, type LayoutLink, type LayoutNode } from "../lib/force-layout";
import type { Relationship, Resource } from "../lib/types";

interface GraphDemoOptions {
  crosshair?: boolean;
  legend?: HTMLElement | null;
  countsEl?: HTMLElement | null;
  liveRegion?: HTMLElement | null;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class GraphDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: LayoutNode[] = [];
  private links: LayoutLink[] = [];
  private resourceById = new Map<string, Resource>();
  private degree = new Map<string, number>();
  private width = 0;
  private height = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  private scale = 1;
  private panX = 0;
  private panY = 0;

  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private hiddenFamilies = new Set<string>();

  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };

  private simRunning = true;
  private simStart = 0;
  private ro: ResizeObserver;
  private opts: GraphDemoOptions;

  constructor(
    canvas: HTMLCanvasElement,
    resources: Resource[],
    relationships: Relationship[],
    opts: GraphDemoOptions = {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.opts = opts;

    for (const r of resources) this.resourceById.set(r.id, r);
    this.links = relationships
      .filter((rel) => this.resourceById.has(rel.from) && this.resourceById.has(rel.to))
      .map((rel) => ({ source: rel.from, target: rel.to }));

    for (const l of this.links) {
      this.degree.set(l.source, (this.degree.get(l.source) ?? 0) + 1);
      this.degree.set(l.target, (this.degree.get(l.target) ?? 0) + 1);
    }

    this.canvas.setAttribute("tabindex", "0");
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute(
      "aria-label",
      `Dependency graph, sample data. ${resources.length} resources, ${this.links.length} relationships. Use the list below for a keyboard-accessible view.`,
    );

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    this.resize();
    this.seed(resources.map((r) => r.id));

    this.bindEvents();
    if (this.opts.legend) this.bindLegend(this.opts.legend);
    this.renderCounts();

    if (prefersReducedMotion()) {
      for (let i = 0; i < 200; i++) stepSimulation(this.nodes, this.links, this.width, this.height);
      this.simRunning = false;
      this.draw();
    } else {
      this.simStart = performance.now();
      requestAnimationFrame(this.tick);
    }
  }

  private seed(ids: string[]) {
    const pos = seedPositions(ids, this.width || 600, this.height || 400);
    this.nodes = ids.map((id) => {
      const p = pos.get(id)!;
      const deg = this.degree.get(id) ?? 0;
      const radius = 6 + Math.min(16, deg * 2.5);
      return { id, x: p.x, y: p.y, vx: 0, vy: 0, radius };
    });
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.simRunning) this.draw();
  }

  private tick = (now: number) => {
    const motion = stepSimulation(this.nodes, this.links, this.width, this.height);
    this.draw();
    const elapsed = now - this.simStart;
    if (elapsed < 800 && motion > 0.6) {
      requestAnimationFrame(this.tick);
    } else {
      this.simRunning = false;
    }
  };

  private toWorld(x: number, y: number) {
    return { x: (x - this.panX) / this.scale, y: (y - this.panY) / this.scale };
  }

  private nodeAt(clientX: number, clientY: number): LayoutNode | null {
    const rect = this.canvas.getBoundingClientRect();
    const local = this.toWorld(clientX - rect.left, clientY - rect.top);
    let best: LayoutNode | null = null;
    let bestDist = Infinity;
    for (const n of this.nodes) {
      const dx = n.x - local.x;
      const dy = n.y - local.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= n.radius + 6 && d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    return best;
  }

  private bindEvents() {
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.dragging) {
        this.panX = this.panStart.x + (e.clientX - this.dragStart.x);
        this.panY = this.panStart.y + (e.clientY - this.dragStart.y);
        this.draw();
        return;
      }
      const n = this.nodeAt(e.clientX, e.clientY);
      const id = n?.id ?? null;
      if (id !== this.hoveredId) {
        this.hoveredId = id;
        this.canvas.style.cursor = id ? "pointer" : "grab";
        this.draw();
      }
    });
    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredId = null;
      this.draw();
    });
    this.canvas.addEventListener("mousedown", (e) => {
      const n = this.nodeAt(e.clientX, e.clientY);
      if (n) {
        this.selectNode(n.id);
        return;
      }
      this.dragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.panStart = { x: this.panX, y: this.panY };
    });
    window.addEventListener("mouseup", () => {
      this.dragging = false;
    });
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const before = this.toWorld(cx, cy);
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale = Math.max(0.25, Math.min(4, this.scale * delta));
        const after = this.toWorld(cx, cy);
        this.panX += (after.x - before.x) * this.scale;
        this.panY += (after.y - before.y) * this.scale;
        this.draw();
      },
      { passive: false },
    );
    this.canvas.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const ids = this.nodes.map((n) => n.id);
        let idx = this.selectedId ? ids.indexOf(this.selectedId) : -1;
        idx = e.key === "ArrowRight" ? (idx + 1) % ids.length : (idx - 1 + ids.length) % ids.length;
        this.selectNode(ids[idx]);
      } else if (e.key === "Escape") {
        this.selectedId = null;
        this.draw();
        this.announce("Selection cleared.");
      }
    });
  }

  private bindLegend(legend: HTMLElement) {
    for (const family of KIND_FAMILIES) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "legend-chip";
      chip.setAttribute("aria-pressed", "true");
      const inFixture = family.kinds.some((k) =>
        Array.from(this.resourceById.values()).some((r) => r.kind === k),
      );
      if (!inFixture) continue;
      const dot = document.createElement("span");
      dot.className = "kind-dot";
      dot.style.background = kindColor(family.kinds[0], "dark");
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(family.label));
      chip.addEventListener("click", () => {
        const pressed = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", pressed ? "false" : "true");
        if (pressed) this.hiddenFamilies.add(family.id);
        else this.hiddenFamilies.delete(family.id);
        this.draw();
      });
      legend.appendChild(chip);
    }
  }

  private renderCounts() {
    if (this.opts.countsEl) {
      this.opts.countsEl.textContent = `${this.nodes.length} nodes · ${this.links.length} edges · ${Math.round(this.scale * 100)}%`;
    }
  }

  private selectNode(id: string) {
    this.selectedId = this.selectedId === id ? null : id;
    this.draw();
    if (this.selectedId) {
      const r = this.resourceById.get(this.selectedId);
      if (r) this.announce(`Selected ${kindLabel(r.kind)}: ${r.name}.`);
    }
  }

  private announce(msg: string) {
    if (this.opts.liveRegion) this.opts.liveRegion.textContent = msg;
  }

  private draw() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    if (this.opts.crosshair) {
      ctx.save();
      ctx.strokeStyle = "rgba(237,238,240,0.35)";
      ctx.lineWidth = 1;
      const cx = width / 2 + this.panX * 0 + 0;
      const cy = height / 2;
      ctx.globalAlpha = 0.04;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy);
      ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx, cy + 16);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    const activeId = this.selectedId ?? this.hoveredId;
    const byId = new Map(this.nodes.map((n) => [n.id, n]));

    // edges
    for (const link of this.links) {
      const a = byId.get(link.source);
      const b = byId.get(link.target);
      if (!a || !b) continue;
      const ra = this.resourceById.get(link.source);
      const rb = this.resourceById.get(link.target);
      if (ra && this.hiddenFamilies.has(kindFamily(ra.kind))) continue;
      if (rb && this.hiddenFamilies.has(kindFamily(rb.kind))) continue;

      const touchesActive = activeId && (link.source === activeId || link.target === activeId);
      let alpha = 1;
      let color = "#383c44";
      if (activeId) {
        if (touchesActive) {
          color = "#c4783e";
          alpha = 0.7;
        } else {
          alpha = 0.08;
        }
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // arrowhead at target
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const ah = 4;
      const tx = b.x - Math.cos(angle) * (b.radius + 2);
      const ty = b.y - Math.sin(angle) * (b.radius + 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - ah * Math.cos(angle - 0.4), ty - ah * Math.sin(angle - 0.4));
      ctx.lineTo(tx - ah * Math.cos(angle + 0.4), ty - ah * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // nodes
    const showLabels = this.scale >= 0.8;
    for (const n of this.nodes) {
      const r = this.resourceById.get(n.id);
      if (!r) continue;
      if (this.hiddenFamilies.has(kindFamily(r.kind))) continue;
      const dimmed = activeId && activeId !== n.id && !this.links.some(
        (l) => (l.source === activeId && l.target === n.id) || (l.target === activeId && l.source === n.id),
      );
      ctx.globalAlpha = activeId ? (dimmed ? 0.35 : 1) : 1;
      ctx.fillStyle = kindColor(r.kind, "dark");
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();

      if (n.id === this.selectedId) {
        ctx.strokeStyle = "#c4783e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (n.id === this.hoveredId) {
        ctx.strokeStyle = "rgba(196,120,62,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showLabels) {
        ctx.globalAlpha = activeId && dimmed ? 0.35 : 1;
        ctx.fillStyle = "#edeef0";
        ctx.font = "11px 'Commit Mono', ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(r.name, n.x, n.y + n.radius + 12);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    this.renderCounts();
  }

  destroy() {
    this.ro.disconnect();
  }
}
