import { useEffect, useState } from "react";
import { LoginPage } from "@/components/portal/LoginPage";
import { PortalDashboard } from "@/components/portal/PortalDashboard";
import { getPortalSession } from "@/lib/portalSession";

// Renders the login page or the signed-in single-account dashboard, based on whether a portal
// session exists in this browser. Used both as the /portal route and (when VITE_LANDING_MODE is
// "portal") as the landing content at "/" for the second preview server.
//
// Session state only exists in localStorage, which isn't available during SSR — so this defers
// the login-vs-dashboard decision to a post-mount effect (rendering nothing in between) rather
// than branching on it during the initial render, which would mismatch the server-rendered markup.
export function PortalGate() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setUserId(getPortalSession()?.userId ?? null);
  }, []);

  if (userId === undefined) return null;
  if (userId === null) return <LoginPage />;
  return <PortalDashboard userId={userId} />;
}
