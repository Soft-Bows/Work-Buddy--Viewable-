import { useApp } from "@/lib/appContext";
import { currentUser } from "@/lib/mockData";
import {
  Home, TrendingUp, Brain, Trophy, Sparkles, Target, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "home", label: "Home", icon: Home, tiers: ["staff", "manager", "admin"] },
  { id: "team", label: "Team Goals", icon: Target, tiers: ["staff", "manager", "admin"] },
  { id: "mygoals", label: "My Goals", icon: TrendingUp, tiers: ["staff", "manager", "admin"] },
  { id: "skills", label: "Skills Profile", icon: Brain, tiers: ["staff", "manager", "admin"] },
  { id: "compliments", label: "Send Compliments", icon: Sparkles, tiers: ["staff", "manager", "admin"] },
  { id: "survey", label: "Survey Insights", icon: BarChart3, tiers: ["manager"] },
  { id: "admin", label: "Admin Console", icon: Settings, tiers: ["admin"] },
  { id: "rewards", label: "Rewards", icon: Trophy, tiers: ["staff", "manager", "admin"] },
] as const;

const OPS_PERSONAS = [
  { id: "u21", firstName: "Eliza", tier: "ops_hod" as const },
  { id: "u22", firstName: "Brandon", tier: "ops_mgr1" as const },
  { id: "u23", firstName: "Frankie", tier: "ops_mgr2" as const },
] as const;

const OPS_TIER_IDS = ["ops_hod", "ops_mgr1", "ops_mgr2"] as const;

export function Sidebar() {
  const { tier, setTier, setStaffMemberId, setAdminMemberId, section, setSection, teamMembers, staffList, staffMemberId, adminMemberId, opsMeta } = useApp();
  const isOpsTier = OPS_TIER_IDS.includes(tier as typeof OPS_TIER_IDS[number]);
  const viewMemberId = !isOpsTier ? (tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null) : null;
  const viewMember = viewMemberId ? teamMembers.find((m) => m.id === viewMemberId) : null;
  const viewStaffEntry = viewMemberId && !viewMember ? staffList.find(s => s.id === viewMemberId) : null;
  const items = NAV.filter((n) => {
    if (n.id === "admin") return tier === "admin";
    if (n.id === "survey") return tier === "manager" || tier === "ops_hod" || tier === "staff" || tier === "ops_mgr1";
    if (isOpsTier) return true;
    return n.tiers.includes(tier as never);
  });
  // Use first names for the tier switcher buttons.
  // Always look up from staffList (full user list) so that ops-tier teamMembers override doesn't
  // cause the HCWM buttons to fall back to generic labels like "Staff".
  const tierFirstNames: Record<string, string> = {
    manager: currentUser.name.split(" ")[0],
    staff: staffList.find((s) => s.id === staffMemberId)?.name.split(" ")[0] ?? teamMembers.find((m) => m.id === staffMemberId)?.name.split(" ")[0] ?? "Staff",
    admin: staffList.find((s) => s.id === adminMemberId)?.name.split(" ")[0] ?? teamMembers.find((m) => m.id === adminMemberId)?.name.split(" ")[0] ?? "Admin",
  };
  const opsPersonaName = opsMeta?.user.name ?? null;
  const viewName = isOpsTier
    ? (opsPersonaName ?? "Ops")
    : (viewMember?.name ?? viewStaffEntry?.name ?? currentUser.name);
  const displayUser = {
    name: viewName,
    designation: isOpsTier
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

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-amber text-amber-foreground grid place-items-center font-display font-bold text-lg">W</div>
          <div>
            <div className="font-display text-xl leading-none">Work Buddy</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = section === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setSection(it.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1.5">Demo: View as (HCWM)</div>
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
        <div>
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1.5">Affluent Markets</div>
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
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
          <div className="size-8 rounded-full bg-amber text-amber-foreground grid place-items-center font-medium text-xs shrink-0">
            {displayUser.avatar}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sidebar-foreground">{displayUser.name}</div>
            <div className="truncate text-[10px]">{displayUser.designation}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TopBar() {
  const { tier, teamMembers, staffMemberId, adminMemberId, opsMeta } = useApp();
  const viewMemberId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null;
  const viewMember = viewMemberId ? teamMembers.find((m) => m.id === viewMemberId) : null;
  const displayName = opsMeta ? opsMeta.user.name : (viewMember?.name ?? currentUser.name);
  const firstName = displayName.split(" ")[0];

  return (
    <div className="mb-8">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </div>
      <h1 className="font-display text-3xl mt-1">Welcome back, {firstName}.</h1>
    </div>
  );
}
