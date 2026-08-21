import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commands } from "./commands";

// Central TanStack Query hooks. Nothing outside this file should import
// `commands` directly except onboarding, which needs bespoke mutation
// sequencing (see Onboarding.tsx).

export function useSystemInfoQuery() {
  return useQuery({ queryKey: ["system-info"], queryFn: commands.getSystemInfo, staleTime: Infinity });
}

export function usePlatformCapabilitiesQuery() {
  return useQuery({ queryKey: ["platform-capabilities"], queryFn: commands.getPlatformCapabilities, staleTime: Infinity });
}

export function useGraphQuery() {
  return useQuery({ queryKey: ["graph"], queryFn: commands.getGraph });
}

export function useChangesQuery(limit?: number) {
  return useQuery({ queryKey: ["changes", limit], queryFn: () => commands.listChanges(limit) });
}

export function useScansQuery(limit?: number) {
  return useQuery({ queryKey: ["scans", limit], queryFn: () => commands.listScans(limit) });
}

export function useCleanupCandidatesQuery() {
  return useQuery({ queryKey: ["cleanup-candidates"], queryFn: commands.listCleanupCandidates });
}

export function useSearchRootsQuery() {
  return useQuery({ queryKey: ["search-roots"], queryFn: commands.getSearchRoots });
}

export function useOnboardingCompleteQuery() {
  return useQuery({ queryKey: ["onboarding-complete"], queryFn: commands.getOnboardingComplete });
}

export function useSearchResourcesQuery(query: string, limit?: number) {
  return useQuery({
    queryKey: ["search-resources", query, limit],
    queryFn: () => commands.searchResources(query, limit),
    enabled: query.trim().length > 0,
  });
}

export function useRunScanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roots?: string[]) => commands.runScan(roots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graph"] });
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      queryClient.invalidateQueries({ queryKey: ["scans"] });
      queryClient.invalidateQueries({ queryKey: ["cleanup-candidates"] });
    },
  });
}

export function useSetSearchRootsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roots: string[]) => commands.setSearchRoots(roots),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-roots"] }),
  });
}
