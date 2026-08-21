# CodeAtlas — Design Direction

This document is binding. It is the pinned visual spec for CodeAtlas: type,
color, space, motion, and the interaction patterns that hold the whole
product together. Engineering conventions live in the project's own
contributor docs; the visual system lives here. Deviating from it means
editing this file first, not quietly diverging in a component.

CodeAtlas is read against `ARCHITECTURE.md` and `src/lib/types.ts` — every
color, icon, and layout decision below exists because a real `ResourceKind`,
`RelationshipKind`, `ChangeKind`, `CleanupCategory`, or `Availability` state
in that file needs somewhere specific to live on screen. Nothing here is
decorative.

---

## 1. The concept

**CodeAtlas is a surveyor's instrument, not a dashboard.** The product
brief's own framing — "Google Maps for your development environment" — is
correct in spirit but points at the wrong artifact. Google Maps is a
consumer product built to be glanced at. CodeAtlas is closer to the
instrument a surveyor, an air-traffic controller, or a ship's navigator
uses: a precise, always-on, information-dense readout of a real physical
space (in this case, a machine's filesystem, process table, and network
stack) that rewards sustained attention rather than a glance. The
controlling metaphor is **instrumentation, not illustration**. Nothing on
screen exists to look nice; everything exists to be read quickly, cross-
referenced, and trusted at 2am when a port conflict or a runaway Docker
container needs to be found in under ten seconds.

This rules out, on sight, anything that behaves like a marketing dashboard:
big round numbers in soft cards, gauges, celebratory color, empty states
with mascot illustrations. It also sets the bar for density: an air-traffic
display is closer to the reference class than a SaaS analytics page. Every
screen should look like it was built by someone who has to live inside it
eight hours a day, because that is exactly who is going to use it.

The one visual signature that carries this through the whole product: **the
existing app mark is the whole palette in miniature** — three connected
circular nodes, a warm copper accent on an otherwise ink-dark ground. That
is not just a logo; it is the literal shape of the dependency graph view,
and the copper is the one color CodeAtlas ever really "speaks" in. Read
section 8 for the full reasoning.

---

## 2. Typography

Two families, two jobs, and they must never be confused for each other at
a glance. Inter, Roboto, Space Grotesk, and system stacks (`-apple-system`,
`Segoe UI`, `system-ui`) are explicitly out — they are the default choice
every generic AI-built tool reaches for, and this product's entire claim is
that it was built by people who care about the difference between a
default and a decision.

### 2.1 UI chrome / humanist voice — **National 2**

**National 2** (Klim Type Foundry) is the UI chrome, label, and prose face:
navigation, section headers, table headers, empty states, settings copy,
onboarding text, tooltips, the command palette's own labels. National 2 is
a humanist grotesk — it has more warmth and more individual character in
its letterforms (a slightly ink-trap-influenced cut, open apertures, a
genuine italic) than the geometric-grotesk-by-default choices (Inter,
Roboto, Söhne). That warmth is deliberate: it is the human voice in a tool
whose data voice (below) is deliberately cold and exact, and the contrast
between the two is what makes the "distinct technical vs. humanist voice"
requirement actually legible rather than a suggestion in a style guide
nobody can see.

