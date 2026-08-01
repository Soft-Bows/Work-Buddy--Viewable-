import React, { useEffect, useState } from "react";
import { Card, SectionTitle, MascotFlourish } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { Trophy, BookOpen, ChevronDown, ChevronUp, Target, Heart, GraduationCap, Users, AlertTriangle, ShieldCheck, Sparkles, Pencil, Save, X, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { cn, stripLeadingZero, getCurrentQuarterStart } from "@/lib/utils";
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
    updateRewardCatalogItem,
    liveActivities,
  } = useApp();
  const [display, setDisplay] = useState(0);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; points: number }>({ name: "", points: 0 });

  const viewedUserId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : "u0";
  const displayPoints = tier === "staff" ? staffPoints : tier === "admin" ? adminPoints : points;
  const viewedLog = pointsLog.filter(p => p.userId === viewedUserId);
  // "Recent Activity" — up to 10 most recent, newest first (pointsLog is already sorted newest-first
  // server-side; no reversal needed here).
  const recentLog = viewedLog.slice(0, 10);

  // Rewards already redeemed this quarter, by name — resets automatically once
  // getCurrentQuarterStart() rolls forward, since this is recomputed on every render rather than
  // stored as its own flag.
  const quarterStartIso = getCurrentQuarterStart().toISOString();
  const redeemedThisQuarter = new Set(
    viewedLog
      .filter(p => p.text.startsWith("Redeemed: ") && p.rawDate >= quarterStartIso)
      .map(p => p.text.replace(/^Redeemed:\s*/, ""))
  );

  const startEditReward = (r: { id: string; name: string; points: number }) => {
    setEditingRewardId(r.id);
    setEditDraft({ name: r.name, points: r.points });
  };
  const cancelEditReward = () => setEditingRewardId(null);
  const saveEditReward = (id: string) => {
    if (!editDraft.name.trim()) { toast.error("Reward name is required"); return; }
    updateRewardCatalogItem(id, editDraft);
    toast.success("Reward updated");
    setEditingRewardId(null);
  };

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
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground border-0">
        <div className="text-xs uppercase tracking-widest opacity-70">Your Points This Month</div>
        <div className="font-display text-7xl mt-2 flex items-baseline gap-3">
          {display.toLocaleString()}
          <Trophy className="size-7 text-amber" />
        </div>
        <div className="text-sm opacity-80 mt-1">Points YTD</div>
        <MascotFlourish
          src="/mascot/in-pocket.png"
          className="absolute -bottom-4 -right-2 h-36 w-auto opacity-95"
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <GiftBowSVG />
              <h2 className="font-display text-2xl">Rewards Catalog</h2>
              <ConfettiSVG />
              <MascotFlourish src="/mascot/floating-coin.png" className="h-12 w-auto ml-auto" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rewardsCatalog.map((r) => {
              const eligible = displayPoints >= r.points;
              const alreadyRedeemedThisQuarter = redeemedThisQuarter.has(r.name);
              const brands = (r as any).brands as string[] | undefined;
              const Illustration = REWARD_ILLUSTRATIONS[r.id];
              const gradient = REWARD_GRADIENTS[r.id] ?? "linear-gradient(135deg,#6366f1,#8b5cf6)";
              const isEditing = editingRewardId === r.id;
              return (
                <Card key={r.id} className={cn("flex flex-col p-0 overflow-hidden relative", eligible && !alreadyRedeemedThisQuarter && "glow-amber")}>
                  {/* Kawaii illustration banner */}
                  <div
                    className="w-full h-24 flex items-center justify-center shrink-0"
                    style={{ background: gradient }}
                  >
                    {Illustration && <Illustration />}
                  </div>

                  {tier === "admin" && !isEditing && (
                    <button
                      onClick={() => startEditReward(r)}
                      title="Edit reward"
                      className="absolute top-2 right-2 size-7 rounded-full bg-white/90 hover:bg-white grid place-items-center shadow-sm"
                    >
                      <Pencil className="size-3.5 text-foreground" />
                    </button>
                  )}

                  {/* Content */}
                  <div className="flex flex-col flex-1 p-4 pt-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reward Type</label>
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                            className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Points Required</label>
                          <input
                            type="number"
                            value={editDraft.points}
                            onChange={e => setEditDraft(d => ({ ...d, points: Number(stripLeadingZero(e.target.value)) }))}
                            className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button onClick={() => saveEditReward(r.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                            <Save className="size-3" /> Save
                          </button>
                          <button onClick={cancelEditReward} className="size-8 rounded-md border border-border hover:bg-muted grid place-items-center">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                          disabled={!eligible || alreadyRedeemedThisQuarter}
                          className={cn(
                            "mt-2 w-full text-sm py-2 rounded-md transition-all flex items-center justify-center gap-1.5",
                            eligible && !alreadyRedeemedThisQuarter
                              ? "bg-amber text-amber-foreground hover:opacity-90 font-medium"
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                        >
                          {alreadyRedeemedThisQuarter
                            ? (<><Clock3 className="size-3.5" /> Redeemed this quarter</>)
                            : eligible ? "Redeem" : `Need ${r.points - displayPoints} more pts`}
                        </button>
                        {alreadyRedeemedThisQuarter && (
                          <div className="text-[10px] text-muted-foreground mt-1 text-center">Resets on the next quarter's first working day</div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <SectionTitle sub="Your 10 most recent updates">Recent Activity</SectionTitle>
          <div className="space-y-3">
            {recentLog.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No activity recorded yet.</div>
            ) : recentLog.map((p) => (
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

// Category icon + colour — purely visual, so each activity reads at a glance in the redesigned catalog
const CATALOG_CATEGORY_STYLE: Record<Activity["category"], { icon: typeof Target; className: string }> = {
  goal: { icon: Target, className: "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30" },
  recognition: { icon: Heart, className: "bg-pink-100 text-pink-600 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-700/30" },
  skill: { icon: GraduationCap, className: "bg-teal/15 text-teal border-teal/30" },
  engagement: { icon: Users, className: "bg-violet-100 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/30" },
  penalty: { icon: AlertTriangle, className: "bg-rag-red/10 text-rag-red border-rag-red/25" },
};

// Small audience pill per activity — shown since the catalog now groups by required/optional rather
// than by audience section, so which audience an activity applies to still needs a quick visual cue.
const CATALOG_AUDIENCE_PILL: Record<Activity["audience"], { label: string; className: string }> = {
  all: { label: "All Staff", className: "bg-primary/10 text-primary border-primary/25" },
  manager: { label: "Managers & HODs", className: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/30" },
  hod: { label: "HODs Only", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30" },
};

const CATALOG_DISPLAY_CAP = 10;

function ActivityCatalogItem({ activity: a }: { activity: Activity }) {
  const style = CATALOG_CATEGORY_STYLE[a.category];
  const Icon = style.icon;
  const audiencePill = CATALOG_AUDIENCE_PILL[a.audience];
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md",
        a.isCompulsory
          ? "border-amber-300/70 bg-gradient-to-br from-amber-50 to-white dark:border-amber-600/40 dark:from-amber-900/10 dark:to-transparent"
          : a.points < 0
            ? "border-rag-red/25 bg-rag-red/5"
            : "border-teal/25 bg-gradient-to-br from-teal/5 to-white dark:to-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("size-9 rounded-lg border grid place-items-center shrink-0", style.className)} title={CATALOG_CATEGORY_LABELS[a.category]}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{a.name}</span>
            {a.isCompulsory && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0 font-bold tracking-wide">REQUIRED</span>
            )}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-medium", audiencePill.className)}>
              {audiencePill.label}
            </span>
          </div>

          {/* Timeline deadline */}
          {a.isCompulsory && a.timelineDays && a.timelineTrigger && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">Deadline:</span>
              <span className="text-[10px] text-muted-foreground">
                Complete within <strong className="text-foreground">{a.timelineDays} day{a.timelineDays !== 1 ? "s" : ""}</strong> of {a.timelineTrigger}
              </span>
            </div>
          )}

          {/* Penalty warning */}
          {a.isCompulsory && a.penaltyPoints != null && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-rag-red/90">If overdue:</span>
              <span className="text-[10px] text-rag-red/80">
                <strong>−{a.penaltyPoints} pts</strong> automatically deducted
              </span>
            </div>
          )}
        </div>

        <div className={cn(
          "text-base font-extrabold shrink-0 mt-0.5 px-2 py-0.5 rounded-lg",
          a.points > 0 ? "text-teal bg-teal/10" : a.points < 0 ? "text-rag-red bg-rag-red/10" : "text-muted-foreground bg-muted"
        )}>
          {a.points > 0 ? `+${a.points}` : a.points} pts
        </div>
      </div>
    </div>
  );
}

function ActivityCatalog({ activities, tier }: { activities: Activity[]; tier: string }) {
  const [open, setOpen] = useState(false);
  const isManager = tier === "manager" || tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";
  const isHod = tier === "manager" || tier === "ops_hod";

  const liveActivities = activities.filter(a => a.live);

  // Scoped to this user's own visibility: everyone sees "all", managers/HODs additionally see
  // "manager", and only HODs additionally see "hod" — real-time, since this reads straight from
  // the same liveActivities the admin's Activity Management panel edits.
  const relevantActivities = liveActivities.filter(a =>
    a.audience === "all" ||
    (a.audience === "manager" && isManager) ||
    (a.audience === "hod" && isHod)
  );

  const compulsoryCount = relevantActivities.filter(a => a.isCompulsory).length;
  const optionalCount = relevantActivities.filter(a => !a.isCompulsory && a.points > 0).length;

  // "Recent" = most recently added/updated first — array order reflects this since addActivity
  // appends new entries. Required activities are shown in full first (up to the cap); any
  // remaining budget is filled with the most recent optional activities.
  const compulsoryRecent = [...relevantActivities.filter(a => a.isCompulsory)].reverse().slice(0, CATALOG_DISPLAY_CAP);
  const optionalRecent = [...relevantActivities.filter(a => !a.isCompulsory)].reverse()
    .slice(0, Math.max(0, CATALOG_DISPLAY_CAP - compulsoryRecent.length));

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/10 via-teal/5 to-transparent hover:from-primary/15 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-teal grid place-items-center shrink-0 shadow-sm">
            <BookOpen className="size-4.5 text-white" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">Activity Catalog</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <strong className="text-amber-700 dark:text-amber-400">{compulsoryCount} required</strong> · <strong className="text-teal">{optionalCount} optional</strong> — all the ways you can earn &amp; lose points
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="bg-card border-t border-border p-6 space-y-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2.5">
            <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">
              Activities marked <strong className="text-amber-700 dark:text-amber-400">REQUIRED</strong> are <strong>compulsory</strong> for your role — failing to complete them within the stated deadline results in an <strong>automatic points penalty</strong>. Optional activities are <strong>bonus opportunities</strong> to earn extra points. Showing your <strong>{Math.min(CATALOG_DISPLAY_CAP, relevantActivities.length)} most recent</strong> activities. This catalog is maintained by <strong>Human Capital</strong> and updates in real time.
            </p>
          </div>

          {compulsoryRecent.length > 0 && (
            <div className="rounded-xl border-2 border-amber-300/70 dark:border-amber-600/40 overflow-hidden">
              <div className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 flex items-center gap-2">
                <ShieldCheck className="size-4 text-white shrink-0" />
                <div className="text-sm font-bold text-white">Required Activities</div>
              </div>
              <div className="p-4 space-y-2.5 bg-amber-50/30 dark:bg-amber-900/5">
                {compulsoryRecent.map(a => <ActivityCatalogItem key={a.id} activity={a} />)}
              </div>
            </div>
          )}

          {optionalRecent.length > 0 && (
            <div className="rounded-xl border-2 border-teal/30 overflow-hidden">
              <div className="px-4 py-2.5 bg-gradient-to-r from-teal to-teal/70 flex items-center gap-2">
                <Sparkles className="size-4 text-white shrink-0" />
                <div className="text-sm font-bold text-white">Optional Activities</div>
              </div>
              <div className="p-4 space-y-2.5 bg-teal/5">
                {optionalRecent.map(a => <ActivityCatalogItem key={a.id} activity={a} />)}
              </div>
            </div>
          )}

          {relevantActivities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No activities published yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
