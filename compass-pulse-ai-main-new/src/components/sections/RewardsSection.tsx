import React, { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { Trophy, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/mockData";

/* ── Header SVGs ─────────────────────────────────────────────────────────── */

function GiftBowSVG() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
      <rect x="4" y="18" width="28" height="14" rx="2" fill="#3B82F6"/>
      <rect x="3" y="14" width="30" height="6" rx="2" fill="#93C5FD"/>
      <rect x="16" y="14" width="4" height="18" fill="#22D3EE"/>
      <path d="M18 14 Q8 8 6 4 Q12 4 18 12Z" fill="#FCD34D"/>
      <path d="M18 14 Q28 8 30 4 Q24 4 18 12Z" fill="#FCD34D"/>
      <circle cx="18" cy="14" r="2.5" fill="#F59E0B"/>
      <circle cx="9" cy="22" r="1.2" fill="white" fillOpacity="0.6"/>
      <circle cx="27" cy="26" r="1" fill="white" fillOpacity="0.6"/>
    </svg>
  );
}

function ConfettiSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
      <rect x="4" y="12" width="6" height="4" rx="1" fill="#3B82F6" transform="rotate(-30 7 14)"/>
      <rect x="14" y="4" width="5" height="3" rx="1" fill="#FCD34D" transform="rotate(15 16 5)"/>
      <rect x="22" y="10" width="6" height="4" rx="1" fill="#F472B6" transform="rotate(-20 25 12)"/>
      <rect x="8" y="22" width="5" height="3" rx="1" fill="#4ADE80" transform="rotate(25 10 23)"/>
      <rect x="22" y="22" width="6" height="3" rx="1" fill="#A78BFA" transform="rotate(-15 25 23)"/>
      <circle cx="17" cy="17" r="2.5" fill="#22D3EE"/>
      <circle cx="5" cy="8" r="1.5" fill="#FCD34D"/>
      <circle cx="29" cy="6" r="1.2" fill="#F472B6"/>
      <circle cx="28" cy="28" r="1.5" fill="#4ADE80"/>
    </svg>
  );
}

/* ── Brand logos ─────────────────────────────────────────────────────────── */

const BRAND_STYLES: Record<string, { bg: string; color: string }> = {
  "Grab":            { bg: "#00B14F", color: "#fff" },
  "Starbucks":       { bg: "#00704A", color: "#fff" },
  "FairPrice":       { bg: "#e42025", color: "#fff" },
  "Cold Storage":    { bg: "#0055a4", color: "#fff" },
  "CapitaLand Mall": { bg: "#e03127", color: "#fff" },
};

function BrandLogo({ name }: { name: string }) {
  const style = BRAND_STYLES[name] ?? { bg: "#666", color: "#fff" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {name}
    </span>
  );
}

/* ── Kawaii SVG illustrations ────────────────────────────────────────────── */