- License: commercial, per-app/seat license from Klim Type Foundry.
- **Fallback while unlicensed, or for open-source contributor builds:**
  **Instrument Sans** (SIL OFL, Google Fonts) — a humanist grotesk with a
  kindred warmth (open apertures, slightly irregular curves) and none of
  Inter's clinical neutrality. Ship National 2 in the commercial build,
  Instrument Sans in any build that can't carry a paid font license
  (source builds, the CLI's `--help` text rendering, CI screenshots).
- Weights used: 400 (body/regular), 500 (medium — table headers, active
  nav item, button labels), 650 (semibold — page titles, panel headers).
  Never go past 650; a 700+ weight next to dense data reads as shouting.

### 2.2 Technical / monospace voice — **Berkeley Mono**

**Berkeley Mono** (U.S. Graphics Co.) renders every piece of literal machine
data: filesystem paths, ports, PIDs, container IDs, git SHAs, semver
strings, environment variable names, byte counts, timestamps in the
timeline, and every label inside the dependency graph canvas. It was
designed specifically for terminals and code — disambiguated `0`/`O`,
`1`/`l`/`I`, a true italic instead of an oblique, and tight, consistent
metrics that make columns of paths and hashes actually align instead of
drifting the way most "coding fonts pressed into UI service" do. It is
presently the reference mono face for serious, craft-forward developer
tooling (terminal emulators, editor marketing, technical brand work) for
exactly the reason CodeAtlas needs it: it reads as *made by developers,
for developers*, not licensed off a stock list.

- License: commercial, one-time per-seat purchase from U.S. Graphics Co.;
  redistribution inside the packaged app binary is permitted under their
  standard app-embedding terms — confirm the current terms before first
  release build, licensing pages update.
- **Fallback while unlicensed:** **Commit Mono** (SIL OFL, fully free and
  redistributable) — also purpose-built for code with disambiguated
  glyphs and adjustable metrics, and close enough in proportion that
  swapping it in doesn't reflow the dense list views. Do not fall back to
  JetBrains Mono or Fira Code; both are correct fonts but are the two most
  recognizable "generic dev tool" mono defaults, and the whole point of
  this pairing is that neither typeface in it is a default.
- Weights used: 400 (regular — the default for all data), 500 (medium —
  the *active/selected* row's data, a hovered graph node's label). No
  bold mono anywhere; emphasis in data is carried by color and the
  surface ladder, never by weight, so a bolded path never gets mistaken
  for a heading.
- Tabular figures on by default (`font-variant-numeric: tabular-nums` is
  moot for a true mono face, but keep it set for the humanist face
  wherever numbers stack in a column — cpu core counts, byte totals).

### 2.3 Type scale

All sizes in px at 100% OS zoom; this is a desktop app with a fixed
default zoom, not a responsive web page, so the scale is tuned for a
13"–16" laptop display at typical viewing distance, not for a marketing
hero.

| Token | Family | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|---|
| `display` | National 2 | 22px | 650 | 1.2 | -0.2px | Page-level title (Overview, Cleanup Center) |
| `panel-title` | National 2 | 15px | 650 | 1.3 | -0.1px | Panel/section header inside a workspace |
| `label-lg` | National 2 | 13px | 500 | 1.3 | 0 | Sidebar nav items, tab labels |
| `label` | National 2 | 12px | 500 | 1.35 | 0.1px | Table column headers, field labels |
| `body` | National 2 | 13px | 400 | 1.5 | 0 | Default UI prose, settings copy, empty states |
| `body-sm` | National 2 | 12px | 400 | 1.45 | 0 | Secondary/meta text, timestamps in prose form |
| `caption` | National 2 | 11px | 500 | 1.3 | 0.2px | Micro-labels, badge text, kind tags |
| `data-lg` | Berkeley Mono | 14px | 400 | 1.4 | 0 | Focused/detail-pane primary value (a path, a PID) |
| `data` | Berkeley Mono | 13px | 400 | 1.45 | 0 | Default table-cell data: paths, ports, versions, hashes |
| `data-sm` | Berkeley Mono | 11.5px | 400 | 1.4 | 0 | Dense list rows, graph node labels, inline hashes |
| `code-block` | Berkeley Mono | 12.5px | 400 | 1.6 | 0 | Multi-line evidence/config excerpts |

Rule of thumb for any component not covered above: if the value came from
`serde` on the Rust side (a `Resource.path`, a `Relationship` id, anything
inside `attributes`), it is Berkeley Mono. If it is UI-authored copy (a
button label, a section title, a sentence CodeAtlas wrote), it is
National 2. This single rule resolves nearly every typography decision a
component will ever need to make, and it is the rule frontend-engineer
should reach for before inventing a new token.

---

## 3. Color system

The palette is anchored directly to the existing app mark
(`src-tauri/icons/icon.png`), sampled at its actual pixel values rather
than eyeballed: the ink is `#1E2026`, the accent is `#C4783E`. See section
8 for the full reasoning; the short version is that anchoring here for
free gives the product a resolved, non-generic hue (warm copper sits
nowhere near the purple/blue that reads as "AI dashboard") and it costs
nothing to keep the app icon, the marketing site, and the product itself
speaking the same color.

### 3.1 Dark mode (primary — this is the mode CodeAtlas ships open by default)

**Surface ladder.** Four steps, each one perceptible notch up from the
last, all sharing the icon's faint cool-charcoal cast (never a warm brown-
gray, never a pure neutral gray — the icon's own dark value has a slight
blue lean and the whole ladder should carry it):

| Token | Hex | Use |
|---|---|---|
| `surface-canvas` | `#0B0C0F` | App chrome: outer window background, sidebar background, title bar |
| `surface-content` | `#131519` | Default content background: list views, panel bodies, the graph canvas |
| `surface-panel` | `#1B1E23` | Elevated panels: detail pane, inspector, table row on hover — **this is the icon's own ink value**, the deliberate anchor point |
| `surface-overlay` | `#22252B` | Highest elevation: command palette, context menus, popovers, modals |

Borders, never shadows, carry elevation past the ladder itself:

| Token | Hex | Use |
|---|---|---|
| `border-hairline` | `#2A2D34` | Default 1px dividers, table row separators, panel edges |
| `border-hairline-strong` | `#383C44` | Emphasized dividers: selected row edge, focused panel border |
| `border-focus` | `#C4783E` at 55% opacity, 1.5px | Keyboard-focus ring, replaces any glow/shadow focus treatment |

