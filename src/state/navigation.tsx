import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// CodeAtlas is a single-window desktop app, not a deep-linkable web page —
// ARCHITECTURE.md and the task brief both call for keeping routing simple
// rather than reaching for react-router. This hand-rolled view-state router
// covers everything the app actually needs: named top-level views, a
// selected-resource id that survives navigation (so the detail pane can
// follow you from the graph into Projects, say), and a place for
// view-specific params (e.g. which project the Projects view should focus).

export type ViewId =
  | "overview"
  | "projects"
  | "graph"
  | "processes"
  | "docker"
  | "runtimes"
  | "cleanup"
  | "timeline"
  | "search"
  | "settings";

export interface NavigationState {
  view: ViewId;
  params: Record<string, string | undefined>;
  selectedResourceId: string | null;
  detailPaneOpen: boolean;
}

interface NavigationContextValue extends NavigationState {
  navigate: (view: ViewId, params?: Record<string, string | undefined>) => void;
  selectResource: (id: string | null) => void;
  closeDetailPane: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavigationState>({
    view: "overview",
    params: {},
    selectedResourceId: null,
    detailPaneOpen: false,
  });

  const navigate = useCallback((view: ViewId, params: Record<string, string | undefined> = {}) => {
    setState((s) => ({ ...s, view, params }));
  }, []);

  const selectResource = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedResourceId: id, detailPaneOpen: id !== null }));
  }, []);

  const closeDetailPane = useCallback(() => {
    setState((s) => ({ ...s, detailPaneOpen: false }));
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({ ...state, navigate, selectResource, closeDetailPane }),
    [state, navigate, selectResource, closeDetailPane],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}

export const NAV_ITEMS: { id: ViewId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "graph", label: "Dependency Graph" },
  { id: "processes", label: "Processes & Ports" },
  { id: "docker", label: "Docker" },
  { id: "runtimes", label: "Runtimes & Packages" },
  { id: "cleanup", label: "Cleanup Center" },
  { id: "timeline", label: "Timeline" },
  { id: "search", label: "Search" },
  { id: "settings", label: "Settings" },
];