function CupSVG() {
  return (
    <svg width="80" height="88" viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Steam swirls */}
      <path d="M28 22 Q24 14 28 8 Q32 2 28 -2" stroke="#D97706" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M40 20 Q36 12 40 6 Q44 0 40 -4" stroke="#B45309" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d="M52 22 Q48 14 52 8 Q56 2 52 -2" stroke="#D97706" strokeWidth="2.2" fill="none" strokeLinecap="round"/>

      {/* Saucer */}
      <ellipse cx="40" cy="76" rx="28" ry="6" fill="#92400E"/>
      <ellipse cx="40" cy="74" rx="28" ry="6" fill="#B45309"/>

      {/* Cup body */}
      <path d="M16 38 L20 70 Q20 74 24 74 L56 74 Q60 74 60 70 L64 38 Z" fill="#92400E"/>
      <path d="M16 38 L20 70 Q20 74 24 74 L56 74 Q60 74 60 70 L64 38 Z" fill="#B45309"/>

      {/* Cup rim */}
      <ellipse cx="40" cy="38" rx="24" ry="5" fill="#D97706"/>

      {/* Coffee surface */}
      <ellipse cx="40" cy="38" rx="20" ry="4" fill="#FEF3C7"/>
      <ellipse cx="40" cy="38" rx="16" ry="3" fill="#FCD34D" fillOpacity="0.6"/>

      {/* Handle */}
      <path d="M64 44 Q76 44 76 56 Q76 68 64 68" stroke="#92400E" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M64 44 Q74 44 74 56 Q74 66 64 68" stroke="#D97706" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Cute face on cup */}
      <circle cx="34" cy="54" r="2" fill="#FEF3C7"/>
      <circle cx="46" cy="54" r="2" fill="#FEF3C7"/>
      <path d="M35 62 Q40 66 45 62" stroke="#FEF3C7" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* Stars */}
      <text x="8" y="36" fontSize="10" fill="#FCD34D">★</text>
      <text x="64" y="32" fontSize="8" fill="#FCD34D">★</text>

      {/* Hearts */}
      <path d="M10 50 Q10 46 14 46 Q18 46 18 50 Q18 54 10 58 Q2 54 2 50 Q2 46 6 46 Q10 46 10 50Z" fill="#F472B6" fillOpacity="0.7" transform="scale(0.5) translate(4,40)"/>
      <path d="M10 50 Q10 46 14 46 Q18 46 18 50 Q18 54 10 58 Q2 54 2 50 Q2 46 6 46 Q10 46 10 50Z" fill="#F472B6" fillOpacity="0.6" transform="scale(0.4) translate(146,70)"/>
    </svg>
  );
}

function ShoppingBagSVG() {
  return (
    <svg width="80" height="90" viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkle stars */}
      <text x="4" y="18" fontSize="12" fill="#FB7185">✦</text>
      <text x="64" y="14" fontSize="9" fill="#F9A8D4">✦</text>
      <text x="68" y="50" fontSize="10" fill="#FB7185">✦</text>
      <text x="2" y="55" fontSize="8" fill="#F9A8D4">★</text>

      {/* Bag handles */}
      <path d="M26 28 Q26 10 40 10 Q54 10 54 28" stroke="#BE185D" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M26 28 Q26 10 40 10 Q54 10 54 28" stroke="#FB7185" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Bag body shadow */}
      <rect x="13" y="28" width="54" height="52" rx="8" fill="#BE185D" fillOpacity="0.4" transform="translate(2,2)"/>

      {/* Bag body */}
      <rect x="13" y="28" width="54" height="52" rx="8" fill="#FB7185"/>

      {/* Bag body shine/gradient overlay */}
      <rect x="13" y="28" width="54" height="26" rx="8" fill="#FCA5A5" fillOpacity="0.4"/>

      {/* Ribbon vertical */}
      <rect x="37" y="28" width="6" height="52" fill="#BE185D" fillOpacity="0.5"/>

      {/* Ribbon horizontal */}
      <rect x="13" y="50" width="54" height="6" fill="#BE185D" fillOpacity="0.5"/>

      {/* Bow center */}
      <circle cx="40" cy="53" r="5" fill="#FDF2F8"/>

      {/* Bow left */}
      <ellipse cx="28" cy="53" rx="9" ry="5" fill="#F9A8D4"/>
      {/* Bow right */}
      <ellipse cx="52" cy="53" rx="9" ry="5" fill="#F9A8D4"/>
      {/* Bow center dot */}
      <circle cx="40" cy="53" r="4" fill="#FB7185"/>
      <circle cx="40" cy="53" r="2" fill="#FDF2F8"/>

      {/* Cute face */}
      <circle cx="30" cy="70" r="2.2" fill="#FDF2F8"/>
      <circle cx="50" cy="70" r="2.2" fill="#FDF2F8"/>
      <path d="M32 78 Q40 83 48 78" stroke="#FDF2F8" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Heart accent */}
      <path d="M40 38 Q40 34 44 34 Q48 34 48 38 Q48 42 40 46 Q32 42 32 38 Q32 34 36 34 Q40 34 40 38Z" fill="#FDF2F8" fillOpacity="0.6"/>
    </svg>
  );
}

