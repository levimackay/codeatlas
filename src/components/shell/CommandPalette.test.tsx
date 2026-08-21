import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandPalette } from "./CommandPalette";
import { NavigationProvider, useNavigation } from "../../state/navigation";
import type { Graph } from "../../lib/types";

const graph: Graph = {
  resources: {
    "res-1": {
      id: "res-1",
      kind: "project",
      name: "Focus Frog",
      path: "/Users/levi/Developer/focus-frog",
      attributes: {},
      evidence: [],
      first_seen: "2026-01-01T00:00:00Z",
      last_seen: "2026-01-01T00:00:00Z",
    },
    "res-2": {
      id: "res-2",
      kind: "process",
      name: "node",
      path: null,
      attributes: {},
      evidence: [],
      first_seen: "2026-01-01T00:00:00Z",
      last_seen: "2026-01-01T00:00:00Z",
    },
  },
  relationships: [],
};

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((name: string) => {
    if (name === "get_graph") return Promise.resolve(graph);
    if (name === "run_scan")
      return Promise.resolve({
        record: { id: "s", started_at: "", finished_at: null, status: "completed", resources_found: 0, providers_run: [] },
        changes: [],
      });
    return Promise.reject(new Error(`Unhandled invoke in test: ${name}`));
  });
});

function ViewProbe() {
  const { view, selectedResourceId } = useNavigation();
  return (
    <div>
      <div data-testid="current-view">{view}</div>
      <div data-testid="selected-resource">{selectedResourceId ?? "none"}</div>
    </div>
  );
}

function renderPalette() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NavigationProvider>
        <CommandPalette />
        <ViewProbe />
      </NavigationProvider>
    </QueryClientProvider>,
  );
}

function openPalette() {
  fireEvent.keyDown(window, { key: "k", metaKey: true });
}

describe("CommandPalette fuzzy navigation", () => {
  it("opens on Cmd+K and fuzzy-matches a resource by a non-contiguous subsequence of its name", async () => {
    renderPalette();
    openPalette();

    const input = await screen.findByRole("combobox", { name: /command palette input/i });
    // "fcfrg" is a subsequence of "Focus Frog" but not a literal substring —
    // this is exactly the case a naive `includes()` filter would reject.
    fireEvent.change(input, { target: { value: "fcfrg" } });

    await waitFor(() => expect(screen.getByText("Focus Frog")).toBeInTheDocument());
    expect(screen.queryByText("node")).not.toBeInTheDocument();
  });

  it("navigates via keyboard: filter to a result and Enter runs it", async () => {
    renderPalette();
    openPalette();

    const input = await screen.findByRole("combobox", { name: /command palette input/i });
    fireEvent.change(input, { target: { value: "go to cleanup" } });

    await waitFor(() => expect(screen.getByText("Go to Cleanup Center")).toBeInTheDocument());
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByTestId("current-view")).toHaveTextContent("cleanup"));
    // The palette closes itself after running a result.
    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
  });

  it("selecting a resource result opens the detail pane for that resource", async () => {
    renderPalette();
    openPalette();

    const input = await screen.findByRole("combobox", { name: /command palette input/i });
    fireEvent.change(input, { target: { value: "Focus Frog" } });

    const result = await screen.findByText("Focus Frog");
    fireEvent.click(result);

    await waitFor(() => expect(screen.getByTestId("selected-resource")).toHaveTextContent("res-1"));
  });

  it("closes on Escape without running anything", async () => {
    renderPalette();
    openPalette();

    await screen.findByRole("dialog", { name: /command palette/i });
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument());
    expect(screen.getByTestId("current-view")).toHaveTextContent("overview");
  });
});