**Text:**

| Token | Hex | Use |
|---|---|---|
| `text-primary` | `#EDEEF0` | Headings, primary data values, active row text |
| `text-secondary` | `#A9ADB6` | Body copy, default table cell text |
| `text-tertiary` | `#71757E` | Meta text, timestamps, secondary labels, placeholder |
| `text-disabled` | `#4A4D55` | Disabled controls, unavailable-provider rows |

`text-primary` is intentionally not pure white — `#EDEEF0` sits close
enough to the surface hue to avoid the slight vibration pure white causes
against a cool dark ground at small mono sizes (a real legibility problem
in dense path/hash text, not an aesthetic one).

**The signature accent — copper:**

| Token | Hex | Use |
|---|---|---|
| `accent-copper` | `#C4783E` | The exact icon value. Primary buttons, active nav item, selected-row left rule, primary focus states, the "project" resource kind, brand mark |
| `accent-copper-bright` | `#D8925C` | Hover state of anything using `accent-copper` |
| `accent-copper-dim` | `#8F5A30` | Pressed state; also the "muted copper" used for de-emphasized copper (e.g. a copper icon at rest inside a neutral list row) |
| `accent-copper-wash` | `rgba(196, 120, 62, 0.12)` | Selected-row / active-item background fill — never a solid copper fill on a full row, always this wash under existing text colors |

Copper is scarce by design, same discipline Linear applies to its
lavender and Raycast applies to its white CTA: **one saturated color per
fold, maximum.** It marks *the one thing that is currently active or
primary* — the selected sidebar item, the primary action in a dialog, the
"project" node kind that anchors the graph. It is never used as a section
background, never used for more than one simultaneous emphasis in a given
view, and never appears at full saturation across a large fill (a copper-
filled banner or hero would immediately read as the exact "AI dashboard"
tell this product is built to avoid).

**Status semantics** — the health/state of a resource, orthogonal to what
*kind* of resource it is. These four map directly to real states in
`types.ts`: `ScanStatus`, `Availability`, `ChangeKind`, and the general
notion of "still running" vs. "stale" vs. "gone."

| Token | Hex | Maps to |
|---|---|---|
| `status-healthy` | `#4FA974` | Running process, listening port, `ScanStatus: "completed"`, `ChangeKind: "discovered"` on a still-live resource |
| `status-warning` | `#D9A441` | Stale/unused (a `CleanupCandidate`, a project untouched past its threshold, `Availability: "Unavailable"` shown as advisory not error) |
| `status-error` | `#E15C5C` | `ScanStatus: "failed"`, a provider `error`, a broken/dangling resource |
| `status-info` | `#5B9FD9` | Neutral informational state: a diagnostics note, an in-progress scan, non-actionable metadata |

These four hues are chosen to sit clearly apart from `accent-copper`
(hue ~26°) and from each other: warning amber sits at hue ~42° (yellower,
never mistaken for the brand copper), healthy green ~140°, error red
~2°(a clean, slightly desaturated technical red, not a stop-sign red —
Radix/GitHub-style, not a warning-label red), info blue ~205°. None of the
four is ever used as a large fill; they are dots, thin left-rules, small
badge backgrounds at ~15% opacity with the solid hue as the badge text,
and single-pixel status rings on avatars/icons.

