import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { ThemeProvider } from "./state/theme";
import type { Graph } from "./lib/types";

const emptyGraph: Graph = { resources: {}, relationships: [] };

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

function mockCommand(name: string, args: unknown) {
  switch (name) {
    case "get_onboarding_complete":
      return true;
    case "get_graph":
      return emptyGraph;
    case "list_changes":
      return [];
    case "list_scans":
      return [];
    case "list_cleanup_candidates":
      return [];
    case "get_search_roots":
      return ["/Users/levi/Developer"];
    case "get_system_info":
      return {
        os: "macos",
        os_version: "26.5",
        architecture: "arm64",
        hostname: "levis-mac",
        home_directory: "/Users/levi",
        cpu_cores: 12,
        total_memory_bytes: 34_359_738_368,
      };
    case "get_platform_capabilities":
      return { processes: true, ports: true, services: true, disk_usage: true, application_inventory: true };
    default:
      throw new Error(`Unhandled invoke in test: ${name} ${JSON.stringify(args)}`);
  }
}

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((name: string, args?: unknown) => Promise.resolve(mockCommand(name, args)));
});

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("App", () => {
  it("renders the application shell once onboarding is already complete", async () => {
    renderWithProviders(<App />);
    await waitFor(() => expect(screen.getByText("CodeAtlas")).toBeInTheDocument());
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("shows the onboarding welcome flow when onboarding has not been completed", async () => {
    invoke.mockImplementation((name: string, args?: unknown) => {
      if (name === "get_onboarding_complete") return Promise.resolve(false);
      return Promise.resolve(mockCommand(name, args));
    });
    renderWithProviders(<App />);
    await waitFor(() => expect(screen.getByText(/surveyor's instrument/i)).toBeInTheDocument());
    expect(screen.getByText(/WHAT IT NEVER DOES/i)).toBeInTheDocument();
  });
});
