import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/appContext";
import { currentUser } from "@/lib/mockData";
import {
  Home, TrendingUp, Brain, Trophy, Heart, Target, BarChart3, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_THEMES } from "@/lib/themes";
import { CountryFlagIcon } from "@/components/CountryFlagIcon";
import { DIRECTOR_PERSONAS } from "@/lib/directorData";

// A friendlier stand-in for the classic hamburger icon — three rounded, unevenly-sized pastel bars
// with a little sparkle, matching the hand-drawn mascot SVGs used throughout the dashboard (TeamSVG,
// GraduationCapSVG, etc.) rather than another flat geometric glyph from the icon set.
function MenuMascotSVG({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="6" width="18" height="3" rx="1.5" fill="#6366F1" />
      <rect x="3" y="11" width="12.5" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="3" y="16" width="18" height="3" rx="1.5" fill="#8B5CF6" />
      <circle cx="19.5" cy="12.5" r="1.6" fill="#FCD34D" />
    </svg>
  );
}

// A cute little paint palette for the country-theme picker trigger — matches the hand-drawn mascot
// icon style used elsewhere in the sidebar (MenuMascotSVG above) rather than a plain lucide glyph.
function PaletteMascotSVG({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3a9 8 0 0 0 0 16c1.4 0 2-.9 2-1.8 0-.6-.4-1.2-.4-1.9 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-3.6-4-6.6-9-6.6Z" fill="#93C5FD" />
      <circle cx="8.3" cy="9.6" r="1.35" fill="#F472B6" />
      <circle cx="12.3" cy="7.4" r="1.35" fill="#FCD34D" />
      <circle cx="16" cy="9.8" r="1.35" fill="#34D399" />
      <circle cx="8.6" cy="14" r="1.35" fill="#A78BFA" />
    </svg>
  );
}

// Directors are usual accounts with an extra supervisory layer, not a separate isolated page — they
// get the full nav any HOD would (Home, Team OKRs, My Goals, Skills Profile, Appreciation Corner,
// Survey Insights, Rewards), just never Admin Console (that stays admin-tier-only). Their multi-
// department oversight is embedded directly into Team OKRs' Key Staff Challenges (scoped to the
// departments they actually oversee) and Skills Profile's Organisational Competency Gaps/Key Staff
// Challenges (org-wide — every department, not just the ones reporting to them, matching an actual
// admin's view) via getRelevantDeptsForViewer — see src/lib/insights.ts.
const NAV = [
  { id: "home", label: "Home", icon: Home, tiers: ["staff", "manager", "admin", "director1", "director2"] },
  { id: "team", label: "Team OKRs", icon: Target, tiers: ["staff", "manager", "admin", "director1", "director2"] },
  { id: "mygoals", label: "My Goals", icon: TrendingUp, tiers: ["staff", "manager", "admin", "director1", "director2"] },
  { id: "skills", label: "Skills Profile", icon: Brain, tiers: ["staff", "manager", "admin", "director1", "director2"] },
  { id: "compliments", label: "Appreciation Corner", icon: Heart, tiers: ["staff", "manager", "admin", "director1", "director2"] },
  { id: "survey", label: "Feedback Corner", icon: BarChart3, tiers: ["manager", "director1", "director2"] },
  { id: "admin", label: "Admin Console", icon: Settings, tiers: ["admin"] },
  { id: "rewards", label: "Rewards", icon: Trophy, tiers: ["staff", "manager", "admin", "director1", "director2"] },
] as const;

const OPS_PERSONAS = [
  { id: "u21", firstName: "Nadia", tier: "ops_hod" as const },
  { id: "u22", firstName: "Victor", tier: "ops_mgr1" as const },
  { id: "u23", firstName: "Marcus", tier: "ops_mgr2" as const },
] as const;

const DIRECTOR_TIER_IDS = ["director1", "director2"] as const;

const OPS_TIER_IDS = ["ops_hod", "ops_mgr1", "ops_mgr2"] as const;