**Resource-kind color coding** (for the dependency graph and any place a
resource's *kind* — not its health — needs a fast visual sort). `types.ts`
defines 20 `ResourceKind` values; coding 20 unrelated hues would be
illegible, so they group into seven families by domain, each family one
base hue varied in lightness/saturation for the individual kinds inside
it. Full mapping and rationale in section 5.2.

### 3.2 Light mode (not an afterthought — same system, inverted ladder)

Light mode exists for daylight use and OS-level "always light" users; it
is derived from the identical structure, not redesigned from scratch. The
same faint cool-neutral cast carries through — this is not a swap to warm
paper tones, because the product is an instrument, not an editorial page.

**Surface ladder:**

| Token | Hex | Use |
|---|---|---|
| `surface-canvas` | `#F4F5F7` | App chrome |
| `surface-content` | `#FBFBFC` | Default content background |
| `surface-panel` | `#FFFFFF` | Elevated panels |
| `surface-overlay` | `#FFFFFF` with `0 4px 16px rgba(20,22,26,0.10)` | Command palette, menus — the one place light mode is allowed a soft shadow, since a hairline border reads too faint on white to carry elevation the way it does on dark |

**Borders:**

| Token | Hex |
|---|---|
| `border-hairline` | `#DFE1E6` |
| `border-hairline-strong` | `#C7CAD1` |
| `border-focus` | `#A3611F` at 60% opacity, 1.5px (darkened copper — see below) |

**Text:**

| Token | Hex |
|---|---|
| `text-primary` | `#181A1F` |
| `text-secondary` | `#4B4F58` |
| `text-tertiary` | `#787D87` |
| `text-disabled` | `#B1B4BB` |

**Copper accent, re-tuned for contrast on white** (the raw `#C4783E`
against `#FBFBFC` fails AA for small text; darken and slightly desaturate
rather than change hue):

| Token | Hex |
|---|---|
| `accent-copper` | `#A3611F` |
| `accent-copper-bright` | `#B87330` |
| `accent-copper-dim` | `#7C4C18` |
| `accent-copper-wash` | `rgba(163, 97, 31, 0.10)` |

**Status semantics, light:** `status-healthy` `#2E8B57`, `status-warning`
`#B07A1E`, `status-error` `#C4433F`, `status-info` `#3A79B0` — same hues,
darkened ~15–20% for AA contrast on white. Resource-kind family hues
follow the identical darkening rule; the mapping table in 5.2 lists dark-
mode hex only, frontend-engineer derives light-mode values by the same
~15–20% darken-and-desaturate applied here, not by picking new hues.

---

## 4. Spacing and layout

This is Raycast/Linear information architecture, not marketing-page
architecture: a persistent sidebar, a command palette as the primary
cross-cutting navigation device, resizable panes, and dense sortable
tables with a hover/selection detail pane — never a card grid, never a
bento layout, never a "stat card with a big number" anywhere in the
product.

### 4.1 Spacing scale

4px base unit, same discipline as the references above, because a desktop
information tool with hundreds of rows on screen needs the tightest
defensible rhythm, not a marketing 8pt grid stretched for whitespace:

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap, inline chip padding |
| `space-2` | 8px | Table cell vertical padding, tight stacks |
| `space-3` | 12px | Table cell horizontal padding, list row gaps |
| `space-4` | 16px | Panel interior padding, form field gaps |
| `space-5` | 20px | Section gaps within a panel |
| `space-6` | 24px | Panel-to-panel gaps, sidebar section gaps |
| `space-8` | 32px | Top-level view padding (rare — most views run edge-to-edge in a scroll region) |

There is no `section` token in the Linear/Raycast marketing sense (96px):
CodeAtlas has no marketing-style sections, it has panels, and panels sit
directly against each other separated by a 1px hairline, not by open
whitespace. Whitespace is not the tool CodeAtlas uses to establish
hierarchy — the surface ladder and type scale are.

### 4.2 Application shell

```
┌──────────────────────────────────────────────────────────────────┐
│ ⌘K bar (title bar area, macOS traffic-light-safe / custom on Win) │
├───────────┬──────────────────────────────────────┬────────────────┤
│           │                                      │                │
│  Sidebar  │           Workspace (active view)     │  Detail pane   │
│  240px    │           flexible, min 480px          │  360px         │
│  fixed,   │                                      │  resizable,    │
│  collaps- │  Overview · Projects · Graph · Ports  │  collapsible,  │
│  ible to  │  Docker · Runtimes · Cleanup ·        │  shows the     │
│  56px     │  Timeline                             │  selected      │
│  (icon-   │                                      │  resource's    │
│  only)    │                                      │  full record   │
│           │                                      │                │
├───────────┴──────────────────────────────────────┴────────────────┤
│ Status strip: scan status · providers running · last scan time     │
└──────────────────────────────────────────────────────────────────┘
```

- **Sidebar** (`surface-canvas`): fixed navigation between the top-level
  views implied by `ARCHITECTURE.md` — Overview, Projects, Dependency
  Graph, Processes & Ports, Docker, Runtimes & Package Managers, Cleanup
  Center, Timeline, Diagnostics. Each item is `label-lg` National 2 with a
  16px kind-family–colored glyph (section 7). Active item gets
  `accent-copper-wash` background and a 2px `accent-copper` left rule —
  never a filled copper background behind the text.
- **Workspace** is the only region that changes per top-level view. It
  defaults to a dense table/list for every resource-listing view (never
  cards), and to the canvas renderer for the Dependency Graph view only.
- **Detail pane** is resizable (drag the hairline border, 320–520px
  range) and collapsible. It renders the full `Resource` record for
  whatever row is hovered-then-pinned-on-click: `name`, `kind` badge,
  `path` in `data` mono, every `attributes` entry as a mono key/value
  list, and the `Evidence[]` array as a small stacked list (`source` in
  `label`, `description` in `body-sm`, `path` in `data-sm` if present).
  This is the single most important density decision in the product:
  **hover-then-click for detail, never a modal, never a separate route.**
- **Status strip** is always visible, 28px tall, `surface-canvas`,
  `caption`-scale National 2 with mono figures for counts. Shows live
  scan state (`ScanStatus`), a compact list of `ProviderRunSummary`
  availability (a small dot per provider, `status-healthy` if available
  and last run succeeded, `status-warning` if `Unavailable`, hover for
  the `unavailable_reason`), and `last_seen` of the most recent scan in
  relative + absolute mono time.

### 4.3 Command palette (⌘K / Ctrl+K)

The primary cross-cutting device, in the Raycast/Linear tradition, and the
one place a soft elevation shadow is permitted even in dark mode (a 0 8px
32px rgba(0,0,0,0.45) — deep, not glowy) because it needs to visually
separate from *everything* underneath it, sidebar included. `surface-
overlay`, `rounded-lg` (10px — see 4.5), max-width 640px, centered
horizontally at 20% from the top of the window (never true vertical
center — that reads as a "you interrupted me" modal, not a fast tool).

Rows: 36px tall, `label-lg` for the primary label, `data-sm` mono for a
secondary hint (a path, a port, a shortcut). Selected row gets `surface-
panel` background, never copper — copper is reserved for the one
"primary" affordance per surface, and in the palette that's reserved for
an actionable verb result (e.g. "Kill process," "Remove image") shown
with `status-error` or `accent-copper` depending on destructiveness, not
for plain selection state.

### 4.4 Table-dense lists

The default pattern for every resource-listing view (Projects, Processes
& Ports, Docker, Runtimes, Cleanup Center, Timeline). Never a card grid.

- Row height: 32px default, 40px where a kind glyph + two-line label
  (name + path) is needed.
- Columns are sortable (click header, `label` scale, small mono ▲/▼ not a
  Lucide-style icon — see section 7), resizable by drag, and
  user-configurable per view (hide/show columns) via a small trailing
  "columns" affordance, not a settings page.
- Zebra striping is **not** used — it's a spreadsheet convention that
  reads as generic-dashboard the moment it's paired with rounded corners.
  Row separation is the `border-hairline` bottom rule only.
- Hover state: `surface-panel` background wash, no scale/shadow. Click
  pins the row as selected (`accent-copper-wash` + left rule) and opens/
  updates the detail pane. This is the one interaction every list view
  in the product shares — learn it once, use it everywhere.
- Row-level status is a 6px dot in the `status-*` colors at the leading
  edge of the row, before the kind glyph, so scanning a 200-row process
  list for anything unhealthy is a single vertical sweep down one column
  of dots.

### 4.5 Radius

Two radii total, used with total consistency — not the generic-tell of
"the same soft radius on absolutely everything," but genuinely only two
values because a dense instrument benefits from as few shape decisions as
possible:

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 4px | Badges, chips, kind tags, buttons, inputs |
| `radius-md` | 10px | Panels, the command palette, popovers, the detail pane's outer frame |

Nothing in the product uses a radius above 10px. No pill buttons except
the kind-family filter chips in the Cleanup Center and Graph legend,
which are the one place a `radius-full` (9999px) shorthand is
intentionally used, because they behave as literal tag tokens, not
buttons.

---

## 5. The dependency graph view

This is the product's centerpiece and the literal payoff of the "Google
Maps for your machine" idea — and per `ARCHITECTURE.md` it is
canvas-rendered, not a DOM node per resource, because the graph can
realistically carry several hundred nodes. Every choice below assumes a
2D canvas renderer (e.g. a custom force layout or a canvas-backed library)
drawing directly, not styling DOM elements.

### 5.1 Canvas feel

- **Background:** `surface-content` (`#131519` dark / `#FBFBFC` light) —
  the graph lives in the same material as every other workspace view, it
  does not get a special "cinematic" black backdrop. This is an
  instrument panel, not a screensaver.
- **No dot-grid, no coordinate-plane background.** A faint (4% opacity)
  fixed-position crosshair only at the canvas center, used purely as a
  re-center affordance target, not decoration.
- **Force layout settles, it does not perform.** Use a standard
  force-directed layout (link + charge + collision) but tune it to
  converge in under ~800ms and then **stop simulating** — no perpetual
  gentle drift, no idle jiggle. A graph that never stops moving reads as
  a screensaver, not a readout you can trust to hold still while you read
  it. Re-run the simulation only on an explicit topology change (a scan
  completes and the graph has new/removed nodes/edges) or a manual
  "re-layout" action, and animate *that* transition (see section 6).
- **Zoom/pan** is the primary navigation: scroll to zoom (0.25x–4x),
  drag to pan, double-click a node to focus-zoom to it and its direct
  neighbors (everything else fades to 20% opacity, not hidden — context
  matters more than isolation in a dependency graph).

### 5.2 Node rendering

- **Shape:** filled circle, always — this is the one geometric motif the
  app mark already established, and every node in the graph should read
  as a literal extension of that mark. Radius encodes nothing decorative;
  it encodes degree (how many relationships touch this resource),
  6px minimum to 22px maximum, so a project with forty dependents is
  visibly the "hub" a first glance should land on.
- **Fill color = resource-kind family**, per the seven families below.
  Fill, not stroke — a hollow node reads as "unselected/ghost," which is
  reserved for the fade state during focus-zoom.
- **Selection ring:** 2px `accent-copper` stroke, 3px offset from the
  node edge (a halo, not a tight outline) on the currently
  selected/pinned node. Hover gets the same ring at 50% opacity, no
  color change to the fill itself.
- **Label:** `data-sm` Berkeley Mono, appears only above a zoom threshold
  (~0.8x) to keep the canvas legible when zoomed out over a few hundred
  nodes; below that threshold, kind-family color and size alone carry
  the information. Label color is always `text-primary`, positioned
  below the node, never wrapped in a pill/badge background — CodeAtlas
  is instrumented enough elsewhere that graph labels can stay minimal.

**Resource-kind family mapping** (dark-mode hex; light-mode per the 3.2
darkening rule):

| Family | Hue center | Resource kinds | Hex (per kind, light→dark within family) |
|---|---|---|---|
| Origin (copper) | ~26° | `project` | `#C4783E` — the one kind that gets the brand color itself, since projects are the root organizing unit everything else hangs off of |
| Version control | ~10° | `git_repository` | `#C1583E` |
| Runtime & process | ~205° | `process`, `runtime`, `network_listener`, `port` | `process` `#5B9FD9` · `runtime` `#4C8DC4` · `network_listener` `#3E77A8` · `port` `#7BB3E5` |
| Containers | ~265° | `docker_container`, `docker_image`, `docker_volume`, `docker_network` | `container` `#8A6FD1` · `image` `#7159B8` · `volume` `#A48EE0` · `network` `#5B4696` |
| Package management | ~175° | `package_manager`, `package` | `manager` `#3FAA9C` · `package` `#5FC4B6` |
| Environment & tooling | ~48° | `tool`, `environment_variable`, `ssh_config_entry`, `config_file` | `tool` `#C9A64A` · `env var` `#B8934A` · `ssh config` `#A7873F` · `config file` `#D4B968` |
| Ephemeral / storage | 0% sat | `build_artifact`, `cache`, `disk_usage_entry` | `#7A7E86` flat neutral gray — deliberately desaturated, these are the "can be deleted" kinds and should visually recede against every colored family |
| Service infrastructure | ~330° | `service`, `database` | `service` `#C15C8E` · `database` `#A34473` |

Seven families, one flat neutral for the "ephemeral" group, keeps the
graph readable at a glance: a developer scanning for "what's eating my
disk" learns to look for gray, a developer scanning for "what's still
running" learns to look for blue, without needing to memorize twenty
individual hues.

### 5.3 Edge rendering

- **Default edge:** 1px `border-hairline-strong`, straight or gently
  curved to avoid overlapping parallel edges between the same two
  clusters, never a bundled/spline "data-viz" curve — a dependency graph
  should look like a wiring diagram, not a chord chart.
- **Direction:** a small filled arrowhead (4px) at the `to` end only,
  colored the same neutral hairline strong, not per-kind — edge color
  encodes *nothing but hover/selection state*, so the canvas doesn't turn
  into a rainbow the moment there are a few hundred relationships on
  screen.
- **Relationship-kind label:** shown only on hover over the edge itself
  (a small `caption` mono chip mid-edge: `depends_on`, `mounts`,
  `listens_on`, etc.), never rendered by default — with a few hundred
  edges, always-on labels are pure noise.
- **Hover/selection state:** hovering or selecting a node brightens its
  direct edges to `accent-copper` at 70% opacity and dims every
  unconnected edge to 8% opacity. This, not color-per-relationship, is
  how the graph answers "what does this actually touch" — the single
  most common question this view exists to answer.

### 5.4 Legend and controls

A persistent, collapsible legend strip along the canvas's bottom edge
(never floating over the canvas center) listing the seven kind families
as `radius-full` chips (section 4.5) with their fill dot + `caption`
label; clicking a chip toggles that family's visibility on the canvas
(dims to 6% rather than fully hiding, so topology context is never
totally lost). Zoom level and node/edge counts render as small mono
figures in the same strip, right-aligned.

---

## 6. Motion

One rule governs everything below: **motion in CodeAtlas exists to show a
state transition that actually happened, never to add texture to an
otherwise static screen.** If a motion can be deleted without losing any
information, delete it.

### What animates

- **Panel/view transitions** (switching top-level sidebar sections): the
  outgoing view cross-fades 100ms, the incoming view fades + shifts up
  4px over 150ms, `ease-out`. Fast enough to feel instant, present enough
  to signal "you're now looking at different data," not "you're now
  looking at different data. tada"
- **Detail pane open/collapse:** width animates 180ms `ease-in-out`
  (a physical push, not a fade-in-place — the pane genuinely occupies
  space and should look like it is claiming/releasing it).
- **Scan progress:** determinate, not indeterminate — `ScanRecord` and
  `ProviderRunSummary` give real per-provider progress, so the status
  strip renders a real progress indicator (a thin 2px `accent-copper`
  bar under the provider dot list) that fills as providers complete, not
  a generic spinner. A spinner on a tool that knows exactly what it's
  waiting for is a tell that the UI isn't actually wired to real state.
- **Graph re-layout:** when topology changes (new/removed nodes after a
  scan), existing nodes tween to their new force-settled position over
  400ms `ease-in-out`; new nodes fade + scale in from 0.6x over 200ms
  starting from their parent/related node's position, not from a random
  point or the canvas edge — it should look like the new resource
  *grew out of* the thing that produced it.
- **Row selection / pin:** the `accent-copper-wash` background and left
  rule apply instantly on click, no transition — selection state should
  feel like flipping a switch, not like something settling into place.
- **Cleanup Center action confirmation:** a destructive action (delete a
  docker volume, remove a build artifact) gets a genuine 200ms
  `ease-out` collapse of the row after confirmation completes, so the
  list visibly shrinks rather than the row just vanishing — the one
  place a slightly more expressive animation is earned, because it is
  reporting an irreversible, consequential state change.

### What explicitly does not animate

- No hover-scale, no hover-lift, no hover-shadow on rows, cards, or
  buttons anywhere in the product — hover changes background wash only
  (`border-hairline` → `surface-panel`), instantly.
- No entrance animation on table rows when a view first loads (no
  staggered fade-up-on-scroll, no "cards flying in") — the data is
  either there or it's loading (see skeleton states, section 4.4's
  implicit requirement), and animating its arrival for effect
  contradicts the instrument metaphor directly.
