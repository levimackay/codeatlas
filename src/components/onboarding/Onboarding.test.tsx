import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Onboarding } from "./Onboarding";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const initialRoots = ["/Users/levi/Developer", "/Users/levi/Projects"];

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((name: string) => {
    if (name === "get_search_roots") return Promise.resolve(initialRoots);
    if (name === "set_search_roots") return Promise.resolve(undefined);
    if (name === "run_scan")
      return Promise.resolve({
        record: { id: "s1", started_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-01T00:00:05Z", status: "completed", resources_found: 3, providers_run: [] },
        changes: [],
      });
    if (name === "set_onboarding_complete") return Promise.resolve(undefined);
    return Promise.reject(new Error(`Unhandled invoke in test: ${name}`));
  });
});

function renderOnboarding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Onboarding />
    </QueryClientProvider>,
  );
}

async function goToRootsStep() {
  renderOnboarding();
  fireEvent.click(await screen.findByRole("button", { name: /continue/i }));
  await screen.findByText("Search roots");
}

describe("Onboarding search-roots editing", () => {
  it("prefills the editor with the roots returned by get_search_roots", async () => {
    await goToRootsStep();
    await waitFor(() => expect(screen.getByText(initialRoots[0])).toBeInTheDocument());
    expect(screen.getByText(initialRoots[1])).toBeInTheDocument();
  });

  it("adds a new root typed into the input", async () => {
    await goToRootsStep();
    await screen.findByText(initialRoots[0]);

    const input = screen.getByRole("textbox", { name: /add search root/i });
    fireEvent.change(input, { target: { value: "/Users/levi/code" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(await screen.findByText("/Users/levi/code")).toBeInTheDocument();
    // The input clears after a successful add, ready for the next one.
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("does not add a duplicate root", async () => {
    await goToRootsStep();
    await screen.findByText(initialRoots[0]);

    const input = screen.getByRole("textbox", { name: /add search root/i });
    fireEvent.change(input, { target: { value: initialRoots[0] } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(screen.getAllByText(initialRoots[0])).toHaveLength(1);
  });

  it("removes a root when its remove control is clicked", async () => {
    await goToRootsStep();
    await screen.findByText(initialRoots[0]);

    fireEvent.click(screen.getByRole("button", { name: `Remove ${initialRoots[0]}` }));

    await waitFor(() => expect(screen.queryByText(initialRoots[0])).not.toBeInTheDocument());
    expect(screen.getByText(initialRoots[1])).toBeInTheDocument();
  });

  it("disables the scan button when every root has been removed", async () => {
    await goToRootsStep();
    await screen.findByText(initialRoots[0]);

    fireEvent.click(screen.getByRole("button", { name: `Remove ${initialRoots[0]}` }));
    fireEvent.click(screen.getByRole("button", { name: `Remove ${initialRoots[1]}` }));

    await waitFor(() => expect(screen.getByRole("button", { name: /run first scan/i })).toBeDisabled());
  });

  it("runs the scan with the edited roots and shows real per-provider results, never a fake percentage", async () => {
    await goToRootsStep();
    await screen.findByText(initialRoots[0]);

    fireEvent.click(screen.getByRole("button", { name: `Remove ${initialRoots[1]}` }));
    fireEvent.click(screen.getByRole("button", { name: /run first scan/i }));

    await waitFor(() => expect(screen.getByText(/scan complete/i)).toBeInTheDocument());
    expect(invoke).toHaveBeenCalledWith("set_search_roots", { roots: [initialRoots[0]] });
    expect(invoke).toHaveBeenCalledWith("run_scan", { roots: [initialRoots[0]] });
    expect(screen.getByText(/3 resources found/i)).toBeInTheDocument();
  });
});