export function Sidebar({
  restricted, onLogout, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, countryTheme, onSetCountryTheme,
}: {
  restricted?: boolean;
  onLogout?: () => void;
  // Desktop icon-rail collapse — only ever applied at the md breakpoint and up (see the `md:`
  // prefix on every class it drives below), so it never affects the mobile drawer's own layout.
  collapsed: boolean;
  onToggleCollapsed: () => void;
  // Mobile off-canvas drawer — irrelevant at md and up, where the sidebar is always in normal flow.
  mobileOpen: boolean;
  onCloseMobile: () => void;
  // Country theme — null means the default app look. Lifted to DashboardShell since applying the
  // theme class to <html> and persisting it both live above this component.
  countryTheme: string | null;
  onSetCountryTheme: (key: string | null) => void;
}) {
  const { tier, setTier, setStaffMemberId, setAdminMemberId, section, setSection, teamMembers, staffList, staffMemberId, adminMemberId, opsMeta, directorMeta } = useApp();
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!themePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) setThemePickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [themePickerOpen]);
  const activeTheme = COUNTRY_THEMES.find(t => t.key === countryTheme) ?? null;
  const isOpsTier = OPS_TIER_IDS.includes(tier as typeof OPS_TIER_IDS[number]);
  const isDirectorTier = DIRECTOR_TIER_IDS.includes(tier as typeof DIRECTOR_TIER_IDS[number]);
  const viewMemberId = !isOpsTier ? (tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null) : null;
  const viewMember = viewMemberId ? teamMembers.find((m) => m.id === viewMemberId) : null;
  const viewStaffEntry = viewMemberId && !viewMember ? staffList.find(s => s.id === viewMemberId) : null;
  const items = NAV.filter((n) => {
    if (n.id === "admin") return tier === "admin";
    if (n.id === "survey") return tier === "manager" || tier === "ops_hod" || tier === "staff" || tier === "ops_mgr1" || isDirectorTier;
    if (isOpsTier) return true;
    return n.tiers.includes(tier as never);
  });
  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  // Use first names for the tier switcher buttons.
  // Always look up from staffList (full user list) so that ops-tier teamMembers override doesn't
  // cause the HCWM buttons to fall back to generic labels like "Staff".
  const tierFirstNames: Record<string, string> = {
    manager: currentUser.name.split(" ")[0],
    staff: staffList.find((s) => s.id === staffMemberId)?.name.split(" ")[0] ?? teamMembers.find((m) => m.id === staffMemberId)?.name.split(" ")[0] ?? "Staff",
    admin: staffList.find((s) => s.id === adminMemberId)?.name.split(" ")[0] ?? teamMembers.find((m) => m.id === adminMemberId)?.name.split(" ")[0] ?? "Admin",
  };
  const opsPersonaName = opsMeta?.user.name ?? null;
  const viewName = isDirectorTier
    ? (directorMeta?.name ?? "Director")
    : isOpsTier
    ? (opsPersonaName ?? "Ops")
    : (viewMember?.name ?? viewStaffEntry?.name ?? currentUser.name);
  // "Feedback Corner & Insights" for anyone who also gets an aggregate view there (HOD, any leave
  // supervisor, or director) — plain "Feedback Corner" for staff who only ever submit.
  const isFeedbackCornerManager = isHod || isDirectorTier || staffList.some(s => s.supervisor === viewName);
  const displayUser = {
    name: viewName,
    designation: isDirectorTier
      ? (directorMeta?.designation ?? "Director")
      : isOpsTier
      ? (opsMeta?.user.designation ?? "Operations")
      : (viewMember?.role ?? viewStaffEntry?.role ?? currentUser.designation),
    avatar: isOpsTier
      ? (opsMeta?.user.avatar ?? "OP")
      : (viewMember?.avatar ?? viewName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()),
  };
  const switchToOps = (persona: typeof OPS_PERSONAS[number]) => {
    setTier(persona.tier);
    // Reset HCWM IDs to defaults when switching to ops tiers
    setStaffMemberId("u1");
    setAdminMemberId("u4");
    setSection("home");
  };
  const switchToDirector = (persona: typeof DIRECTOR_PERSONAS[number]) => {
    setTier(persona.tier);
    setStaffMemberId("u1");
    setAdminMemberId("u4");
    setSection("home");
  };

  const navigate = (id: (typeof NAV)[number]["id"]) => {
    setSection(id);
    onCloseMobile(); // tapping a destination on the mobile drawer should close it, not leave it open over the new page
  };

  return (
    <>
      {/* Mobile backdrop — only ever mounted below md, since md+ keeps the sidebar in normal flow */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground flex flex-col shrink-0 h-screen transition-[width,transform] duration-200",
          "fixed inset-y-0 left-0 z-40 w-72",
          "md:sticky md:top-0 md:z-auto md:translate-x-0",
          collapsed ? "md:w-20" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex items-center justify-between gap-2 px-6 py-6 border-b border-sidebar-border", collapsed && "md:justify-center md:px-3")}>
          <div className={cn("font-display text-xl leading-none", collapsed && "md:hidden")}>Work Buddy</div>
          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:grid size-7 rounded-md place-items-center text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors shrink-0"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          {/* Mobile drawer close */}
          <button
            onClick={onCloseMobile}
            title="Close menu"
            className="md:hidden grid size-7 rounded-md place-items-center text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {items.map((it) => {
            const Icon = it.icon;
            const active = section === it.id;
            return (
              <button
                key={it.id}
                onClick={() => navigate(it.id)}
                title={collapsed ? (it.id === "survey" ? (isFeedbackCornerManager ? "Feedback Corner & Insights" : "Feedback Corner") : it.label) : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  collapsed && "md:justify-center md:px-0",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn(collapsed && "md:hidden")}>
                  {it.id === "survey" ? (isFeedbackCornerManager ? "Feedback Corner & Insights" : "Feedback Corner") : it.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className={cn("px-4 py-4 border-t border-sidebar-border space-y-3", collapsed && "md:px-2")}>
          {!restricted && (
            <div className={cn(collapsed && "md:hidden")}>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1.5">Demo: View as (HCWPM)</div>
              <div className="flex gap-1 bg-sidebar-accent rounded-md p-0.5">
                {(["manager", "staff", "admin"] as const).map((t) => {
                  const isActive = tier === t && (t === "manager" || (t === "staff" && !OPS_PERSONAS.some(p => p.tier === "staff" && staffMemberId === p.id)) || (t === "admin" && !OPS_PERSONAS.some(p => p.tier === "admin" && adminMemberId === p.id)));
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        if (t === "staff") setStaffMemberId("u1");
                        if (t === "admin") setAdminMemberId("u4");
                        setTier(t);
                        const nextTierIds = NAV.filter(n => n.tiers.includes(t)).map(n => n.id);
                        if (!nextTierIds.includes(section as never)) setSection("home");
                      }}
                      className={cn(
                        "flex-1 text-[11px] py-1 rounded transition-all",
                        isActive ? "bg-amber text-amber-foreground font-medium" : "text-sidebar-foreground/70"
                      )}
                    >
                      {tierFirstNames[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {!restricted && (
            <div className={cn(collapsed && "md:hidden")}>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1.5">Credit Risk Management</div>
              <div className="flex gap-1 bg-sidebar-accent rounded-md p-0.5">
                {OPS_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => switchToOps(p)}
                    className={cn(
                      "flex-1 text-[11px] py-1 rounded transition-all",
                      tier === p.tier ? "bg-amber text-amber-foreground font-medium" : "text-sidebar-foreground/70"
                    )}
                  >
                    {p.firstName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!restricted && (
            <div className={cn(collapsed && "md:hidden")}>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1.5">Directors</div>
              <div className="flex gap-1 bg-sidebar-accent rounded-md p-0.5">
                {DIRECTOR_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => switchToDirector(p)}
                    className={cn(
                      "flex-1 text-[11px] py-1 rounded transition-all",
                      tier === p.tier ? "bg-amber text-amber-foreground font-medium" : "text-sidebar-foreground/70"
                    )}
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Country theme picker — a compact palette trigger + popover list, available to every
              user (demo or restricted portal, desktop or mobile) since it's a personal preference,
              not a demo-only control. Persists via DashboardShell's localStorage-backed state. */}
          <div className="relative" ref={themePickerRef}>
            <button
              onClick={() => setThemePickerOpen(v => !v)}
              title="Choose a country theme"
              className={cn(
                "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
                collapsed && "md:justify-center md:px-0"
              )}
            >
              {activeTheme ? (
                <span className="size-4 rounded-full border border-white/40 shrink-0" style={{ background: activeTheme.swatch }} />
              ) : (
                <PaletteMascotSVG />
              )}
              <span className={cn("truncate", collapsed && "md:hidden")}>{activeTheme ? activeTheme.label : "Theme"}</span>
            </button>
            {themePickerOpen && (
              <div className="absolute z-50 bottom-full mb-2 left-0 w-60 rounded-lg border border-border bg-popover shadow-xl p-2.5">
                <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Choose a Country Theme</div>
                {/* Small round flag chips, wrapped a few per row, instead of a one-per-row list —
                    keeps every theme reachable at a glance without the popover turning into a long
                    scroll of text rows. Hand-drawn SVG flags (CountryFlagIcon), not the Unicode flag
                    emoji — Windows' emoji font doesn't reliably render regional-indicator flag
                    glyphs, which is what was showing as blank white circles here. */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { onSetCountryTheme(null); setThemePickerOpen(false); }}
                    title="Default"
                    className={cn(
                      "size-8 rounded-full grid place-items-center bg-gradient-to-br from-primary to-accent transition-transform hover:scale-110 shrink-0",
                      !activeTheme ? "ring-2 ring-primary ring-offset-1 ring-offset-popover" : "ring-1 ring-border"
                    )}
                  >
                    {!activeTheme && <Check className="size-3.5 text-white drop-shadow" />}
                  </button>
                  {COUNTRY_THEMES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => { onSetCountryTheme(t.key); setThemePickerOpen(false); }}
                      title={`${t.label} — ${t.landmark}`}
                      className={cn(
                        "size-8 rounded-full overflow-hidden shrink-0 transition-transform hover:scale-110",
                        countryTheme === t.key ? "ring-2 ring-primary ring-offset-1 ring-offset-popover" : "ring-1 ring-border"
                      )}
                    >
                      <CountryFlagIcon countryKey={t.key} size={32} />
                      <span className="sr-only">{t.label}</span>
                    </button>
                  ))}
                </div>
                {activeTheme && (
                  <div className="mt-2 pt-2 border-t border-border/60 px-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                    <CountryFlagIcon countryKey={activeTheme.key} size={14} className="rounded-sm shrink-0" />
                    {activeTheme.label} — {activeTheme.landmark}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={cn("flex items-center gap-2 text-xs text-sidebar-foreground/70", collapsed && "md:justify-center")}>
            <div
              title={collapsed ? `${displayUser.name} · ${displayUser.designation}` : undefined}
              className="size-8 rounded-full bg-amber text-amber-foreground grid place-items-center font-medium text-xs shrink-0"
            >
              {displayUser.avatar}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
              <div className="truncate text-sidebar-foreground">{displayUser.name}</div>
              <div className="truncate text-[10px]">{displayUser.designation}</div>
            </div>
            {restricted && onLogout && (
              <button
                onClick={onLogout}
                title="Log out"
                className={cn("shrink-0 p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors", collapsed && "md:hidden")}
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export function TopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { tier, teamMembers, staffMemberId, adminMemberId, opsMeta, directorMeta } = useApp();
  const viewMemberId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null;
  const viewMember = viewMemberId ? teamMembers.find((m) => m.id === viewMemberId) : null;
  const displayName = directorMeta ? directorMeta.name : opsMeta ? opsMeta.user.name : (viewMember?.name ?? currentUser.name);
  const firstName = displayName.split(" ")[0];

  return (
    <div className="mb-6 sm:mb-8 flex items-start gap-3">
      <button
        onClick={onOpenSidebar}
        title="Open menu"
        className="md:hidden shrink-0 mt-0.5 size-9 rounded-lg border border-border grid place-items-center text-foreground/70 hover:bg-muted transition-colors"
      >
        <MenuMascotSVG />
      </button>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl mt-1 truncate">Welcome back, {firstName}.</h1>
      </div>
    </div>
  );
}
