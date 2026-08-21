import type { ResourceKind } from "./types";

// Resource-kind family colors — DESIGN.md 5.2. Dark-mode hex is the value
// authored in DESIGN.md; light-mode values are derived programmatically by
// the same "darken and desaturate ~15-20% for AA contrast on white" rule
// DESIGN.md 3.2 specifies rather than picked by eye, so the two modes can
// never drift out of sync with each other.
export const KIND_COLORS_DARK: Record<ResourceKind, string> = {
  project: "#C4783E",
  git_repository: "#C1583E",
  process: "#5B9FD9",
  runtime: "#4C8DC4",
  network_listener: "#3E77A8",
  port: "#7BB3E5",
  docker_container: "#8A6FD1",
  docker_image: "#7159B8",
  docker_volume: "#A48EE0",
  docker_network: "#5B4696",
  package_manager: "#3FAA9C",
  package: "#5FC4B6",
  tool: "#C9A64A",
  environment_variable: "#B8934A",
  ssh_config_entry: "#A7873F",
  config_file: "#D4B968",
  build_artifact: "#7A7E86",
  cache: "#7A7E86",
  disk_usage_entry: "#7A7E86",
  service: "#C15C8E",
  database: "#A34473",
};

// Seven kind families, for the graph legend (DESIGN.md 5.4) and any other
// place resources need to be grouped by domain rather than exact kind.
export const KIND_FAMILIES: { id: string; label: string; kinds: ResourceKind[] }[] = [
  { id: "origin", label: "Origin", kinds: ["project"] },
  { id: "vcs", label: "Version control", kinds: ["git_repository"] },
  {
    id: "runtime",
    label: "Runtime & process",
    kinds: ["process", "runtime", "network_listener", "port"],
  },
  {
    id: "containers",
    label: "Containers",
    kinds: ["docker_container", "docker_image", "docker_volume", "docker_network"],
  },
  { id: "packages", label: "Package management", kinds: ["package_manager", "package"] },
  {
    id: "environment",
    label: "Environment & tooling",
    kinds: ["tool", "environment_variable", "ssh_config_entry", "config_file"],
  },
  {
    id: "ephemeral",
    label: "Ephemeral / storage",
    kinds: ["build_artifact", "cache", "disk_usage_entry"],
  },
  { id: "service", label: "Service infrastructure", kinds: ["service", "database"] },
];

function darkenHex(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const scale = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(scale(r))}${toHex(scale(g))}${toHex(scale(b))}`;
}

export const KIND_COLORS_LIGHT: Record<ResourceKind, string> = Object.fromEntries(
  Object.entries(KIND_COLORS_DARK).map(([kind, hex]) => [kind, darkenHex(hex, 0.18)]),
) as Record<ResourceKind, string>;

export function kindColor(kind: ResourceKind, theme: "dark" | "light"): string {
  return theme === "dark" ? KIND_COLORS_DARK[kind] : KIND_COLORS_LIGHT[kind];
}

export function kindFamily(kind: ResourceKind): string {
  return KIND_FAMILIES.find((f) => f.kinds.includes(kind))?.id ?? "ephemeral";
}

const KIND_LABELS: Record<ResourceKind, string> = {
  project: "Project",
  git_repository: "Git repository",
  process: "Process",
  port: "Port",
  docker_container: "Container",
  docker_image: "Image",
  docker_volume: "Volume",
  docker_network: "Docker network",
  database: "Database",
  runtime: "Runtime",
  package_manager: "Package manager",
  package: "Package",
  tool: "Tool",
  environment_variable: "Env var",
  ssh_config_entry: "SSH config",
  build_artifact: "Build artifact",
  cache: "Cache",
  service: "Service",
  config_file: "Config file",
  disk_usage_entry: "Disk usage",
  network_listener: "Listener",
};

export function kindLabel(kind: ResourceKind): string {
  return KIND_LABELS[kind] ?? kind;
}
