// A small, dependency-free force-directed layout: link + charge (repulsion)
// + collision + damping. DESIGN.md 5.1 requires the layout to *settle and
// stop* (converge in under ~800ms, no perpetual idle drift), not to run a
// full charting library — this is deliberately hand-rolled rather than
// pulling in d3-force, since the whole simulation is ~80 lines and the
// graph view needs canvas-drawn circles, nothing d3-force's DOM/SVG-shaped
// ecosystem provides beyond the math itself.

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fixed?: boolean;
}

export interface LayoutLink {
  source: string;
  target: string;
}

const CHARGE = -260;
const LINK_DISTANCE = 90;
const LINK_STRENGTH = 0.08;
const DAMPING = 0.82;
const CENTER_STRENGTH = 0.015;

export function stepSimulation(
  nodes: LayoutNode[],
  links: LayoutLink[],
  width: number,
  height: number,
): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cx = width / 2;
  const cy = height / 2;

  // Repulsion between every pair (O(n^2) — fine at the few-hundred-node
  // scale this app realistically hits; see DESIGN.md 5.1).
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 0.01) {
        dx = (Math.random() - 0.5) * 0.1;
        dy = (Math.random() - 0.5) * 0.1;
        distSq = 0.01;
      }
      const dist = Math.sqrt(distSq);
      const force = CHARGE / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.fixed) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (!b.fixed) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  // Spring attraction along edges.
  for (const link of links) {
    const a = byId.get(link.source);
    const b = byId.get(link.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const diff = (dist - LINK_DISTANCE) * LINK_STRENGTH;
    const fx = (dx / dist) * diff;
    const fy = (dy / dist) * diff;
    if (!a.fixed) {
      a.vx += fx;
      a.vy += fy;
    }
    if (!b.fixed) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  let totalMotion = 0;
  for (const n of nodes) {
    if (n.fixed) continue;
    // Weak pull toward center so disconnected components don't drift off.
    n.vx += (cx - n.x) * CENTER_STRENGTH;
    n.vy += (cy - n.y) * CENTER_STRENGTH;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    totalMotion += Math.abs(n.vx) + Math.abs(n.vy);
  }

  return totalMotion;
}

export function seedPositions(ids: string[], width: number, height: number): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 3;
  ids.forEach((id, i) => {
    const angle = (i / Math.max(1, ids.length)) * Math.PI * 2;
    positions.set(id, {
      x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
      y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
    });
  });
  return positions;
}
