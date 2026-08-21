import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({
    os: "macos",
    os_version: "26.5",
    architecture: "arm64",
    hostname: "levis-mac",
    home_directory: "/Users/levi",
    cpu_cores: 12,
    total_memory_bytes: 34_359_738_368,
  }),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("App", () => {
  it("renders machine info once the system_info command resolves", async () => {
    renderWithClient(<App />);
    await waitFor(() => expect(screen.getByText(/levis-mac/)).toBeInTheDocument());
    expect(screen.getByText(/macos/)).toBeInTheDocument();
  });
});
