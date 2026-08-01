import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/lib/appContext";
import { Sidebar, TopBar } from "@/components/Sidebar";
import { HomeSection } from "@/components/sections/HomeSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { SurveySection } from "@/components/sections/SurveySection";
import { RewardsSection } from "@/components/sections/RewardsSection";
import { ComplimentsSection } from "@/components/sections/ComplimentsSection";
import { MyGoalsSection } from "@/components/sections/MyGoalsSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { AdminSection } from "@/components/sections/AdminSection";
import { AIAssistant } from "@/components/AIAssistant";
import type { Tier } from "@/lib/mockData";
import { COUNTRY_THEME_STORAGE_KEY, COUNTRY_THEMES, themeClassName, buildCursorStyle, buildOmbreCursorStyle } from "@/lib/themes";
import { ThemedBackdrop } from "@/components/ThemedBackdrop";
import { ThemeClickBurst } from "@/components/ThemeClickBurst";
import { showGreetingToast } from "@/lib/greetingToast";

// The single dashboard tree used by both the unrestricted `/` route (localhost:8080 — free
// persona switching) and the Work Buddy login portal (restricted to one logged-in account, no
// switcher). `restricted`/`initialTier`/`onLogout` are no-ops unless explicitly passed, so the
// plain `/` route renders exactly as before.
// Below this width the sidebar (still in its normal, expanded, non-collapsed desktop state) starts
// eating into content space rather than just looking a little snug — the threshold for the one-time
// "you might want to collapse this" nudge below. Deliberately wider than Tailwind's own md (768px)
// breakpoint, where the sidebar has already fully switched to an off-canvas drawer and isn't
// obscuring anything, so the nudge fires while the sidebar is still visible and worth collapsing.
const SIDEBAR_NUDGE_WIDTH = 1024;

export function DashboardShell({
  restricted,
  initialTier,
  onLogout,
}: {
  restricted?: boolean;
  initialTier?: Tier;
  onLogout?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Country theme — per-user, persisted in localStorage, available to every user on desktop or
  // mobile (not gated by tier/restricted). Starts null (default app look) on both server and first
  // client render to avoid a hydration mismatch; the real saved value (if any) is read and applied
  // in the effect below, right after mount.
  const [countryTheme, setCountryTheme] = useState<string | null>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem(COUNTRY_THEME_STORAGE_KEY);
    if (saved) setCountryTheme(saved);
  }, []);
  // Greeted once per app load/restart — time-of-day-appropriate, in the active country theme's own
  // language (plain English if no theme is selected) — see greetingToast.tsx.
  useEffect(() => {
    showGreetingToast();
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.forEach(c => { if (c.startsWith("theme-")) root.classList.remove(c); });
    const className = themeClassName(countryTheme);
    if (className) root.classList.add(className);
    if (countryTheme) window.localStorage.setItem(COUNTRY_THEME_STORAGE_KEY, countryTheme);
    else window.localStorage.removeItem(COUNTRY_THEME_STORAGE_KEY);

    // Cursor theming — a normal arrow pointer tinted with the theme's accent colour stands in for
    // the mouse cursor over plain content while a theme is active. Anything actually clickable gets
    // a second, ombre (gradient) version of the same arrow instead of silently falling back to the
    // browser's plain system pointer — the gradient itself is the "this is clickable" signal, rather
    // than the cursor going flat/uncoloured exactly where it matters most. Injected as a single
    // <style> tag rather than inline styles since `cursor` needs to apply page-wide, and this needs
    // to update/clear cleanly every time the selection changes.
    let styleTag = document.getElementById("country-cursor-style") as HTMLStyleElement | null;
    const theme = COUNTRY_THEMES.find(t => t.key === countryTheme);
    if (theme) {
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "country-cursor-style";
        document.head.appendChild(styleTag);
      }
      const clickableSelectors = [
        "button:not(:disabled)", "a[href]", '[role="button"]', ".cursor-pointer", "summary",
        'input[type="checkbox"]', 'input[type="radio"]',
      ].map(s => `html.${className} ${s}`).join(", ");
      styleTag.textContent =
        `html.${className} { cursor: ${buildCursorStyle(theme.swatch)}; }\n` +
        `${clickableSelectors} { cursor: ${buildOmbreCursorStyle(theme.swatch)}; }`;
    } else if (styleTag) {
      styleTag.remove();
    }
  }, [countryTheme]);
  // Guards against re-toasting on every subsequent resize tick once the user has already been
  // nudged (or has already collapsed the sidebar themselves) this session.
  const nudgedRef = useRef(false);

  useEffect(() => {
    const checkWidth = () => {
      if (nudgedRef.current || collapsed) return;
      if (window.innerWidth >= SIDEBAR_NUDGE_WIDTH) return;
      nudgedRef.current = true;
      toast("Viewing on a smaller screen?", {
        description: "Collapse the sidebar for a roomier view.",
        action: { label: "Collapse", onClick: () => setCollapsed(true) },
        duration: 10_000,
      });
    };
    checkWidth(); // also catch a page load that starts narrow, not just a resize into narrow
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [collapsed]);

  return (
    <AppProvider initialTier={initialTier}>
      <div className="flex min-h-screen w-full">
        <ThemedBackdrop themeKey={countryTheme} />
        <ThemeClickBurst themeKey={countryTheme} />
        <Sidebar
          restricted={restricted}
          onLogout={onLogout}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          countryTheme={countryTheme}
          onSetCountryTheme={setCountryTheme}
        />
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 max-w-[1400px]">
          <TopBar onOpenSidebar={() => setMobileOpen(true)} />
          <Content />
        </main>
        <ViewerScopedAIAssistant />
        <Toaster position="bottom-left" />
      </div>
    </AppProvider>
  );
}

// A stable identity for "who is effectively viewing the dashboard right now." Switching between
// personas (the demo tier switcher, a different staff/admin persona, or an ops persona) re-renders
// consumers with new props/context, but React still sees the *same* component type at the *same*
// position in the tree — so without a key tied to that identity, it reuses the existing instance
// instead of remounting, and every bit of local useState nested arbitrarily deep inside (an
// Objective card left open in edit mode, a draft textarea, a counterpropose panel, an AI Assistant
// chat thread, etc.) silently survives the switch. That's how an Objective the HOD left in edit mode
// could still render as "in edit mode" after switching to a staff account that isn't even allowed to
// edit it — the component instance was never actually reset, just re-rendered with different
// permissions. Keying a subtree on viewer identity forces a full unmount/remount on every switch,
// which is also just correct: switching accounts should never carry over unsaved UI state.
function useViewerKey(): string {
  const { tier, staffMemberId, adminMemberId, opsMeta } = useApp();
  return `${tier}:${staffMemberId}:${adminMemberId}:${opsMeta?.personaId ?? ""}`;
}

function Content() {
  const { section } = useApp();
  const viewerKey = useViewerKey();
  const activeSection = (() => {
    switch (section) {
      case "home": return <HomeSection />;
      case "team": return <TeamSection />;
      case "survey": return <SurveySection />;
      case "rewards": return <RewardsSection />;
      case "compliments": return <ComplimentsSection />;
      case "mygoals": return <MyGoalsSection />;
      case "skills": return <SkillsSection />;
      case "admin": return <AdminSection />;
      default: return <HomeSection />;
    }
  })();
  return <div key={viewerKey}>{activeSection}</div>;
}

function ViewerScopedAIAssistant() {
  const viewerKey = useViewerKey();
  return <AIAssistant key={viewerKey} />;
}