- No idle motion anywhere: no breathing glows, no floating particles, no
  perpetual graph jiggle (section 5.1), no animated gradient backgrounds.
- No icon micro-animations (spinning, bouncing, pulsing) except the one
  functionally justified case: a `status-warning`/`status-error` dot may
  pulse at low amplitude (opacity 100%→70%→100%, 1.6s ease-in-out loop)
  *only* on a resource that just transitioned to that state in the
  current session, and it stops pulsing the moment the row is viewed/
  acknowledged (clicked once). This is the single permitted "ambient"
  animation in the entire product, and it exists purely to solve the
  real problem of a background scan surfacing something bad while the
  window isn't focused.
- `prefers-reduced-motion` disables every transition above except the
  functional ones (scan progress bar fill, cleanup row collapse) which
  degrade to an instant state change instead of a tween — never delete
  the *information* the motion was carrying, only the tween.

---

## 7. Iconography

**Decision: a small, restrained custom glyph set built on the app mark's
own geometric logic — not an icon-minimal UI, and explicitly not a
generic icon pack (Lucide, Feather, Heroicons, Font Awesome, or any
library with that visual DNA).**

An icon-minimal approach (leaning purely on typography/color/shape,
zero icons) was the other option seriously considered, and it's the
right call for a marketing page but wrong here: CodeAtlas has 20
`ResourceKind` values that need to be told apart at a glance, repeatedly,
in dense 32px-tall table rows where there usually isn't room for a full
kind-name label next to the data. A sidebar nav, a table's leading
column, and every graph legend chip all need a kind identifier smaller
and faster to parse than a word. Removing icons entirely would just
relocate that job to color alone, and color is already fully committed
to two other jobs (status semantics, kind families) — asking it to also
carry fine-grained identity within a family (`process` vs. `runtime` vs.
`network_listener`, all in the same blue family) would overload it.

