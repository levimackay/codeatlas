```yaml
name: CodeAtlas — marketing website
conceit: The site is CodeAtlas's own status strip run floor to ceiling — a persistent instrument rail names your place the whole way down, and every claim resolves into a real reading, not a screenshot standing in for one.
macrostructure: pinned instrument rail
type_display: Instrument Sans
type_body: Instrument Sans
palette_anchor: oklch(0.64 0.12 55)
set_pieces:
  - persistent-orientation-device
  - dense-reference-table
  - display-scale-section-names-cropped
```

# DESIGN.md: CodeAtlas marketing website

The pinned visual spec for this project. Binding: implementation follows this file; to deviate, edit this file first.

This document is downstream of `~/Developer/codeatlas/DESIGN.md`, the binding spec for the desktop app itself, and does not relitigate its fixed decisions: the "surveyor's instrument, not a dashboard" concept, the copper accent sampled at `#C4783E` off the real app icon, the National 2/Instrument Sans + Berkeley Mono/Commit Mono pairing, the dark-first four-step surface ladder, the resource-kind family colors, and the canvas dependency-graph rendering spec are all inherited as constraints, not reopened as choices. Where a generic template heuristic below would have argued for something different (a warmed neutral ramp, a fresh hue, a light-mode-first hero), the app's own spec won and the reasoning is written down at the point of conflict rather than silently overridden.

## Brief

- **Client / business:** CodeAtlas — a local-first, open-source desktop app (Rust + Tauri 2) that scans a developer's machine and maps projects, processes, ports, Docker resources, runtimes, package managers, disk-hungry caches, and the real dependency graph between all of them, with a cleanup center that recommends but never deletes.
- **Audience:** working developers evaluating a new local tool for their own machine — self-selecting, technical, allergic to marketing language, will judge the site by whether the claims it makes are checkable.
- **The feeling (one word, with a real opposite):** *instrumented*, not *decorated*.
- **The ONE memorable thing:** the dependency graph and the resource-kind table on this page are the real rendering spec running on real (if illustrative) sample data — not a screenshot, not an illustration of the idea.
- **The one action that matters:** download the app (falls back to "clone from GitHub" if no packaged release exists at launch — see Placeholders).
- **This is NOT:** a funded startup's landing page. No logos, no user counts, no testimonials, no "trusted by," no press strip, no invented metric of any kind. It reads the way `README.md` reads: direct, specific, no "revolutionize."

## Banned for this build (from the last 1 shipped site)

- Conceits: The page is an engineering drawing, and it draws itself as you read it.
- Type families: Archivo, Azeret Mono
- Palette anchors: #C63C0C
- Macrostructures: drawing sheet set
- Set pieces: photo-cross-dissolve, object-rotating-in-place, lengths-travelling-on-depth-lanes, plan-drawing-itself, granular-grind-off, torn-paper-boundary, scale-read-by-a-jaw
- Techniques: none yet

Every item above is forbidden on this build. One item needs a written note rather than a silent pass: **the banned palette anchor `#C63C0C` and this build's anchor `#C4783E` sit in the same warm orange-red neighborhood** (roughly 15.5° vs. 26° hue in plain HSL terms). This is not a stage-3 free pick that drifted near a banned one — `#C4783E` is a locked brand constant, sampled directly off the real CodeAtlas app icon and already binding across the desktop app's entire DESIGN.md. It cannot move without breaking the one continuity guarantee (icon, product, site all speak the same copper) that document explicitly argues for in its §8. The two colors are also further apart than the hue alone suggests: `#C63C0C` is a saturated, dark rust-red; `#C4783E` is deliberately desaturated and lighter, a warm copper-tan rather than a warning-adjacent red. Kept as-is, flagged rather than silently reused.

## References

