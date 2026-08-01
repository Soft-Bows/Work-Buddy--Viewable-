import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { PortalGate } from "@/components/portal/PortalGate";

const isPortalMode = import.meta.env.VITE_LANDING_MODE === "portal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: isPortalMode
      ? [
          { title: "Sign in — Work Buddy" },
          { name: "description", content: "Sign in to your Work Buddy account." },
        ]
      : [
          { title: "Pulse — Unified Manager Intelligence" },
          { name: "description", content: "Pulse: warm, modern manager intelligence dashboard. Goals, team progress, survey insights, rewards, and AI-curated action plans." },
          { property: "og:title", content: "Pulse — Unified Manager Intelligence" },
          { property: "og:description", content: "Goals, team progress, survey insights, rewards, and AI-curated action plans." },
        ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  component: Index,
});

// This server instance's own `.env.portal` sets VITE_LANDING_MODE=portal (see dev:portal in
// package.json) so its root URL lands on the Work Buddy login page instead of the dashboard.
// The default (unset) case — including localhost:8080 — is completely unchanged.
function Index() {
  if (isPortalMode) return <PortalGate />;
  return <DashboardShell />;
}
