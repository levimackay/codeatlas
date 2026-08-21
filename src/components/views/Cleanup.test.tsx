import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Cleanup } from "./Cleanup";
import { NavigationProvider } from "../../state/navigation";
import type { CleanupCandidate, Graph } from "../../lib/types";

const graph: Graph = {
  resources: {
    "dep-1": {
      id: "dep-1",
      kind: "project",
      name: "focus-frog",
      path: "/Users/levi/Developer/focus-frog",
      attributes: {},
      evidence: [],
      first_seen: "2026-01-01T00:00:00Z",
      last_seen: "2026-01-01T00:00:00Z",
    },
  },
  relationships: [],
};

const candidateWithDependents: CleanupCandidate = {
  resource_id: "cache-1",
  resource_kind: "cache",
  name: "node_modules/.cache",
  path: "/Users/levi/Developer/focus-frog/node_modules/.cache",
  category: "cache",
  reasoning: "Build cache untouched for 90 days.",
  evidence: [],
  last_used: "2026-05-01T00:00:00Z",
  depended_on_by: ["dep-1"],
  size_bytes: 512_000_000,
  reversible: true,
  consequence: "Will be regenerated on next build.",
};

const candidateWithoutDependents: CleanupCandidate = {
  resource_id: "artifact-1",
  resource_kind: "build_artifact",
  name: "dist/",
  path: "/Users/levi/Developer/old-project/dist",
  category: "stale_build_artifact",
  reasoning: "No build in over a year and the project itself looks abandoned.",
  evidence: [],
  last_used: null,
  depended_on_by: [],
  size_bytes: 1_200_000,
  reversible: false,
  consequence: "Would need a full rebuild to recreate.",
};

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

vi.mock("@tauri-apps/plugin-opener", () => ({ revealItemInDir: vi.fn() }));

function mockCandidates(candidates: CleanupCandidate[]) {
  invoke.mockImplementation((name: string) => {
    if (name === "list_cleanup_candidates") return Promise.resolve(candidates);
    if (name === "get_graph") return Promise.resolve(graph);
    return Promise.reject(new Error(`Unhandled invoke in test: ${name}`));
  });
}

beforeEach(() => {
  invoke.mockReset();
});

function renderCleanup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NavigationProvider>
        <Cleanup />
      </NavigationProvider>
    </QueryClientProvider>,
  );
}

describe("Cleanup Center dependency-warning display", () => {
  it("shows a visible dependency warning for a candidate with depended_on_by entries", async () => {
    mockCandidates([candidateWithDependents]);
    renderCleanup();

    const warning = await screen.findByRole("alert");
    // The count/label sentence is split across sibling text nodes by JSX
    // interpolation, so match on the alert's combined text content.
    expect(warning.textContent).toMatch(/1 resource.*depend on this/i);
    // The dependent resource is named, not just counted.
    expect(within(warning).getByText("focus-frog")).toBeInTheDocument();
  });

  it("shows no dependency warning for a candidate with an empty depended_on_by list", async () => {
    mockCandidates([candidateWithoutDependents]);
    renderCleanup();

    await screen.findByText("dist/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/depends on this/i)).not.toBeInTheDocument();
  });

  it("never renders a delete affordance — only reveal and copy-path", async () => {
    mockCandidates([candidateWithDependents, candidateWithoutDependents]);
    renderCleanup();

    await screen.findByText("node_modules/.cache");
    expect(screen.queryByText(/^delete$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/remove/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/open in finder/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/copy path/i).length).toBeGreaterThan(0);
    // The header copy is explicit that nothing here is destructive.
    expect(screen.getByText(/does not delete anything for you yet/i)).toBeInTheDocument();
  });

  it("distinguishes reversible from non-reversible candidates", async () => {
    mockCandidates([candidateWithDependents, candidateWithoutDependents]);
    renderCleanup();

    await screen.findByText("node_modules/.cache");
    expect(screen.getByText("reversible")).toBeInTheDocument();
    expect(screen.getByText("not reversible")).toBeInTheDocument();
  });
});