| Reference | What we're taking from it |
|---|---|
| shopify-editions-summer2025 | The structural macrostructure itself: a persistent left rail of section tags as the orientation device (present in every frame), section names set at display scale in a condensed face and cropped by the window (frames 04 "CHECKOUT", 09 "DEVELOPER"), and hard density alternation — a two-up of product screens with one caption each, then a dense multi-column reference list, then a full-bleed beat, repeated. `params.json`: `motionPerScrollMile 1.8188`, `fullBleedRatio 1`. Not taken: the violet/neon palette, Inter, the literal screenshots. |
| shopify-editions-spring2026 | A cleaner, calmer version of the same rail-plus-crop macrostructure, with markedly less motion and a real dense four-column reference list (frame 05) that reads like a spec sheet, not a feature-bullet list — the direct model for our resource-kind table. `params.json`: `quietTypographyRatio 0.1164`, `densityAlternation 0.3`, `motionPerScrollMile 1.4787`. |
| apple-iphone-pro | The density rhythm at a smaller scale (full-bleed product shot carrying one line of copy, then a dense two-up feature pair, then a spec block), and the discipline of one sustained immersive beat rather than many short ones — its largest single section runs `top 4592` to `top 13892` (9,300px of a 36,138px page, over a quarter of the whole scroll) for one feature. Not taken: the four-tile spec grid with a big number in each cell (a stat card by another name, and explicitly banned by CodeAtlas's own app DESIGN.md), the black-to-white palette used as a generic hinge, the house type. |

Two smaller, single-move steals recorded in their own corpus `notes.md` rather than in this table: peachweb's confidence in setting a headline small and off-center rather than centered and huge (used at reduced scale in our hero clause), and porsche-usa's caption-under-photo pattern — three short facts in a row under an image, no card, no icon (that entry's capture was blocked by an undismissed cookie dialog, so it is a steal of the visible fragment only, not a load-bearing numeric citation).

## Macrostructure: pinned instrument rail

The desktop app's own status strip (§4.2 of the app DESIGN.md: 28px, `surface-canvas`, live scan state, provider dots, `last_seen`) is real, already-specified, always-visible UI. The site's macrostructure is that device, generalized: a persistent rail names the current section the entire way down the scroll, the same job the app's sidebar-plus-status-strip pair already does inside the product. This gives the site real continuity with the app's own interaction language (never a floating marketing navbar) instead of borrowing the visual surface without the mechanism.

Section order:

1. **Hero** — the rail docks for the first time, states the one clause, a small live sample dependency graph settles in beside it. Dark.
2. **Product overview / "the machine map"** — the real 21-value `ResourceKind` reference table, grouped into its real family colors. Full density. Dark. (`dense-reference-table`)
3. **Projects** — one detail-pane replica, showing what a single discovered project's real record looks like. Dark.
4. **Dependency graph** — the full-bleed interactive canvas demo. The most spacious section on the page; the graph is the content. Dark.
5. **Cleanup center** — a small dense sample cleanup list: evidence, size, last-used, dependents, and a visible "recommends, never deletes" line. Dark.
6. **"LOCAL."** — a single cropped word at display scale, the pivot beat between the pitch and the document. (`display-scale-section-names-cropped`)
7. **Privacy** — the light-mode hinge starts here, using the app's real light tokens, not a generic white swap. Real facts from `PRIVACY.md`/`SECURITY.md` set as dense small print — a calibration certificate, not an image.
8. **Cross-platform support** — an honest three-row status table: macOS verified against real data, Linux and Windows compile and pass unit tests but haven't run against real hardware yet.
9. **Developer workflow / CLI** — a real command transcript in Commit Mono, drawn from the same sample fixture as sections 3–5.
10. **Product screenshots** — reserved frames, sized to the app's real chrome proportions (240px sidebar / flexible workspace / 360px detail pane) so real screenshots drop in without a redesign pass. Placeholder until captures land.
11. **Open source / GitHub** — real repo link, real dual MIT/Apache-2.0 license, real CI/CodeQL/license badges once the repo is confirmed public-facing.
12. **Download** — the conversion moment. Platform-aware CTA; degrades to "Clone from GitHub" if no packaged release exists yet.
13. **Footer** — a plain typographic index: GitHub, license, privacy, security, contributing.

The rail is the one constant across the whole thirteen-beat structure; the density and the color mode are what swing (see Density).

## Materials

| Section | Made of | Source |
|---|---|---|
| Hero | Instrument Sans clause + a live canvas-rendered dependency graph (6–10 nodes: circles by kind family, copper node for the one `project`, edges neutral-until-hover) + the rail docking for the first time | Built: real component, real app rendering spec (§5 of the app DESIGN.md), fed by one small authored sample fixture, clearly labeled as sample data — never implied to be a scan of the visitor's own machine |
| Product overview | The real `dense-reference-table` set piece, rendering all 21 real `ResourceKind` values from `src/lib/types.ts`, grouped into the app's real family color table (app DESIGN.md §5.2) | Real source data, no invented kinds. Note: the app DESIGN.md's own prose says "seven families" but its own table lists eight rows (Origin is a family of one); this document uses the table's real row count, not the prose count, and does not silently fix the parent doc |
| Projects | One resource `Resource` detail-pane replica (name, kind badge, path in Commit Mono, attributes as a mono key/value list, evidence list) built to the app's real §4.2 spec, populated with one authored sample project record | Built UI replica, sample fixture, labeled illustrative. Swap for a real screenshot once captures land (see Placeholders) |
| Dependency graph | The in-browser interactive demo itself — real force-directed canvas, real node/edge rendering rules (§5.1–5.3 of the app DESIGN.md: settle under ~800ms then stop, zoom/pan, hover brightens direct edges to copper and dims the rest to 8%), fed by the same static sample fixture | Built, real spec, real interaction, sample data. This is the single largest, most real material on the page |
| Cleanup center | A small dense list following the app's real §4.4 table pattern (status dot, kind glyph, name/path in mono, size, last-used, dependents), same sample fixture, with a visible "recommends, never deletes" line pulled verbatim from README's own wording | Built, sample fixture, real product behavior claim |
| "LOCAL." | Typography only, Instrument Sans at display-crop scale | Ready, no external asset |
| Privacy | Typography only — real claims restated in shorter form from `PRIVACY.md` and `SECURITY.md` (no upload, no telemetry by default, no account, SQLite path on-disk, env var names never values, SSH config read not private keys) | Real, quoted/paraphrased from the project's own docs, not invented |
| Cross-platform support | A three-row honest status table, from README's "Supported platforms" and `ROADMAP.md`'s "Known limitations": macOS run and verified against real data; Linux and Windows compile and are unit-tested, not yet run against real hardware | Real, sourced from the repo's own docs |
| Developer workflow / CLI | A real command transcript (`codeatlas scan`, `ls project`, `search postgres`, `changes`, `scans` — the exact commands in README) rendered in Commit Mono, with output drawn from the same sample fixture used in sections 3–5, explicitly labeled "sample output" | Real command syntax from README; output is fixture data, not a claim about any real machine |
| Product screenshots | MISSING — being captured in parallel, not ready | Client-supplied. Frame the reserved space to the app's real chrome proportions now so screenshots need no redesign later |
| Open source / GitHub | Real repo path, real dual MIT/Apache-2.0 license (from README, with the real reasoning already written there for why both), real CI/CodeQL/license badges — the same three already live in README | Real, contingent on repo public-visibility being confirmed (see Placeholders) |
| Download | Real per-platform installer availability, IF a tagged release exists at launch; the honest "installers are currently unsigned, expect a Gatekeeper/SmartScreen warning" disclosure carried over verbatim from README if so | MISSING/TBD — confirm before build whether any tagged release exists (see Placeholders) |
| Footer | Typography only: product name, real GitHub link, real license line, real links to `PRIVACY.md`, `SECURITY.md`, `CONTRIBUTING.md` | Ready, no external asset, no invented legal boilerplate |

Every section not marked MISSING has real material behind it: either the app's own already-specified, real rendering logic running on labeled sample data, or real facts quoted from the project's own docs. No section on this list is filled with an invented metric, a stock photo, or a gradient standing in for a picture.

## Local SEO

Not applicable. CodeAtlas is a downloadable desktop application with no physical address, no service area, and no local listing.

## Set pieces

| Set piece | Technique | What it argues |
|---|---|---|
| persistent-orientation-device | orientation | Recreates the app's own real status-strip/sidebar-active-item device as the site's navigation — proves "instrument, not dashboard" structurally instead of describing it, and solves wayfinding on a long single-page site without the floating marketing navbar the app's own spec explicitly rejects in favor of a fixed rail |
| dense-reference-table | table | Renders the real 21 `ResourceKind` values, grouped by their real family colors, as an actual reference table rather than a bulleted feature list — the density itself is the evidence that this product handles real machine complexity, and every cell is real source data, not copywriting |
| display-scale-section-names-cropped | display-crop | Marks the handoff between major beats the same way the app's own `display` token (22px/650, page-level titles) works, just given a marketing page's greater type license and cropped by the viewport — the page's only loud moments, earned by being rare, since the product itself is deliberately quiet everywhere else |

## Typography

- **Display:** Instrument Sans, weight 650 for display-crop section names and hero clause, 500 for sub-clauses. SIL OFL, self-hosted, no CDN.
- **Text:** Instrument Sans 400 (body/prose) and 500 (labels, table headers) — identical family to display, distinguished by weight and scale only, matching the app's own rule that National 2/Instrument Sans never goes past 650.
- **Technical/data voice (third, mandatory role, not optional):** Commit Mono for every literal machine value on the page — paths, ports, versions, CLI commands and output, hashes in the sample fixture, resource kind identifiers in the reference table. Same rule as the app: a value that came from real data or a real command is mono; UI-authored copy is Instrument Sans. Never JetBrains Mono or Fira Code (the app's own doc bans both as the two most generic "dev tool" mono defaults).
- **Scale ratio:** ~1.25 (major third), 7 steps on a 16px root: 16 / 20 / 25 / 31 / 39 / 49 / 61px, plus one jumbo display-crop step outside the ratio, `clamp(96px, 13vw, 220px)`, used only by the display-crop set piece.
- **Tracking:** display ≥48px: −0.01em (matches the app's own negative-tracking-at-size discipline, e.g. its `display` token at −0.2px); body and data: 0.
- **Line-height:** display-crop words: 1.05; hero clause and section headings: 1.15; body prose: 1.55; Commit Mono data blocks: 1.45 (matches the app's `data`/`data-lg` tokens exactly).
- **Measure:** body prose max 66ch; Commit Mono transcript blocks max 80ch (fixed-width tolerates the wider line).

## Color

- **Anchor (OKLCH):** `oklch(0.64 0.12 55)` — converted from the app's real sampled sRGB value `#C4783E`. Locked; see the Banned-for-this-build note above for why it cannot move.
- **Neutral ramp:** the app's real four-step dark surface ladder, unmodified: `#0B0C0F` → `#131519` → `#1B1E23` → `#22252B`, all carrying the icon's own faint cool-charcoal/slight-blue cast. **Deliberately not tinted toward the copper anchor** — this contradicts the generic "tint the ramp toward the accent" instinct on purpose, because the app's own DESIGN.md §8 argues the cool-neutral/warm-accent tension is a feature (National 2's humanist warmth vs. Berkeley Mono's cold precision, with copper sitting correctly between them). Warming the ramp toward copper would resolve a tension the parent spec built on purpose.
- **Accent:** `#C4783E` (dark) / `#A3611F` (light, AA-safe re-tuning, both exact values from the app spec). Same scarcity discipline as the app: one saturated color per fold, never a large fill, never a hero background wash.
- **State colors:** the app's real four, unmodified — healthy `#4FA974`, warning `#D9A441`, error `#E15C5C`, info `#5B9FD9`. Used only for the cleanup-center demo's status dots and the cross-platform table's per-OS state, never decoratively.
- **Light or dark, and why:** dark-first for sections 1–5 (the pitch: hero through cleanup center), matching the app's real default. Light for sections 7–13 (the document: privacy through footer), using the app's real light-mode tokens (`#F4F5F7` / `#FBFBFC` / `#FFFFFF`, real light-mode copper `#A3611F`) — never a generic pure-white swap, so the light half still reads as the same product's real light mode, not a different brand bolted on for the "boring" bottom of the page.
- **Background treatment:** no gradients, no orbs, no glow — banned by the app's own spec as the literal "AI dashboard" tell it exists to avoid. Atmosphere comes from real material only: the live graph canvas itself, the oversized cropped type, and the app's own real 4%-opacity fixed crosshair (§5.1) reused once, faint, behind the hero's graph — a real already-specified device, not an invented texture.

## Space

- **Base unit:** 4px, matching the app.
- **Section rhythm:** two registers, both snapped to the 4px base. "Panel" rhythm (16–24px) for every dense/table/data section (2, 3, 5, 7, 8, 9, 13) — the app's own tight discipline, because these sections are carrying real data at real density. "Breath" rhythm (96–160px) for the sparse sections (1, 4, 6, 10, 12) — a marketing page's earned license, used only where the content itself is spacious (the live graph, the cropped word, reserved screenshot frames, the download CTA).
- **Container widths:** 1120px max for prose and tables; full-bleed (100vw) for the hero graph, the display-crop word, and the reserved screenshot frames.
- **The one deliberate grid break:** the display-crop section names (set 3, "LOCAL.") are allowed to overflow past the 1120px container and get cropped by the viewport edge — the only place on the page anything breaks the container, and it happens exactly once, at the pitch/document pivot.

## Motion

- **Character:** settles, it does not perform — the app's own rule (§6: "motion exists to show a state transition that actually happened") applied to the page itself. If a motion can be deleted without losing information, it doesn't ship.
- **The one orchestrated moment:** the hero's live dependency graph force-settling into place, using the app's real timing (§5.1: converge under ~800ms, then stop simulating — no idle drift). This is the site's single most expressive motion beat, and it is literally the same spec that runs inside the product, not a bespoke marketing animation.
- **Durations:** state (hover, selection) instant, 0ms, per the app's rule that selection should feel like flipping a switch · section entrance 150ms ease-out, fade + 4px shift, reused verbatim from the app's panel-transition spec (§6) · hero graph settle ≤800ms.
- **Easing:** ease-out for entrances, ease-in-out for the rail's progress hairline and any width/collapse transitions — same easing vocabulary as the app.
- **Reduced motion:** disables the rail's progress tween and the section fade+shift (both degrade to instant state changes, never deleted information) and skips the graph's animated settle in favor of the nodes appearing already in their final positions — identical rule to the app's own `prefers-reduced-motion` handling (§6).

## Mobile

- **The rail collapses**, the same way the app's own sidebar collapses to 56px icon-only (§4.2) — from a labeled rail to a slim top progress hairline with the current section's short name only.
- **The dense reference table and the cleanup list stay tables** — horizontally scrollable, never converted to a card stack. The app's own rule ("never a card grid") holds on a 390px viewport exactly as it does at 1440.
- **The live dependency graph demo shrinks but is never removed** — it's the site's proof, not decoration. Pinch-zoom and drag stay active; the fixed frame just gets smaller.
- **Display-crop section names shrink their crop ratio** — still bleeding off one edge on purpose, but sized to stay legible at 390px rather than at the desktop's more aggressive overflow.
- **The download CTA stays dominant** at every width — it's the one action that matters, and it never competes for space with anything else on mobile.

## Density

The swing, in order: **medium** (hero: rail + live graph + one clause) → **full** (product overview's reference table) → **medium** (projects detail pane) → **sparse** (dependency graph, the most spacious section on the page — the demo needs room to be used, not just seen) → **full** (cleanup center list) → **sparse** (the single cropped word, "LOCAL.") → **medium-dense** (privacy's small print) → **medium** (cross-platform's small status table) → **medium-dense** (CLI transcript) → **sparse** (reserved screenshot frames) → **medium** (open source badges + license) → **sparse** (download CTA) → **full** (footer index).

shopify-editions-spring2026's `densityAlternation` measures 0.3 across roughly 39,000px — a modest swing. This page runs a harder swing than that, closer to shopify-editions-summer2025's four-beat pattern (full-bleed screenshot, dense four-column list, full-bleed screenshot, repeated), because our real content is genuinely dense factual data (a 21-row kind table, a live graph, a CLI transcript) rather than lifestyle imagery softened by whitespace — the swing has to be harder to let the dense beats read as dense on purpose rather than as an accident of not having enough to fill the space.

## Reversals

| What was reversed | Why |
|---|---|
| A neutral ramp warmed/tinted toward the copper accent (the generic template default) | The app's own spec keeps the ramp cool and the accent warm on purpose — a deliberate tension (§8), not an oversight to fix |
| Fabricated sample-scan numbers ("Found 34 resources", specific disk sizes) presented as realistic | Kept the same sample fixture everywhere, but every number it produces is labeled "sample data" — never presented as a measurement of a real machine |
| A full light-mode hero, Apple-style black-to-white pivot at the very top of the page | Dark ships first because that's the app's real, documented default; the light hinge happens once, in the back third (privacy through footer), not at the top |
| A generic icon-pack marker set for section transitions (Lucide-style) | The app's own spec bans generic icon packs outright (§7); the site either reuses the app's bespoke circle/line vocabulary or uses no icon at all |
| A testimonials or press-logos section (present in most SaaS marketing-site anatomies) | Zero real testimonials, zero press mentions exist for an unreleased project; fabricating either is explicitly banned |
| A four-tile stat grid summarizing "what CodeAtlas finds" with a big number per tile | No real usage metric exists to put in it, and the app's own spec already names this exact pattern as a banned SaaS-dashboard cliché |
| Shifting the palette anchor to a hue further from the newly-banned `#C63C0C` | The anchor is a locked brand constant sampled from the real app icon, not a free stage-3 pick; documented the real separation instead of moving it |

## Placeholders awaiting client

- [ ] Real product screenshots for Projects, Dependency Graph, and Cleanup Center (being captured in parallel). Reserved frames are sized to the app's real chrome proportions now so they drop in without a redesign pass.
- [ ] Confirm whether the GitHub repository is public at time of site launch. If not, hide the CI/CodeQL/license badges and the GitHub CTA until it is.
- [ ] Confirm whether a tagged release with built installers exists at launch, and for which platforms. If none exists, the Download section's primary CTA becomes "Clone from GitHub" — do not fabricate a release or a platform button that doesn't resolve to a real file.
- [ ] Confirm the "installers are currently unsigned, expect a Gatekeeper/SmartScreen warning" disclosure (carried verbatim from README) is still accurate at launch; remove it the moment signing is added.
- [ ] The final subdomain/URL for the site (brief specifies "a subdomain of levimackay.com" but does not name it).
- [ ] Confirm the macOS/Linux/Windows verification status quoted in the Cross-platform section against `ROADMAP.md` at time of copy-writing — that file may have moved past what's cited here.
- [ ] A short author line for the footer beyond the GitHub link, if wanted — not fabricated, just needs a yes/no and wording.
