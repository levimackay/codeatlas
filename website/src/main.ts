import "./style.css";
import { GraphDemo } from "./demos/graph-demo";
import { resources, relationships } from "./data/sample-fixture";

// ---------------------------------------------------------------------
// Rail: scrollspy (active section) + scroll progress. Mirrors the app's
// own status-strip/active-nav-item mechanism (root DESIGN.md 4.2), the
// site's persistent-orientation-device set piece.
// ---------------------------------------------------------------------
function initRail() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".rail__link"));
  const sections = links
    .map((link) => {
      const id = link.getAttribute("href")?.slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { link, el } : null;
    })
    .filter((x): x is { link: HTMLAnchorElement; el: HTMLElement } => x !== null);

  const mobileCurrent = document.querySelector<HTMLElement>(".rail__mobile-current-name");
  const progressFill = document.querySelector<HTMLElement>(".rail__progress-fill");

  function setActive(index: number) {
    sections.forEach(({ link }, i) => {
      const item = link.closest(".rail__item");
      if (!item) return;
      item.classList.toggle("rail__item--active", i === index);
      link.setAttribute("aria-current", i === index ? "true" : "false");
    });
    if (mobileCurrent && sections[index]) {
      mobileCurrent.textContent = sections[index].link.dataset.shortName ?? "";
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const idx = sections.findIndex((s) => s.el === entry.target);
        if (idx !== -1) setActive(idx);
      }
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
  );
  sections.forEach(({ el }) => observer.observe(el));
  if (sections.length) setActive(0);

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? doc.scrollTop / max : 0;
    if (progressFill) {
      progressFill.style.transform =
        window.innerWidth < 900 ? `scaleX(${progress})` : `scaleY(${progress})`;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

// ---------------------------------------------------------------------
// Graph demos: hero mini graph (subset centered on api-gateway) and the
// full-bleed section 4 demo (the whole sample fixture). Both fed by the
// same synthetic fixture, both labeled "sample data" in the markup.
// ---------------------------------------------------------------------
function initGraphs() {
  const heroCanvas = document.querySelector<HTMLCanvasElement>("#hero-graph-canvas");
  if (heroCanvas) {
    const heroIds = new Set([
      "project:api-gateway",
      "repo:api-gateway",
      "runtime:node",
      "pm:pnpm",
      "package:express",
      "process:node-api-gateway",
      "port:3000",
      "tool:docker",
    ]);
    const heroResources = resources.filter((r) => heroIds.has(r.id));
    const heroLinks = relationships.filter((r) => heroIds.has(r.from) && heroIds.has(r.to));
    new GraphDemo(heroCanvas, heroResources, heroLinks, { crosshair: true });
  }

  const fullCanvas = document.querySelector<HTMLCanvasElement>("#full-graph-canvas");
  if (fullCanvas) {
    new GraphDemo(fullCanvas, resources, relationships, {
      legend: document.querySelector<HTMLElement>("#graph-legend"),
      countsEl: document.querySelector<HTMLElement>("#graph-counts"),
      liveRegion: document.querySelector<HTMLElement>("#graph-live"),
    });
  }
}

// ---------------------------------------------------------------------
// Section entrance: 150ms fade + 4px shift, reused verbatim from the
// app's own panel-transition spec (root DESIGN.md 6). One-shot per
// section on first entry, not a repeating fade-up-on-scroll cascade
// across many elements. prefers-reduced-motion disables the tween via
// CSS (.view-enter has no animation under that media query).
// ---------------------------------------------------------------------
function initSectionEntrance() {
  const sections = document.querySelectorAll<HTMLElement>("main > section");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("view-enter");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  sections.forEach((s) => observer.observe(s));
}

document.addEventListener("DOMContentLoaded", () => {
  initRail();
  initGraphs();
  initSectionEntrance();
});
