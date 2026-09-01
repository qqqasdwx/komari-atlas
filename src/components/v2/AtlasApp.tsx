"use client";

import { AppHeader } from "@/components/v2/AppHeader";
import { Dashboard } from "@/components/v2/Dashboard";
import { NodeDetail } from "@/components/v2/NodeDetail";
import { AuthGate } from "@/components/v2/AuthGate";
import { useSpaPathname } from "@/hooks/useSpaPathname";

function AuthenticatedApp() {
  const pathname = useSpaPathname();
  const parts = pathname.split("/").filter(Boolean);

  return (
    <div className="atlas-app-shell">
      <AppHeader />
      {parts[0] === "instance" && parts[1]
        ? <NodeDetail uuid={decodeURIComponent(parts[1])} />
        : <Dashboard />}
    </div>
  );
}

export function AtlasApp() {
  return (
    <AuthGate>
      <AuthenticatedApp />
    </AuthGate>
  );
}