function DiamondGemSVG() {
  return (
    <svg width="82" height="88" viewBox="0 0 82 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles */}
      <text x="2" y="18" fontSize="11" fill="#C4B5FD">✦</text>
      <text x="68" y="14" fontSize="9" fill="#818CF8">✦</text>
      <text x="74" y="50" fontSize="10" fill="#C4B5FD">★</text>
      <text x="0" y="54" fontSize="8" fill="#A5B4FC">✦</text>
      <text x="34" y="8" fontSize="7" fill="#C4B5FD">✦</text>

      {/* Shadow */}
      <ellipse cx="41" cy="78" rx="22" ry="4" fill="#4C1D95" fillOpacity="0.18"/>

      {/* Top girdle */}
      <path d="M41 18 L18 42 L41 42 L64 42 Z" fill="#A78BFA"/>
      {/* Left upper face */}
      <path d="M41 18 L18 42 L29 28 Z" fill="#7C3AED"/>
      {/* Right upper face */}
      <path d="M41 18 L64 42 L53 28 Z" fill="#7C3AED"/>
      {/* Left upper mid */}
      <path d="M29 28 L18 42 L41 42 Z" fill="#8B5CF6"/>
      {/* Right upper mid */}
      <path d="M53 28 L64 42 L41 42 Z" fill="#8B5CF6"/>

      {/* Lower pavilion */}
      <path d="M18 42 L41 42 L41 72 Z" fill="#5B21B6"/>
      <path d="M64 42 L41 42 L41 72 Z" fill="#4C1D95"/>
      <path d="M18 42 L27 54 L41 72 Z" fill="#6D28D9"/>
      <path d="M64 42 L55 54 L41 72 Z" fill="#5B21B6"/>

      {/* Highlight flash */}
      <path d="M41 18 L34 30 L41 34 L48 30 Z" fill="white" fillOpacity="0.55"/>
      <path d="M24 36 L29 42 L34 38 Z" fill="white" fillOpacity="0.25"/>
      <path d="M58 36 L53 42 L48 38 Z" fill="white" fillOpacity="0.2"/>

      {/* Center sparkle */}
      <circle cx="41" cy="42" r="3" fill="white" fillOpacity="0.35"/>

      <defs>
        <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA"/>
          <stop offset="100%" stopColor="#5B21B6"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Illustration & gradient maps ────────────────────────────────────────── */

const REWARD_ILLUSTRATIONS: Record<string, () => React.ReactElement> = {
  rw1: CupSVG,
  rw2: ShoppingBagSVG,
  rw3: DiamondGemSVG,
};

const REWARD_GRADIENTS: Record<string, string> = {
  rw1: "linear-gradient(135deg, rgba(251,191,36,0.85) 0%, rgba(249,115,22,0.85) 100%)",
  rw2: "linear-gradient(135deg, rgba(251,113,133,0.85) 0%, rgba(236,72,153,0.85) 100%)",
  rw3: "linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(124,58,237,0.9) 100%)",
};

/* ── Section ─────────────────────────────────────────────────────────────── */

const AUDIENCE_LABELS: Record<Activity["audience"], string> = {
  all: "All Staff",
  manager: "Managers & HODs",
  hod: "HODs Only",
};
const CATEGORY_COLORS: Record<Activity["category"], string> = {
  goal: "bg-primary/10 text-primary border-primary/20",
  recognition: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-700/30",
  skill: "bg-teal/10 text-teal border-teal/20",
  engagement: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/30",
  penalty: "bg-rag-red/10 text-rag-red border-rag-red/20",
};

export function RewardsSection() {
  const {
    tier, points, staffPoints, adminPoints,
    staffMemberId, adminMemberId,
    rewardsCatalog, pointsLog, redeemReward: redeemRewardCtx,
    liveActivities,
  } = useApp();
  const [display, setDisplay] = useState(0);

  const viewedUserId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : "u0";
  const displayPoints = tier === "staff" ? staffPoints : tier === "admin" ? adminPoints : points;
  const viewedLog = pointsLog.filter(p => p.userId === viewedUserId);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = display, to = displayPoints, dur = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplay(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPoints]);

  const redeem = (cost: number, name: string) => {
    if (displayPoints < cost) return;
    void redeemRewardCtx(cost, name);
    toast.success(`🎉 Redeemed: ${name}`);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground border-0">
        <div className="text-xs uppercase tracking-widest opacity-70">Your Points This Month</div>
        <div className="font-display text-7xl mt-2 flex items-baseline gap-3">
          {display.toLocaleString()}
          <Trophy className="size-7 text-amber" />
        </div>
        <div className="text-sm opacity-80 mt-1">Points YTD</div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <GiftBowSVG />
              <h2 className="font-display text-2xl">Rewards Catalog</h2>
              <ConfettiSVG />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {rewardsCatalog.map((r) => {
              const eligible = displayPoints >= r.points;
              const brands = (r as any).brands as string[] | undefined;
              const Illustration = REWARD_ILLUSTRATIONS[r.id];
              const gradient = REWARD_GRADIENTS[r.id] ?? "linear-gradient(135deg,#6366f1,#8b5cf6)";
              return (
                <Card key={r.id} className={cn("flex flex-col p-0 overflow-hidden", eligible && "glow-amber")}>
                  {/* Kawaii illustration banner */}
                  <div
                    className="w-full h-24 flex items-center justify-center shrink-0"
                    style={{ background: gradient }}
                  >
                    {Illustration && <Illustration />}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-4 pt-3">
                    <div className="font-medium text-sm leading-snug">{r.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Giftano e-voucher</div>

                    {brands && brands.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {brands.map((b) => <BrandLogo key={b} name={b} />)}
                      </div>
                    )}

                    <div className="flex-1" />

                    <div className="text-xs text-muted-foreground mt-3">{r.points} pts</div>
                    <button
                      onClick={() => redeem(r.points, r.name)}
                      disabled={!eligible}
                      className={cn(
                        "mt-2 w-full text-sm py-2 rounded-md transition-all",
                        eligible
                          ? "bg-amber text-amber-foreground hover:opacity-90 font-medium"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      {eligible ? "Redeem" : `Need ${r.points - displayPoints} more pts`}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <SectionTitle sub="Updates unique to your account">Recent Activity</SectionTitle>
          <div className="space-y-3">
            {viewedLog.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No activity recorded yet.</div>
            ) : [...viewedLog].reverse().map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-border/60 last:border-0">
                <div>
                  <div>{p.text}</div>
                  <div className="text-xs text-muted-foreground">{p.date}</div>
                </div>
                <div className={cn("font-medium", p.pts < 0 ? "text-rag-red/80" : "text-amber-foreground")}>
                  {p.pts < 0 ? String(p.pts) : `+${p.pts}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Activity Catalog ──────────────────────────────────────────────── */}
      <ActivityCatalog activities={liveActivities} tier={tier} />
    </div>
  );
}

const CATALOG_CATEGORY_LABELS: Record<Activity["category"], string> = {
  goal: "Goal Management",
  recognition: "Recognition",
  skill: "Skill Development",
  engagement: "Team Engagement",
  penalty: "Penalty",
};

// Each audience tier gets a distinct visual section in the catalog
const CATALOG_AUDIENCE_SECTIONS: { key: Activity["audience"]; label: string; roleNote: string; borderClass: string; headerClass: string }[] = [
  {
    key: "all",
    label: "All Staff",
    roleNote: "Applies to everyone",
    borderClass: "border-primary/20",
    headerClass: "bg-primary/5 border-b border-primary/15",
  },
  {
    key: "manager",
    label: "Managers & HODs",
    roleNote: "You have additional responsibilities as a manager",
    borderClass: "border-violet-300/50 dark:border-violet-500/30",
    headerClass: "bg-violet-50/60 border-b border-violet-200/60 dark:bg-violet-900/10 dark:border-violet-700/30",
  },
  {
    key: "hod",
    label: "HODs Only",
    roleNote: "As Head of Department, these activities apply exclusively to you",
    borderClass: "border-amber-300/60 dark:border-amber-500/30",
    headerClass: "bg-amber-50/60 border-b border-amber-200/60 dark:bg-amber-900/10 dark:border-amber-700/30",
  },
];

function ActivityCatalog({ activities, tier }: { activities: Activity[]; tier: string }) {
  const [open, setOpen] = useState(false);
  const isManager = tier === "manager" || tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";
  const isHod = tier === "manager" || tier === "ops_hod";

  const liveActivities = activities.filter(a => a.live);

  const relevantAudienceSections = CATALOG_AUDIENCE_SECTIONS.filter(s =>
    s.key === "all" ||
    (s.key === "manager" && isManager) ||
    (s.key === "hod" && isHod)
  );

  const relevantActivities = liveActivities.filter(a =>
    a.audience === "all" ||
    (a.audience === "manager" && isManager) ||
    (a.audience === "hod" && isHod)
  );

  const compulsoryCount = relevantActivities.filter(a => a.isCompulsory).length;
  const optionalCount = relevantActivities.filter(a => !a.isCompulsory && a.points > 0).length;

  // Group activities within an audience section by category
  const byCategory = (aud: Activity["audience"]) => {
    const items = liveActivities.filter(a => a.audience === aud);
    const map = new Map<Activity["category"], Activity[]>();
    items.forEach(a => {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    });
    return map;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="size-5 text-primary" />
          <div className="text-left">
            <div className="font-semibold text-sm">Activity Catalog</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {compulsoryCount} compulsory · {optionalCount} optional — all the ways you can earn &amp; lose points
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="bg-card border-t border-border p-6 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Activities marked <strong>Required</strong> are compulsory for your role. Failing to complete them within the stated deadline will result in an automatic points penalty. Optional activities are bonus opportunities to earn extra points. This catalog is maintained by HR and updates in real time.
          </p>

          {relevantAudienceSections.map(section => {
            const catMap = byCategory(section.key);
            if (catMap.size === 0) return null;
            return (
              <div key={section.key} className={cn("rounded-xl border overflow-hidden", section.borderClass)}>
                <div className={cn("px-4 py-3", section.headerClass)}>
                  <div className="text-sm font-semibold">{section.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{section.roleNote}</div>
                </div>

                <div className="p-4 space-y-4">
                  {(["goal", "recognition", "skill", "engagement", "penalty"] as Activity["category"][])
                    .filter(cat => catMap.has(cat))
                    .map(cat => {
                      const items = catMap.get(cat)!;
                      return (
                        <div key={cat}>
                          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                            {CATALOG_CATEGORY_LABELS[cat]}
                          </div>
                          <div className="space-y-2">
                            {items.map(a => (
                              <div
                                key={a.id}
                                className={cn(
                                  "rounded-xl border px-4 py-3",
                                  a.isCompulsory
                                    ? "border-amber-200/60 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-900/5"
                                    : a.points < 0
                                      ? "border-rag-red/20 bg-rag-red/5"
                                      : "border-border bg-muted/20"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium">{a.name}</span>
                                      {a.isCompulsory && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30 shrink-0 font-medium">Required</span>
                                      )}
                                    </div>

                                    {/* Timeline deadline */}
                                    {a.isCompulsory && a.timelineDays && a.timelineTrigger && (
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                          Deadline:
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          Complete within <strong>{a.timelineDays} day{a.timelineDays !== 1 ? "s" : ""}</strong> of {a.timelineTrigger}
                                        </span>
                                      </div>
                                    )}

                                    {/* Penalty warning */}
                                    {a.isCompulsory && a.penaltyPoints != null && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[10px] font-medium text-rag-red/80">If overdue:</span>
                                        <span className="text-[10px] text-rag-red/70">
                                          <strong>−{a.penaltyPoints} pts</strong> automatically deducted from your balance
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className={cn("text-sm font-bold shrink-0 mt-0.5", a.points > 0 ? "text-teal" : "text-rag-red")}>
                                    {a.points > 0 ? `+${a.points}` : a.points} pts
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}

          {relevantAudienceSections.every(s => byCategory(s.key).size === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No activities published yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