So: one small custom set (roughly 30 glyphs — 20 resource kinds + ~10
chrome icons: search, settings, close, expand/collapse, sort, filter,
external-link, warning, more/overflow, resize-handle), governed by a
single geometric rule so the set reads as *one thing* rather than a pile
of arbitrary pictograms:

- **Grid:** 16×16 and 20×20 only (list-row scale and sidebar/palette
  scale). No other sizes; scale via the 20px asset down, never up from
  16px.
- **Stroke:** monoline, 1.5px, rounded caps/joins — matching the
  connecting lines in the app mark exactly.
- **Construction:** every glyph is built from the same three primitives
  the mark itself uses — circles, straight connecting lines, and the
  occasional single rectangle (for filesystem/artifact-adjacent kinds
  like `config_file`, `build_artifact`). No glyph in the set uses a
  primitive the mark doesn't already establish. A `git_repository` icon
  is a small branching node cluster (three circles, two connecting
  lines) rather than a generic branch-fork pictogram; a `docker_container`
  icon is a circle inside a bracketed square rather than the literal
  whale. This is slower to design once and reads as a deliberate,
  bespoke system forever after — the entire reason a generic icon pack
  is banned in the brief.
- **Fill:** icons are never filled except a single center dot (matching
  a graph node) at 40% of the glyph's bounding box, used only where a
  filled/hollow state distinction genuinely carries information (e.g. a
  running vs. stopped process glyph). Everything else stays outline-only,
  colored by `text-secondary` at rest and by the resource-kind family hue
  only in the sidebar's active state and the graph legend — never as a
  permanent full-saturation fill sitting in every table row, which is
  the fast way for a restrained system to start looking like a Fisher-
  Price color chart.
