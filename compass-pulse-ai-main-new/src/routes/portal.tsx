import { createFileRoute } from "@tanstack/react-router";
import { PortalGate } from "@/components/portal/PortalGate";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [{ title: "My Account — Work Buddy" }],
  }),
  component: PortalGate,
});
