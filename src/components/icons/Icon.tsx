import type { ReactElement } from "react";
import type { ResourceKind } from "../../lib/types";

// A small bespoke glyph set built on the app mark's own geometric
// vocabulary — circles, straight connecting lines, and the occasional
// single rectangle — per DESIGN.md section 7. Explicitly not a generic
// icon pack (Lucide/Feather/Heroicons): every glyph here is drawn from the
// same three primitives so the set reads as one thing. 20x20 viewBox,
// 1.5px monoline stroke, rounded caps/joins, colored via currentColor.

export type IconName =
  | ResourceKind
  | "search"
  | "settings"
  | "close"
  | "expand"
  | "collapse"
  | "sort-asc"
  | "sort-desc"
  | "filter"
  | "external-link"
  | "warning"
  | "more"
  | "resize-handle"
  | "command"
  | "scan"
  | "check"
  | "copy"
  | "chevron-right"
  | "folder"
  | "timeline";

const SHARED_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Each entry is the inner SVG markup for a 20x20 viewBox glyph.
const GLYPHS: Record<IconName, ReactElement> = {
  project: (
    <>
      <circle cx="10" cy="6" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="5" cy="15" r="2.2" />
      <circle cx="15" cy="15" r="2.2" />
      <line x1="10" y1="8.6" x2="6.2" y2="13.2" />
      <line x1="10" y1="8.6" x2="13.8" y2="13.2" />
    </>
  ),
  git_repository: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="15" r="2" />
      <circle cx="15" cy="10" r="2" />
      <line x1="6" y1="7" x2="6" y2="13" />
      <path d="M6 7 C6 10 9 10 13 10" />
    </>
  ),
  process: (
    <>
      <circle cx="10" cy="10" r="4" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  runtime: (
    <>
      <circle cx="10" cy="10" r="6" />
      <line x1="10" y1="4" x2="10" y2="7" />
      <line x1="10" y1="13" x2="10" y2="16" />
      <line x1="4" y1="10" x2="7" y2="10" />
      <line x1="13" y1="10" x2="16" y2="10" />
    </>
  ),
  network_listener: (
    <>
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="4" />
      <circle cx="10" cy="10" r="7.2" strokeDasharray="1.5 2.5" />
    </>
  ),
  port: (
    <>
      <rect x="4" y="7" width="12" height="6" rx="1.5" />
      <line x1="7" y1="7" x2="7" y2="4.5" />
      <line x1="13" y1="7" x2="13" y2="4.5" />
    </>
  ),
  docker_container: (
    <>
      <rect x="4" y="4" width="12" height="12" rx="1.5" />
      <circle cx="10" cy="10" r="2.6" />
    </>
  ),
  docker_image: (
    <>
      <rect x="4" y="4" width="12" height="12" rx="1.5" />
      <circle cx="10" cy="10" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  docker_volume: (
    <>
      <rect x="5" y="3.5" width="10" height="13" rx="1.5" />
      <line x1="5" y1="8" x2="15" y2="8" />
      <line x1="5" y1="12" x2="15" y2="12" />
    </>
  ),
  docker_network: (
    <>
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="15" cy="6" r="1.8" />
      <circle cx="10" cy="15" r="1.8" />
      <line x1="6.3" y1="7.2" x2="9" y2="13.3" />
      <line x1="13.7" y1="7.2" x2="11" y2="13.3" />
      <line x1="6.8" y1="6" x2="13.2" y2="6" />
    </>
  ),
  database: (
    <>
      <ellipse cx="10" cy="5.5" rx="5.5" ry="2" />
      <path d="M4.5 5.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9" />
      <path d="M4.5 10c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" />
    </>
  ),
  package_manager: (
    <>
      <rect x="4.5" y="6" width="11" height="10" rx="1.2" />
      <path d="M4.5 6l5.5-2.5L15.5 6" />
      <line x1="10" y1="6" x2="10" y2="16" />
    </>
  ),
  package: (
    <>
      <path d="M10 3.5l6 3v7l-6 3-6-3v-7z" />
      <path d="M4 6.5l6 3 6-3" />
      <line x1="10" y1="9.5" x2="10" y2="16.5" />
    </>
  ),
  tool: (
    <>
      <path d="M13.2 6.8a3 3 0 0 1-4-4l1.6 1.6-1 1 1-1-1.6-1.6a3 3 0 0 1 4 4l3.3 3.3a1 1 0 0 1-1.4 1.4z" />
      <circle cx="6" cy="14" r="1.8" />
    </>
  ),
  environment_variable: (
    <>
      <path d="M6 5L3.5 10 6 15" />
      <path d="M14 5l2.5 5-2.5 5" />
      <line x1="11.5" y1="4.5" x2="8.5" y2="15.5" />
    </>
  ),
  ssh_config_entry: (
    <>
      <rect x="5" y="9" width="10" height="7" rx="1.2" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
      <circle cx="10" cy="12.3" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  build_artifact: (
    <>
      <rect x="4.5" y="4.5" width="11" height="11" rx="1.2" />
      <line x1="4.5" y1="8.5" x2="15.5" y2="8.5" />
      <line x1="8.5" y1="8.5" x2="8.5" y2="15.5" />
    </>
  ),
  cache: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M10 4a6 6 0 0 1 6 6" strokeDasharray="1.5 2" />
    </>
  ),
  service: (
    <>
      <circle cx="10" cy="10" r="3" />
      <line x1="10" y1="3.5" x2="10" y2="6" />
      <line x1="10" y1="14" x2="10" y2="16.5" />
      <line x1="3.5" y1="10" x2="6" y2="10" />
      <line x1="14" y1="10" x2="16.5" y2="10" />
      <line x1="5.6" y1="5.6" x2="7.3" y2="7.3" />
      <line x1="12.7" y1="12.7" x2="14.4" y2="14.4" />
    </>
  ),
  config_file: (
    <>
      <path d="M6 3.5h6l3 3v10h-9z" />
      <path d="M12 3.5v3h3" />
      <line x1="7.5" y1="11" x2="12.5" y2="11" />
      <line x1="7.5" y1="13.5" x2="12.5" y2="13.5" />
    </>
  ),
  disk_usage_entry: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
      <line x1="10" y1="3.5" x2="10" y2="10" />
    </>
  ),
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="4.5" />
      <line x1="12" y1="12" x2="16.5" y2="16.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.4" />
      <line x1="10" y1="3.5" x2="10" y2="5.5" />
      <line x1="10" y1="14.5" x2="10" y2="16.5" />
      <line x1="3.5" y1="10" x2="5.5" y2="10" />
      <line x1="14.5" y1="10" x2="16.5" y2="10" />
      <line x1="5.6" y1="5.6" x2="7" y2="7" />
      <line x1="13" y1="13" x2="14.4" y2="14.4" />
      <line x1="14.4" y1="5.6" x2="13" y2="7" />
      <line x1="7" y1="13" x2="5.6" y2="14.4" />
    </>
  ),
  close: (
    <>
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </>
  ),
  expand: (
    <>
      <circle cx="10" cy="10" r="6" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="10" y1="7" x2="10" y2="13" />
    </>
  ),
  collapse: (
    <>
      <circle cx="10" cy="10" r="6" />
      <line x1="7" y1="10" x2="13" y2="10" />
    </>
  ),
  "sort-asc": (
    <>
      <line x1="6" y1="14" x2="6" y2="6" />
      <path d="M3.5 8.5L6 6l2.5 2.5" />
    </>
  ),
  "sort-desc": (
    <>
      <line x1="6" y1="6" x2="6" y2="14" />
      <path d="M3.5 11.5L6 14l2.5-2.5" />
    </>
  ),
  filter: (
    <>
      <line x1="4" y1="6" x2="16" y2="6" />
      <line x1="6.5" y1="10" x2="13.5" y2="10" />
      <line x1="9" y1="14" x2="11" y2="14" />
    </>
  ),
  "external-link": (
    <>
      <path d="M8.5 4.5h7v7" />
      <line x1="15.3" y1="4.7" x2="8.5" y2="11.5" />
      <path d="M12.5 10v5.5h-8v-8H10" />
    </>
  ),
  warning: (
    <>
      <path d="M10 3.8l6.8 12.4H3.2z" />
      <line x1="10" y1="8.5" x2="10" y2="12" />
      <circle cx="10" cy="14.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  "resize-handle": (
    <>
      <line x1="8" y1="4" x2="8" y2="16" />
      <line x1="12" y1="4" x2="12" y2="16" />
    </>
  ),
  command: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="6" cy="14" r="2" />
      <circle cx="14" cy="14" r="2" />
      <line x1="8" y1="6" x2="12" y2="6" />
      <line x1="8" y1="14" x2="12" y2="14" />
      <line x1="6" y1="8" x2="6" y2="12" />
      <line x1="14" y1="8" x2="14" y2="12" />
    </>
  ),
  scan: (
    <>
      <circle cx="10" cy="10" r="6" />
      <line x1="14.3" y1="14.3" x2="17" y2="17" />
      <line x1="10" y1="7" x2="10" y2="10" />
      <line x1="10" y1="10" x2="12.2" y2="11.4" />
    </>
  ),
  check: (
    <>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </>
  ),
  copy: (
    <>
      <rect x="4" y="4" width="9" height="9" rx="1.2" />
      <path d="M7 16h6.5a2.5 2.5 0 0 0 2.5-2.5V7" />
    </>
  ),
  "chevron-right": (
    <>
      <path d="M7.5 4.5l6 5.5-6 5.5" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 6.5a1 1 0 0 1 1-1h4l1.5 2h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11.5a1 1 0 0 1-1-1z" />
    </>
  ),
  timeline: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <line x1="10" y1="6" x2="10" y2="10" />
      <line x1="10" y1="10" x2="13" y2="12" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  className,
  title,
}: {
  name: IconName;
  size?: 16 | 20;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      {...SHARED_PROPS}
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[name]}
    </svg>
  );
}