- **No sparkle, no decorative flourish icons anywhere** — no icons next
  to headings that don't carry a real semantic distinction, no icon
  attached to every single stat purely for texture.

Deliver the set as a single SVG sprite/icon-font-free component library
(inline SVG components, not an icon font) so stroke color can be set via
`currentColor` and match the exact text/family tokens above without a
second color system for icons alone.

---

## 8. How the existing mark informs the system

`src-tauri/icons/icon.png` was sampled directly rather than eyeballed:
the three nodes render at `#1E2026` (two of them) and `#C4783E` (the
top/primary node), connected by `#1E2026` strokes on a transparent
ground.

**Decision: anchor the entire palette to this mark — the copper stays the
system's one signature accent — rather than diverge from it.**

Reasoning:

1. **The mark is already correct for the brief.** A slate/charcoal ground
   with a single warm accent and a connected-nodes motif is, independent
   of anything else, exactly the palette structure this document would
   have arrived at from scratch: a dark-first neutral base (section 3.1),
   one scarce signature hue used sparingly rather than distributed evenly
   (section 3.1's copper discipline), and a literal node/edge shape that
   is also the product's actual centerpiece view (section 5). Diverging
   from it would mean throwing away a resolved answer to get a worse one.
2. **Copper is not a color this product's category reaches for.**
   Developer tools default overwhelmingly to blue/purple (VS Code,
   Docker Desktop, most "AI-adjacent" dashboards) or green (terminal
   nostalgia). A warm copper/terracotta accent is distinct within the
   category, reads as *considered* rather than *default*, and is exactly
   the kind of choice this brief's banned-list (purple/blue gradients,
   neon, basic pastels) is implicitly steering away from without ever
   needing to say "not blue" out loud.
