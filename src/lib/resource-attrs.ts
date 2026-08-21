import type { Resource } from "./types";

export function attr(resource: Resource, key: string): unknown {
  return resource.attributes[key];
}

export function asString(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
