import { useQuery } from "@tanstack/react-query";
import { commands } from "./lib/commands";

// Placeholder shell: proves the Rust <-> React wiring works end to end.
// The real application shell (navigation, onboarding, command palette)
// replaces this. See ROADMAP.md.
export default function App() {
  const systemInfo = useQuery({ queryKey: ["system-info"], queryFn: commands.getSystemInfo });

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>CodeAtlas</h1>
      {systemInfo.isLoading && <p>Loading machine info...</p>}
      {systemInfo.data && (
        <p>
          {systemInfo.data.hostname} &middot; {systemInfo.data.os} {systemInfo.data.os_version} &middot;{" "}
          {systemInfo.data.cpu_cores} cores
        </p>
      )}
    </main>
  );
}