3. **It gives the icon, the marketing site, and the product itself one
   shared visual sentence for free.** A user who has seen the app icon in
   their dock or taskbar arrives at the product already visually primed;
   nothing about opening the app should feel like a different brand than
   the icon that launched it.
4. **The literal RGB values become the anchor points of the surface
   ladder**, not just a "color inspired by the icon" — `surface-panel`
   (`#1B1E23`) *is* the icon's own ink value, sampled, not approximated.
   That is a stronger and cheaper continuity guarantee than a verbally-
   described "matching palette" would be, and it means any future icon
   refresh that changes the sampled values should trigger a corresponding
   pass over this document's surface ladder and accent tokens — they are
   meant to move together.

The only real argument for diverging (that copper trends slightly warm/
analog for a tool whose content is otherwise cold and precise) is a
feature, not a bug, given the type-system decision in section 2: National
2's humanist warmth and Berkeley Mono's technical precision are already
in deliberate tension, and copper — warm, but a mineral/industrial warm
rather than a soft one — sits correctly in between them rather than
contradicting either.

---

## Summary for implementation

- Two fonts: **National 2** (UI/chrome/prose, fallback **Instrument
  Sans**) and **Berkeley Mono** (all machine data, fallback **Commit
  Mono**). Never Inter/Roboto/system stacks. Rule: serde-sourced value →
  mono, UI-authored copy → National 2.
- Four-step dark surface ladder anchored to the sampled icon values
  (`#0B0C0F` → `#131519` → `#1B1E23` → `#22252B`), full light-mode mirror
  in section 3.2. One signature accent, `#C4783E` copper, used scarcely.
  Four status hues (health) kept strictly separate from seven resource-
  kind family hues (category) — two different questions, two different
  color dimensions, never conflated.
- Sidebar + command palette + resizable detail pane + dense hairline-
  separated tables. No cards, no bento, no stat tiles, no marketing
  section rhythm.
- Canvas-rendered dependency graph: circles sized by degree, filled by
  kind family, edges neutral until hover/selection reveals the copper
  highlight. Layout settles and stops; it never idles.
- Motion reports real state transitions only (scan progress, graph
  re-layout, panel open/close). No decorative hover motion, no entrance
  choreography, no idle animation except the single justified
  new-alert pulse.
- Icons are a small bespoke ~30-glyph monoline set built from the mark's
  own circle/line vocabulary — never a generic icon pack, never fully
  icon-less given the density this product actually needs.
