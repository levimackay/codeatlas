import { useOnboardingCompleteQuery } from "./lib/queries";
import { NavigationProvider } from "./state/navigation";
import { Onboarding } from "./components/onboarding/Onboarding";
import { AppShell } from "./components/shell/AppShell";

// Top-level gate: onboarding on first run, the full application shell once
// getOnboardingComplete() is true. NavigationProvider only wraps the shell
// — onboarding is a linear flow with its own local step state, not part of
// the app's view router.
export default function App() {
  const { data: onboardingComplete, isLoading } = useOnboardingCompleteQuery();

  if (isLoading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-canvas)", color: "var(--text-tertiary)" }} className="text-body-sm">
        Loading CodeAtlas…
      </div>
    );
  }

  if (!onboardingComplete) {
    return <Onboarding />;
  }

  return (
    <NavigationProvider>
      <AppShell />
    </NavigationProvider>
  );
}
