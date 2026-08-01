import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/portal/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Work Buddy" }],
  }),
  component: LoginPage,
});
