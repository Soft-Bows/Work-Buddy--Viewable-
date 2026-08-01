import { useState, useEffect, type CSSProperties } from "react";
import { Card, SectionTitle, SkillAttachmentModal, SkillsNeededPicker, WatercolorWash } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { CheckCircle2, Circle, Clock, X, Pencil, Trash2, Plus, Gift, Laptop, Target, ExternalLink, AlertCircle, Bell, PartyPopper, ChevronDown, ChevronRight, Send, ListChecks, Building2 } from "lucide-react";
import { TeamDrawer } from "@/components/sections/TeamSection";
import { toast } from "sonner";
import { pointsToast } from "@/lib/pointsToast";
import { cn, isAmongOwners, keyResultsOwnedBy, objectivesOwnedBy, isPendingAckFor, objectiveConfidence, objectiveConfidenceValue, objectiveScore, scoreToRag, isConfidenceStale } from "@/lib/utils";
import { daysSinceLastCheckIn, CHECK_IN_CADENCE_DAYS } from "@/lib/checkIns";
import { TeamHealthWidget } from "@/components/sections/TeamHealthWidget";
import type { TeamMember, RAG, SkillAttachment, DeptGoal, PersonalDevGoal } from "@/lib/mockData";
import { getDefaultSkillsForRole, getRegulatorExamsForRole, classifySkill, getSSGJobFunctionUrl, isHCWMDept, getIHRPBadgesForRole, ALL_SKILLS, IHRP_SKILLS_CATALOG } from "@/lib/skillsCatalog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getRelevantDeptsForViewer, HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { COMPLIANCE_DEPT_NAME, complianceTeamMembers, complianceDepartmentGoals } from "@/lib/complianceData";
import { MARKETING_DEPT_NAME, marketingTeamMembers, marketingDepartmentGoals } from "@/lib/marketingData";

// A category-grouped rendering for the "What Needs Your Attention" popups (both the manager/HOD and
// staff versions) — a flat list of a dozen-plus different notification types read as noise; grouping
// under a category header with a count ("1:1 Check-ins · 3") lets someone scan what KIND of thing
// needs attention before reading individual rows, and shows at a glance whether there are several
// queued up rather than just one.
interface NotifItem { category: string; icon: string; title: string; sub: string; time: string; action: () => void }
function groupNotifsByCategory(items: NotifItem[]): { category: string; items: NotifItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, NotifItem[]>();
  for (const item of items) {
    if (!map.has(item.category)) { map.set(item.category, []); order.push(item.category); }
    map.get(item.category)!.push(item);
  }
  return order.map(category => ({ category, items: map.get(category)! }));
}

function GroupedNotifList({ items }: { items: NotifItem[] }) {
  const groups = groupNotifsByCategory(items);
  return (
    <>
      {groups.map(({ category, items: groupItems }) => (
        <div key={category}>
          <div className="px-5 pt-3 pb-1 flex items-center gap-2 bg-muted/30 sticky top-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{category}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{groupItems.length}</span>
          </div>
          {groupItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={cn(
                "w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0",
                item.time === "Nudged" && "bg-amber-50/50 dark:bg-rag-amber/5 border-l-2 border-rag-amber/60"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-snug">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{item.sub}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap bg-muted px-1.5 py-0.5 rounded-full">{item.time}</span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

// Returns true if dueDate ("YYYY-MM") falls in this or next calendar month
function isDueWithinOneMonth(dueDate: string): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const curYM = now.getFullYear() * 12 + now.getMonth();
  const [y, m] = dueDate.split("-").map(Number);
  const dueYM = y * 12 + (m - 1);
  return dueYM >= curYM && dueYM <= curYM + 1;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDueDate(dueDate: string): string {
  if (!dueDate) return "";
  const [y, m] = dueDate.split("-");
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

// ── 30-day goal-setting rule ──────────────────────────────────────────────────
// Performance goals: min 3, max 5. Development goals: min 1, max 10. +10 pts per goal set.
// On day 31 from join date, −30 pts is deducted per still-incomplete section (perf and/or dev).
const PERF_GOAL_MIN = 3;
const PERF_GOAL_MAX = 5;
const DEV_GOAL_MIN = 1;
const DEV_GOAL_MAX = 10;
const GOAL_WINDOW_DAYS = 30;

function daysSinceJoin(joinDate?: string): number {
  if (!joinDate) return Infinity;
  const start = new Date(joinDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Singapore public holidays 2026 ───────────────────────────────────────────

const SG_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-02-17", "2026-02-18", "2026-03-20",
  "2026-04-03", "2026-05-01", "2026-05-21", "2026-05-27",
  "2026-08-09", "2026-10-20", "2026-12-25",
]);

function getRedemptionDate(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const targetMonth = month <= 6 ? 6 : 12;
  const d = new Date(year, targetMonth, 0);
  while (true) {
    const dow = d.getDay();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dow !== 0 && dow !== 6 && !SG_HOLIDAYS_2026.has(iso)) break;
    d.setDate(d.getDate() - 1);
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────


// Get the current quarter key
function currentQuarterKey(): "Q1" | "Q2" | "Q3" | "Q4" {
  const m = new Date().getMonth();
  if (m <= 2) return "Q1";
  if (m <= 5) return "Q2";
  if (m <= 8) return "Q3";
  return "Q4";
}

// Compute the effective RAG for a dept goal for the current quarter
// Monthly confidence for a department/team Objective — derived purely from its Key Results'
// ragConfidence (objectiveConfidence in utils.ts), same source of truth as the Team OKRs page.
// Previously this derived a RAG from the deprecated per-member Goal.quarters array (linkedDept +
// weightage), which was empty for real CSV-synced team members and stale for the two hand-authored
// personas — exactly the kind of drift that left the Home page's Department OKR cards out of sync
// with real Team OKRs assignments. isConfirmed/isMixed are kept in the return shape for the
// existing call sites, but are now always resolved (objectiveConfidence never needs manual
// confirmation) — there is no more "mixed, needs confirmation" state in the OKR model.
function computeDeptRag(
  deptGoal: DeptGoal,
  _teamMembers: TeamMember[],
): { rag: RAG | null; isConfirmed: boolean; isMixed: boolean } {
  const rag = (deptGoal.keyResults?.length ?? 0) > 0 ? objectiveConfidence(deptGoal) : null;
  return { rag, isConfirmed: true, isMixed: false };
}

// Team cards cycle through this palette by team name (not row index — the team row can now mix
// several teams together, capped at 5 cards), so two cards from the same team always match even
// though they're no longer grouped under their own row.
const HOME_TEAM_ROW_COLORS = [
  { border: "border-l-teal-500", chip: "bg-teal-500 text-white", text: "text-teal-700 dark:text-teal-300", cardBorder: "border-teal-300/60 dark:border-teal-500/40", cardBg: "bg-teal-50/60 dark:bg-teal-900/10", dot: "bg-teal-500" },
  { border: "border-l-violet-500", chip: "bg-violet-500 text-white", text: "text-violet-700 dark:text-violet-300", cardBorder: "border-violet-300/60 dark:border-violet-500/40", cardBg: "bg-violet-50/60 dark:bg-violet-900/10", dot: "bg-violet-500" },
  { border: "border-l-rose-500", chip: "bg-rose-500 text-white", text: "text-rose-700 dark:text-rose-300", cardBorder: "border-rose-300/60 dark:border-rose-500/40", cardBg: "bg-rose-50/60 dark:bg-rose-900/10", dot: "bg-rose-500" },
  { border: "border-l-amber-500", chip: "bg-amber-500 text-white", text: "text-amber-700 dark:text-amber-300", cardBorder: "border-amber-300/60 dark:border-amber-500/40", cardBg: "bg-amber-50/60 dark:bg-amber-900/10", dot: "bg-amber-500" },
  { border: "border-l-blue-500", chip: "bg-blue-500 text-white", text: "text-blue-700 dark:text-blue-300", cardBorder: "border-blue-300/60 dark:border-blue-500/40", cardBg: "bg-blue-50/60 dark:bg-blue-900/10", dot: "bg-blue-500" },
];
const HOME_DEPT_ROW_COLOR = { chip: "bg-primary text-primary-foreground", text: "text-primary", cardBorder: "border-primary/40", cardBg: "bg-primary/5", dot: "bg-primary" };
const HOME_TEAM_ROW_CAP = 5;

const DEPT_WASH_BLOBS = [
  { color: "#3B82F6", style: { top: "-20%", left: "0%", width: "40%", height: "180%" } },
  { color: "#6366F1", style: { top: "10%", left: "55%", width: "35%", height: "150%" } },
];
const TEAM_WASH_BLOBS = [
  { color: "#14B8A6", style: { top: "-15%", left: "-5%", width: "35%", height: "170%" } },
  { color: "#8B5CF6", style: { top: "20%", left: "35%", width: "35%", height: "150%" } },
  { color: "#F43F5E", style: { top: "-10%", left: "70%", width: "35%", height: "170%" } },
];

// The Home page's "Department/Team OKRs" — one row for department-level Objectives, then one
// shared row (capped at 5 cards) for every qualifying team-level Objective, each washed in its own
// soft watercolour background so the two sets read as visually distinct at a glance. The team row
// only shows for viewers who actually have a stake in that team (the HOD, the team's own owner,
// someone who reports to that owner, or anyone with an individual Key Result under it), so the
// section doesn't dump every team's OKRs on every viewer. Wherever the viewer owns a Key Result —
// department or team level — it's nested inside that Objective's own card, so it's obvious which
// larger OKR their individual work ladders up to, without a separate section to scan.
function DeptTeamOkrSection({
  objectives, viewerName, isHodViewer, teamMembers, deptGoalSkills, onViewAllTeamOkrs,
}: {
  objectives: DeptGoal[];
  viewerName: string;
  isHodViewer: boolean;
  teamMembers: TeamMember[];
  deptGoalSkills: Record<string, string[]>;
  onViewAllTeamOkrs: () => void;
}) {
  const deptObjectives = objectives.filter(g => (g.level ?? "department") === "department");
  const teamObjectivesAll = objectives.filter(g => g.level === "team");

  const viewerMember = teamMembers.find(m => m.name === viewerName);
  const ownsAnyTeam = teamObjectivesAll.some(g => isAmongOwners(g.owner, viewerName));
  const hasLinkedIndividualKR = teamObjectivesAll.some(g => (g.keyResults ?? []).some(kr => isAmongOwners(kr.owner, viewerName)));
  const reportsToTeamOwner = viewerMember ? teamObjectivesAll.some(g => isAmongOwners(g.owner, viewerMember.directManager)) : false;
  const showTeamOkrs = isHodViewer || ownsAnyTeam || hasLinkedIndividualKR || reportsToTeamOwner;

  const qualifyingTeamObjectives = showTeamOkrs ? teamObjectivesAll : [];
  const teamNames = Array.from(new Set(qualifyingTeamObjectives.map(g => g.teamName || "Team")));
  const teamObjectives = qualifyingTeamObjectives.slice(0, HOME_TEAM_ROW_CAP);
  const hiddenTeamCount = qualifyingTeamObjectives.length - teamObjectives.length;
  const colorForTeam = (g: DeptGoal) => HOME_TEAM_ROW_COLORS[teamNames.indexOf(g.teamName || "Team") % HOME_TEAM_ROW_COLORS.length];

  const renderCard = (g: DeptGoal, color: typeof HOME_DEPT_ROW_COLOR) => {
    const { rag, isConfirmed, isMixed } = computeDeptRag(g, teamMembers);
    const confidenceValue = rag ? objectiveConfidenceValue(g) : undefined;
    const score = objectiveScore(g);
    const myKrs = (g.keyResults ?? []).filter(kr => isAmongOwners(kr.owner, viewerName));
    return (
      <Card key={g.id} className={cn("p-2.5 border", color.cardBorder, color.cardBg)}>
        {/* Title/owner previously used plain default-foreground/muted-foreground text on top of the
            card's own translucent colour wash — legible, but flat, disconnected from the card's own
            colour identity. Keeping the wash exactly as translucent as before, just giving the text
            itself more presence: the title now picks up the row's own saturated colour + bold
            weight, and the owner line moves off low-contrast muted grey onto full foreground. */}
        <div className="text-[9px] uppercase tracking-widest text-foreground/70 font-semibold truncate">{g.owner}</div>
        <div className={cn("font-bold text-xs mt-0.5 leading-snug", color.text)}>{g.title}</div>
        {/* Confidence + Score side by side, both word + numeric value — mirrors Team OKRs'
            FieldBadge/RagPill treatment (previously this only showed a single bare "GREEN"/"AMBER"
            word with no numeric value and no separate Score at all, unlike the Team OKRs page). */}
        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
          {isMixed && !isConfirmed ? (
            <div className="flex items-center gap-1 text-[9px] text-amber-foreground bg-rag-amber/10 border border-rag-amber/30 rounded px-1.5 py-0.5">
              <AlertCircle className="size-2.5 shrink-0" />
              <span>Needs confirmation</span>
            </div>
          ) : rag ? (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/70">Confidence</span>
                <div className="flex items-center gap-1">
                  <span className={cn("size-2.5 rounded-full shrink-0", rag === "green" ? "bg-rag-green" : rag === "amber" ? "bg-rag-amber" : "bg-rag-red")} />
                  <span className={cn("text-[10px] font-semibold", rag === "green" ? "text-rag-green" : rag === "amber" ? "text-amber-foreground" : "text-rag-red")}>
                    {rag.toUpperCase()}{confidenceValue !== undefined && <span className="font-normal opacity-70"> {confidenceValue.toFixed(1)}</span>}
                  </span>
                </div>
              </div>
              {score !== undefined && (() => {
                const scoreRag = scoreToRag(score);
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/70">Score</span>
                    <div className="flex items-center gap-1">
                      <span className={cn("size-2.5 rounded-full shrink-0", scoreRag === "green" ? "bg-rag-green" : scoreRag === "amber" ? "bg-rag-amber" : "bg-rag-red")} />
                      <span className={cn("text-[10px] font-semibold", scoreRag === "green" ? "text-rag-green" : scoreRag === "amber" ? "text-amber-foreground" : "text-rag-red")}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-[9px] text-muted-foreground/60">No {currentQuarterKey()} data yet</div>
          )}
        </div>
        {g.dueDate && (
          <div className="mt-1 text-[9px] text-muted-foreground/70">
            Due {new Date(g.dueDate + "-01").toLocaleDateString("en-SG", { month: "short", year: "numeric" })}
          </div>
        )}
        {(deptGoalSkills[g.id]?.length ?? 0) > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {deptGoalSkills[g.id]!.slice(0, 2).map(skill => (
              <span key={skill} className="text-[8px] px-1 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20 truncate max-w-full">
                {skill}
              </span>
            ))}
            {deptGoalSkills[g.id]!.length > 2 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{deptGoalSkills[g.id]!.length - 2}
              </span>
            )}
          </div>
        )}
        {myKrs.length > 0 && (
          // A strong, unmissable "this is yours" box — same sky-blue ownership treatment (border-2
          // + saturated wash) used for owned Objectives/Key Results on the Team OKRs page, not just
          // a thin dashed top-border, so "you own a KR inside this objective" reads at a glance
          // instead of blending into the rest of the card.
          <div className="mt-2 rounded-lg border-2 border-sky-400/80 dark:border-sky-600/70 bg-sky-50/85 dark:bg-sky-950/30 ring-1 ring-sky-200 dark:ring-sky-800/50 p-1.5">
            <div className="text-[8px] uppercase tracking-widest font-bold flex items-center gap-1 text-sky-700 dark:text-sky-300">
              <ListChecks className="size-2.5" /> Your KR{myKrs.length > 1 ? "s" : ""}
            </div>
            {/* Mirrors Team OKRs' confidence/score treatment (dot + RAG word, + numeric value once
                scored) at this card's smaller scale — previously title-only, with no way to tell a
                KR's status without leaving the Home page. */}
            <ul className="mt-1 space-y-1">
              {myKrs.map(kr => {
                const scoreRag = kr.score !== undefined ? scoreToRag(kr.score) : null;
                return (
                  <li key={kr.id} className="text-[9px] leading-snug bg-background/80 rounded px-1 py-0.5">
                    <div className="text-foreground/80" title={kr.title}>{kr.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-foreground/70" title="Monthly confidence">
                        <span className={cn("size-1.5 rounded-full shrink-0",
                          kr.ragConfidence === "green" ? "bg-rag-green" : kr.ragConfidence === "amber" ? "bg-rag-amber" : "bg-rag-red")} />
                        {kr.ragConfidence.toUpperCase()}
                      </span>
                      {scoreRag && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-foreground/70" title="Quarterly score">
                          <span className={cn("size-1.5 rounded-full shrink-0",
                            scoreRag === "green" ? "bg-rag-green" : scoreRag === "amber" ? "bg-rag-amber" : "bg-rag-red")} />
                          {kr.score!.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="relative py-1">
        <WatercolorWash blobs={DEPT_WASH_BLOBS} />
        <div className="flex items-center gap-1.5 mb-2 pl-2.5 border-l-4 border-l-primary">
          <span className={cn("size-1.5 rounded-full", HOME_DEPT_ROW_COLOR.dot)} />
          <span className={cn("text-[10px] uppercase tracking-widest font-bold", HOME_DEPT_ROW_COLOR.text)}>Department OKRs</span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(deptObjectives.length, 1)}, minmax(0, 1fr))` }}>
          {deptObjectives.map(g => renderCard(g, HOME_DEPT_ROW_COLOR))}
        </div>
      </div>
      {teamObjectives.length > 0 && (
        <div className="relative py-1">
          <WatercolorWash blobs={TEAM_WASH_BLOBS} />
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 pl-2.5 border-l-4 border-l-teal-500">
              <span className="size-1.5 rounded-full bg-teal-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-teal-700 dark:text-teal-300">
                {/* Mirrors the Team OKRs page's own "X's OKRs" label whenever exactly one team's set is
                    shown here — falls back to a generic label if the row happens to mix teams. */}
                {(() => {
                  const shownTeamNames = Array.from(new Set(teamObjectives.map(g => g.teamName || "Team")));
                  return shownTeamNames.length === 1 ? `${shownTeamNames[0]}'s OKRs` : "Team OKRs";
                })()}
              </span>
            </div>
            {hiddenTeamCount > 0 && (
              <button
                onClick={onViewAllTeamOkrs}
                className="text-[10px] font-medium text-teal-700 dark:text-teal-300 hover:underline shrink-0"
              >
                +{hiddenTeamCount} more on Team OKRs →
              </button>
            )}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(teamObjectives.length, 1)}, minmax(0, 1fr))` }}>
            {teamObjectives.map(g => renderCard(g, colorForTeam(g)))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Team At A Glance ──────────────────────────────────────────────────────────

// Identifies which leave supervisor a row belongs to (their own row and their collapsed sub-team
// both share the same colour) — rendered as a soft watercolour wash (WatercolorWash, a handful of
// blurred translucent blobs) behind the row rather than a flat, edge-to-edge pastel fill. A flat
// fill on every row meant two adjacent rows from different supervisor groups butted up against each
// other as a hard, contrasting colour-block boundary; a blurred wash has no hard edge, so adjacent
// rows blend into each other instead of visually competing. Deliberately amber/rose-free: amber is
// reserved app-wide for "needs your attention" (the pending bell, ack banners) and rose isn't used
// as a brand hue anywhere else in Team OKRs/Team-at-a-Glance. Every hue below (sky, violet, teal,
// indigo, cyan) already has the same meaning-neutral "group identity" role elsewhere in this app
// (sky = ownership highlight, indigo = confidence/score, teal = skills), so a row here reads as part
// of the same visual system instead of a one-off palette.
const GLANCE_SUPERVISOR_PASTELS = [
  { hex: "#0EA5E9", text: "text-sky-700 dark:text-sky-300", border: "border-sky-300 dark:border-sky-700/50" },
  { hex: "#8B5CF6", text: "text-violet-700 dark:text-violet-300", border: "border-violet-300 dark:border-violet-700/50" },
  { hex: "#14B8A6", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300 dark:border-teal-700/50" },
  { hex: "#6366F1", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300 dark:border-indigo-700/50" },
  { hex: "#06B6D4", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300 dark:border-cyan-700/50" },
];

const CELEBRATION_WINDOW_DAYS = 14;

function daysSinceDate(dateStr?: string): number {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

interface PendingItem { label: string; onClick: () => void }

// Home page "Team At A Glance": HOD viewers get a hierarchical view (their own direct reports
// fully shown; any direct report who is themself a leave supervisor becomes a toggle revealing their
// reports as narrower, pastel-tinted rows) so the org shape is visible without leaving the page.
// Non-HOD viewers just see their own direct reports, same row styling, no expand affordance — they
// only ever see people who report to them. RAG/goal-count badges are gone; rows instead surface two
// signals: an amber bell when the viewer has a pending action for that person (skill approval, goal
// approval, RAG ack, or an unresolved remark — each deep-links to where it's resolved, same
// setFocusedTeamMemberId/setFocusedSkillsMemberId + setSection pattern the notification panels
// already use), and a celebration icon when they've completed a development goal within the last
// two weeks (opens their dev-goal list with it highlighted, and a one-shot "send encouragement note"
// that awards +5 points to both people).
function TeamAtAGlanceSection({
  teamMembers, viewerName, isHodViewer,
}: {
  teamMembers: TeamMember[];
  viewerName: string;
  isHodViewer: boolean;
}) {
  const {
    setFocusedTeamMemberId, setSection, setFocusedSkillsMemberId, teamMemberPendingSkills,
    staffMemberId, adminMemberId, opsMeta, staffDevGoals, adminDevGoals, teamDevGoalsById,
    sendEncouragementNote, currentUser, departmentGoals, teamOkrEditors, focusObjective,
    setTeamMemberDrawerReturnHome,
  } = useApp();

  const [expandedSupervisor, setExpandedSupervisor] = useState<string | null>(null);
  const [pendingPopupFor, setPendingPopupFor] = useState<string | null>(null);
  const [celebrationFor, setCelebrationFor] = useState<TeamMember | null>(null);

  // Which id the currently-viewed persona actually is — needed both to resolve their own dev goals
  // (if they happen to be one of the switchable slots) and as the "sender" side of an encouragement
  // note's +5 points.
  const viewerId = teamMembers.find(m => m.name === viewerName)?.id
    ?? (viewerName === currentUser.name ? "u0" : (opsMeta?.personaId ?? "u0"));

  const devGoalsFor = (m: TeamMember): PersonalDevGoal[] => {
    if (m.id === staffMemberId) return staffDevGoals;
    if (m.id === adminMemberId) return adminDevGoals;
    if (opsMeta && m.id === opsMeta.personaId) return opsMeta.devGoals;
    return teamDevGoalsById[m.id] ?? [];
  };

  const pendingItemsFor = (m: TeamMember): PendingItem[] => {
    const items: PendingItem[] = [];
    const pendingSkill = teamMemberPendingSkills.find(p => p.memberId === m.id);
    if (pendingSkill && pendingSkill.pending.length > 0) {
      items.push({
        label: `${pendingSkill.pending.length} skill${pendingSkill.pending.length > 1 ? "s" : ""} awaiting your approval`,
        onClick: () => { setFocusedSkillsMemberId(m.id); setSection("skills"); },
      });
    }
    // Counterproposals this member has raised on a performance goal they own — a real, live signal
    // read straight off the current Objective/Key Result data (departmentGoals), not the retired
    // per-member Goal/remarks model. That old model is never rendered anywhere in the app any more
    // (TeamDrawer's "Performance Goals" list is Key-Result-based), so flagging it here produced a
    // bell with nothing behind it once clicked — exactly the "static/erroneous pending item" bug.
    // Only surfaced to a viewer who can actually resolve it (HOD for any objective, or the delegated
    // team-OKR editor for that specific team's objectives), matching TeamSection's own canEdit rule.
    const canResolve = (dg: DeptGoal) =>
      isHodViewer || (dg.level === "team" && !!dg.teamName && teamOkrEditors[dg.teamName] === viewerName);
    let counterproposalCount = 0;
    let counterproposalObjectiveId: string | null = null;
    for (const dg of departmentGoals) {
      if (!canResolve(dg)) continue;
      if (dg.counterProposal && dg.owner === m.name) {
        counterproposalCount++;
        counterproposalObjectiveId ??= dg.id;
      }
      for (const kr of dg.keyResults ?? []) {
        if (kr.counterProposal && isAmongOwners(kr.owner, m.name)) {
          counterproposalCount++;
          counterproposalObjectiveId ??= dg.id;
        }
      }
    }
    if (counterproposalCount > 0 && counterproposalObjectiveId) {
      const objectiveId = counterproposalObjectiveId;
      items.push({
        label: `${counterproposalCount} counterproposal${counterproposalCount > 1 ? "s" : ""} awaiting your review`,
        onClick: () => focusObjective(objectiveId, true),
      });
    }
    return items;
  };

  const celebrationGoalFor = (m: TeamMember): PersonalDevGoal | undefined =>
    devGoalsFor(m).find(g => g.completed && !g.encouragementSent && daysSinceDate(g.completedDate) <= CELEBRATION_WINDOW_DAYS);

  const directReports = teamMembers.filter(m => m.directManager === viewerName);
  // Assign each supervising direct report their own pastel, in encounter order, so it's stable and
  // every supervisor among the HOD's reports gets a visually distinct identity colour.
  const supervisingReports = directReports.filter(m => teamMembers.some(x => x.directManager === m.name));
  const colorForSupervisor = (name: string) =>
    GLANCE_SUPERVISOR_PASTELS[Math.max(0, supervisingReports.findIndex(m => m.name === name)) % GLANCE_SUPERVISOR_PASTELS.length];

  const renderRow = (m: TeamMember, opts: { narrow?: boolean; pastel?: typeof GLANCE_SUPERVISOR_PASTELS[number] }) => {
    const pending = pendingItemsFor(m);
    const celebrationGoal = celebrationGoalFor(m);
    const isSupervisor = teamMembers.some(x => x.directManager === m.name);
    const isExpanded = expandedSupervisor === m.name;
    const rowPastel = isHodViewer && isSupervisor ? colorForSupervisor(m.name) : opts.pastel;

    return (
      <div key={m.id}>
        <div
          className={cn(
            "relative flex items-center gap-2 border-b border-l-[3px] border-border/60 last:border-b-0 rounded-lg pl-2 pr-1 -mx-2 transition-colors group overflow-hidden",
            opts.narrow ? "py-1.5" : "py-2",
            pending.length > 0 ? "bg-rag-amber/10 hover:bg-rag-amber/15 border-l-rag-amber" : rowPastel ? cn("hover:brightness-95", rowPastel.border) : "hover:bg-muted/50 border-l-transparent",
          )}
        >
          {!pending.length && rowPastel && (
            <WatercolorWash blobs={[{ color: rowPastel.hex, style: { top: "-40%", left: "-4%", width: "45%", height: "180%" } }]} />
          )}
          {/* Clicking the name/avatar always opens THIS person's own goals drawer — including when
              they're themselves a leave supervisor. Expanding to see their reports is a separate,
              explicit chevron button below, so an HOD can actually see a supervisor's own goals
              instead of that click only ever toggling the nested list (the previous behaviour). */}
          <button
            onClick={() => {
              setTeamMemberDrawerReturnHome(true);
              setFocusedTeamMemberId(m.id); setSection("team");
            }}
            title={`View ${m.name}'s goals`}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <div className={cn(
              "rounded-full bg-secondary text-primary grid place-items-center font-medium shrink-0",
              opts.narrow ? "size-7 text-xs" : "size-9 text-sm"
            )}>{m.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className={cn("font-medium group-hover:text-primary transition-colors truncate", opts.narrow ? "text-xs" : "text-sm", rowPastel?.text)}>
                {m.name}
              </div>
              {!opts.narrow && <div className="text-xs text-muted-foreground truncate">{m.role}</div>}
            </div>
          </button>
          {isHodViewer && isSupervisor && (
            <button
              onClick={() => setExpandedSupervisor(isExpanded ? null : m.name)}
              title={isExpanded ? `Hide ${m.name}'s reports` : `Show ${m.name}'s reports`}
              className="size-7 rounded-full grid place-items-center shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          )}
          {celebrationGoal && (
            <button
              onClick={() => setCelebrationFor(m)}
              title="Just completed a development goal — celebrate it"
              className="size-7 rounded-full bg-rag-green/15 text-rag-green grid place-items-center shrink-0 hover:bg-rag-green/25 transition-colors"
            >
              <PartyPopper className="size-3.5" />
            </button>
          )}
          {pending.length > 0 && (
            <button
              onClick={() => setPendingPopupFor(m.id)}
              title="Action needed"
              className="size-7 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-400 grid place-items-center shrink-0 hover:bg-amber-500/30 transition-colors"
            >
              <Bell className="size-3.5" />
            </button>
          )}
        </div>
        {isHodViewer && isSupervisor && isExpanded && (
          <div className={cn("ml-6 pl-2 border-l-2 space-y-0.5 py-1", rowPastel?.border ?? "border-border")}>
            {teamMembers.filter(x => x.directManager === m.name).map(x => renderRow(x, { narrow: true, pastel: rowPastel }))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {directReports.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">No direct reports yet.</p>
      )}
      {directReports.map(m => renderRow(m, {}))}

      {pendingPopupFor && (() => {
        const m = teamMembers.find(x => x.id === pendingPopupFor);
        if (!m) return null;
        const items = pendingItemsFor(m);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPendingPopupFor(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm mx-4 p-5 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-lg">{m.name} — action needed</div>
                <button onClick={() => setPendingPopupFor(null)} className="size-7 rounded-full hover:bg-muted grid place-items-center shrink-0"><X className="size-3.5" /></button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.onClick(); setPendingPopupFor(null); }}
                    className="w-full flex items-center justify-between gap-2 text-left text-sm px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
                  >
                    {item.label}
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {celebrationFor && (
        <CelebrationPopup
          member={celebrationFor}
          goals={devGoalsFor(celebrationFor)}
          onSend={(goalId) => {
            sendEncouragementNote(viewerId, celebrationFor.id, goalId);
            pointsToast(`Encouragement sent to ${celebrationFor.name} 🎉 — +5 pts each`);
            setCelebrationFor(null);
          }}
          onClose={() => setCelebrationFor(null)}
        />
      )}
    </div>
  );
}

function CelebrationPopup({ member, goals, onSend, onClose }: {
  member: TeamMember; goals: PersonalDevGoal[]; onSend: (goalId: string) => void; onClose: () => void;
}) {
  const highlighted = goals.find(g => g.completed && !g.encouragementSent && daysSinceDate(g.completedDate) <= CELEBRATION_WINDOW_DAYS);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-lg flex items-center gap-2"><PartyPopper className="size-5 text-rag-green" /> {member.name}'s development goals</div>
            <div className="text-xs text-muted-foreground mt-0.5">{member.role}</div>
          </div>
          <button onClick={onClose} className="size-7 rounded-full hover:bg-muted grid place-items-center shrink-0"><X className="size-3.5" /></button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {goals.length === 0 && <p className="text-sm text-muted-foreground">No development goals yet.</p>}
          {goals.map(g => (
            <div
              key={g.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm",
                g.id === highlighted?.id ? "border-rag-green/50 bg-rag-green/10" : "border-border"
              )}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {g.completed && <CheckCircle2 className="size-3.5 text-rag-green shrink-0" />}
                {g.title}
                {g.id === highlighted?.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rag-green/20 text-rag-green font-semibold">Just completed 🎉</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{g.description}</div>
            </div>
          ))}
        </div>
        {highlighted && (
          <button
            onClick={() => onSend(highlighted.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Send className="size-4" /> Send encouragement note · +5 pts each
          </button>
        )}
      </div>
    </div>
  );
}

// ── Multi-owner picker (supports selecting multiple names, stored as comma-separated string) ──

function MultiOwnerPicker({ value, onChange, staffNames }: { value: string; onChange: (n: string) => void; staffNames: string[] }) {
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const available = staffNames.filter(n =>
    !selected.includes(n) && (!query.trim() || n.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);

  const addOwner = (name: string) => {
    onChange([...selected, name].join(", "));
    setQuery("");
    setOpen(false);
  };

  const removeOwner = (name: string) => {
    onChange(selected.filter(n => n !== name).join(", "));
  };

  return (
    <div className="flex-1 min-w-0">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
              {name}
              <button type="button" onMouseDown={() => removeOwner(name)} className="hover:text-red-500 transition-colors">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Type a name to add owner…" : "Add another owner…"}
          className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {open && available.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {available.map(name => (
              <button
                key={name}
                type="button"
                onMouseDown={() => addOwner(name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// SkillsNeededPicker now lives in ui-bits.tsx, shared with Team OKRs' Objective/Key Result cards.

// ── Goal Editor Modal (HOD only) ─────────────────────────────────────────────

function GoalEditorModal({
  initialGoals,
  onSave,
  onClose,
  effectiveDept,
}: {
  initialGoals: DeptGoal[];
  onSave: (goals: DeptGoal[]) => Promise<void>;
  onClose: () => void;
  effectiveDept: string;
}) {
  const { staffList, currentUser, deptGoalSkills, updateGoalSkills } = useApp();
  // Include HOD (currentUser) as a selectable owner alongside team members
  const staffNames = [currentUser.name, ...staffList.map(s => s.name)];
  // HCWM HODs tag from the full IHRP Skills Badges catalog; every other department's HOD tags
  // from the full SSG Skills Framework catalog — the same catalogs shown on the Skills Profile page.
  const skillCatalog = isHCWMDept(effectiveDept) ? IHRP_SKILLS_CATALOG : ALL_SKILLS;

  const [draft, setDraft] = useState<DeptGoal[]>(initialGoals.map(g => ({ ...g })));
  const [saving, setSaving] = useState(false);

  const errors: string[] = [];
  if (draft.length < 3) errors.push(`Minimum 3 goals required — currently ${draft.length}`);
  if (draft.length > 5) errors.push("Maximum 5 goals allowed");
  const isValid = errors.length === 0;

  const qKey = currentQuarterKey();
  const ragKey = `rag${qKey}` as keyof DeptGoal;

  const update = (id: string, field: keyof DeptGoal, value: string | number) =>
    setDraft(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));

  const remove = (id: string) => {
    if (draft.length <= 3) {
      toast.error("Cannot delete — minimum 3 department goals must be maintained.");
      return;
    }
    setDraft(prev => prev.filter(g => g.id !== id));
  };

  const addGoal = () => {
    if (draft.length >= 5) return;
    setDraft(prev => [...prev, { id: `d${Date.now()}`, title: "New Department Goal", owner: "", progress: 0, weightage: 0, dueDate: "" }]);
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      toast.success("Department goals finalised.");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-background border border-border rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-[600px] max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <div className="font-display text-xl">Edit Department Goals</div>
            <div className="text-xs text-muted-foreground mt-0.5">Min 3 · Max 5 goals</div>
          </div>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        {/* Goal list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {draft.map((goal, idx) => (
            <div key={goal.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-sm font-medium text-muted-foreground mt-2 w-5 shrink-0">{idx + 1}</div>

              <div className="flex-1 space-y-2 min-w-0">
                {/* Title */}
                <input
                  value={goal.title}
                  onChange={e => update(goal.id, "title", e.target.value)}
                  placeholder="Goal title"
                  className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {/* Owner picker — supports multiple owners */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground shrink-0 mt-2">Owner</span>
                  <MultiOwnerPicker
                    value={goal.owner}
                    onChange={name => update(goal.id, "owner", name)}
                    staffNames={staffNames}
                  />
                </div>
                {/* Due date — month picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Due</span>
                  <input
                    type="month"
                    value={goal.dueDate ?? ""}
                    onChange={e => update(goal.id, "dueDate", e.target.value)}
                    className="text-xs rounded-lg border border-input bg-background px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {goal.dueDate && (
                    <button
                      onClick={() => update(goal.id, "dueDate", "")}
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      title="Clear due date"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* RAG for current quarter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground shrink-0">{qKey} Status</span>
                  <div className="flex gap-1.5">
                    {(["green", "amber", "red"] as const).map(r => {
                      const isActive = (goal[ragKey] as string) === r;
                      const label = r === "green" ? "Green" : r === "amber" ? "Amber" : "Red";
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => update(goal.id, ragKey, isActive ? "" : r)}
                          className={cn(
                            "text-xs px-3 py-1 rounded-full border-2 font-semibold transition-all",
                            isActive
                              ? r === "green"
                                ? "bg-rag-green border-rag-green text-white shadow-sm shadow-rag-green/40"
                                : r === "amber"
                                ? "bg-rag-amber border-rag-amber text-white shadow-sm shadow-rag-amber/40"
                                : "bg-rag-red border-rag-red text-white shadow-sm shadow-rag-red/40"
                              : r === "green"
                                ? "border-rag-green/50 text-rag-green hover:bg-rag-green/10"
                                : r === "amber"
                                ? "border-rag-amber/50 text-amber-foreground hover:bg-rag-amber/10"
                                : "border-rag-red/50 text-rag-red hover:bg-rag-red/10"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {(goal[ragKey] as string) && (
                    <span className={cn(
                      "text-[10px] font-medium",
                      (goal[ragKey] as string) === "green" ? "text-rag-green" :
                      (goal[ragKey] as string) === "amber" ? "text-amber-foreground" : "text-rag-red"
                    )}>✓ confirmed</span>
                  )}
                </div>
                {/* Skills needed — feeds the admin Organisational Competency Gaps computation */}
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-xs text-muted-foreground shrink-0 mt-2">Skills Needed</span>
                  <SkillsNeededPicker
                    value={deptGoalSkills[goal.id] ?? []}
                    onChange={skills => updateGoalSkills(goal.id, skills)}
                    catalog={skillCatalog}
                  />
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => remove(goal.id)}
                disabled={draft.length <= 3}
                title={draft.length <= 3 ? "Cannot delete — minimum 3 goals required" : "Delete goal"}
                className="mt-1 size-8 rounded-full hover:bg-red-50 grid place-items-center text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {/* Add goal */}
          {draft.length < 5 && (
            <button
              onClick={addGoal}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/20 text-sm text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <Plus className="size-4" />
              Add Department Goal
            </button>
          )}
        </div>

        {/* Validation footer */}
        <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
          {/* Error messages */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 space-y-0.5">
              {errors.map((e, i) => (
                <div key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>{e}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                isValid && !saving
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? "Saving…" : "Finalise Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kawaii SVG decorations ────────────────────────────────────────────────────

function StrawberrySVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M15 7 Q11 3 9 7 Q13 5 15 9 Q17 5 21 7 Q19 3 15 7Z" fill="#4ADE80"/>
      <path d="M9 9 Q7 15 9 21 Q11 27 15 28 Q19 27 21 21 Q23 15 21 9 Q18 7 15 8 Q12 7 9 9Z" fill="#F472B6"/>
      <circle cx="12" cy="15" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="17.5" cy="15" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="14.5" cy="20" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="13" cy="11" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="18" cy="11" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <ellipse cx="12" cy="14" rx="2.5" ry="3.5" fill="white" fillOpacity="0.40"/>
    </svg>
  );
}

function LemonSVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M15 5 Q21 3 23 9 Q17 7 15 5Z" fill="#4ADE80"/>
      <path d="M15 5 Q9 4 11 11 Q13 7 15 5Z" fill="#22C55E"/>
      <ellipse cx="15" cy="18" rx="10" ry="8" fill="#FDE047"/>
      <ellipse cx="5.5" cy="18" rx="2" ry="3" fill="#FDE047"/>
      <ellipse cx="24.5" cy="18" rx="2" ry="3" fill="#FDE047"/>
      <ellipse cx="11" cy="15" rx="4" ry="2.5" fill="white" fillOpacity="0.50"/>
      <path d="M9 18 Q15 14 21 18" stroke="#EAB308" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function LaptopLightbulbSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="28" height="17" rx="3" fill="#3B82F6"/>
      <rect x="4" y="10" width="24" height="13" rx="2" fill="#EFF6FF"/>
      <circle cx="11" cy="16" r="1.5" fill="#3B82F6"/>
      <circle cx="21" cy="16" r="1.5" fill="#3B82F6"/>
      <path d="M10 20 Q16 23 22 20" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M0 25 L3 29 L29 29 L32 25Z" fill="#93C5FD"/>
      <circle cx="38" cy="11" r="7" fill="#FCD34D"/>
      <circle cx="36" cy="9" r="2" fill="white" fillOpacity="0.55"/>
      <rect x="35" y="18" width="6" height="3" rx="1" fill="#FCD34D"/>
      <rect x="34.5" y="20.5" width="7" height="1.5" rx="0.5" fill="#22D3EE"/>
      <line x1="44" y1="5" x2="46" y2="3" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="11" x2="48" y2="10" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
      <line x1="44" y1="17" x2="46" y2="19" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function HomeSection() {
  const {
    tier, departmentGoals, opsDepartmentGoals, teamMembers, onboardingMilestones, devMilestones,
    currentUser, points, setSection, saveDepartmentGoals, setFocusedTeamMemberId,
    staffMemberId, adminMemberId,
    staffDevGoals, adminDevGoals, teamMemberPendingSkills, setFocusedSkillsMemberId,
    allTeamMemberSkills, managerInputs, acknowledgedManagerInputs, opsMeta, teamDevGoalsById,
    nudgedGoalIds, setFocusedGoalId, pendingDevGoalRecs, deptGoalSkills, pendingGoalEditProposals,
    checkIns, setTeamMemberDrawerReturnHome, aiActivityLog, logAiActivity,
    directorMeta, staffList, hcwmTeamMembers, opsTeamMembersAll, hcwmDepartmentGoals,
  } = useApp();

  const isOpsTier = tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";
  const isManager = tier === "manager" || tier === "ops_hod";
  const currentStaffMemberId = (opsMeta && tier !== "ops_hod") ? opsMeta.personaId : (tier === "admin" ? adminMemberId : staffMemberId);
  const currentStaffDevGoals = (opsMeta && tier !== "ops_hod") ? opsMeta.devGoals : (tier === "admin" ? adminDevGoals : staffDevGoals);
  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const isNewHire = opsMeta ? false : currentUser.tenureYears < 1;
  const milestones = isNewHire ? onboardingMilestones : (opsMeta ? opsMeta.milestones : devMilestones);
  const effectiveName = opsMeta ? opsMeta.user.name : currentUser.name;
  const effectiveDept = opsMeta ? opsMeta.user.department : currentUser.department;
  const displayPoints = opsMeta ? opsMeta.user.pointsYTD : points;
  // This viewer's own id when they're the HOD — used to scope goal-edit-proposal notifications to
  // the HOD who actually needs to act on them.
  const viewerHodId = isHod ? (tier === "ops_hod" ? (opsMeta?.personaId ?? "u21") : "u0") : null;
  const myPendingGoalEditProposals = viewerHodId ? pendingGoalEditProposals.filter(p => p.hodId === viewerHodId) : [];

  const [pendingOpen, setPendingOpen] = useState(false);
  const [staffPendingOpen, setStaffPendingOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);

  // Draft goals kept in sync with server state between saves
  const [draftGoals, setDraftGoals] = useState<DeptGoal[]>(
    departmentGoals.map(g => ({ ...g, weightage: g.weightage ?? 0 }))
  );
  useEffect(() => {
    setDraftGoals(departmentGoals.map(g => ({ ...g, weightage: g.weightage ?? 0 })));
  }, [departmentGoals]);

  const redemptionDate = getRedemptionDate();

  // Notification items are scoped to direct reports only — skip-level members route
  // their feedback to their own direct manager (e.g. Priya handles James & Liu Wei)
  const directReportIds = new Set(
    teamMembers.filter(m => m.directManager === effectiveName).map(m => m.id)
  );

  // Resolve a team member's development goal count regardless of which switchable persona
  // (staff/admin/ops) is currently active, so leave-supervisor notifications stay accurate.
  const devGoalCountFor = (memberId: string): number => {
    if (memberId === staffMemberId) return staffDevGoals.length;
    if (memberId === adminMemberId) return adminDevGoals.length;
    return teamDevGoalsById[memberId]?.length ?? 0;
  };

  // 30-day goal-setting rule: separate notifications for missing performance vs development
  // goals. Within the window, framed as a points-earning opportunity; past day 30, framed as
  // a deduction that has already applied.
  const goalStatusNotifsFor = (m: TeamMember, goTo: () => void) => {
    // Performance goals = Objectives/Key Results this member owns in the live OKR data, not the
    // deprecated per-member `goals` array — using the latter here is what let a HOD's Team OKRs
    // assignment go completely unreflected on the Home page (see keyResultsOwnedBy/objectivesOwnedBy
    // in utils.ts, the same computation MyGoalsSection already uses for "total performance goals").
    const perfCount = keyResultsOwnedBy(m.name, departmentGoals, opsDepartmentGoals).length + objectivesOwnedBy(m.name, departmentGoals, opsDepartmentGoals).length;
    const devCount = devGoalCountFor(m.id);
    const daysIn = daysSinceJoin(m.joinDate);
    const withinWindow = daysIn <= GOAL_WINDOW_DAYS;
    const items: { icon: string; title: string; sub: string; time: string; action: () => void }[] = [];
    if (perfCount < PERF_GOAL_MIN) {
      items.push(withinWindow ? {
        icon: "⏰",
        title: `${m.name} needs ${PERF_GOAL_MIN - perfCount} more performance goal${PERF_GOAL_MIN - perfCount > 1 ? "s" : ""}`,
        sub: `${perfCount}/${PERF_GOAL_MIN} minimum set (max ${PERF_GOAL_MAX}) · Day ${daysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set`,
        time: "30-Day Rule", action: goTo,
      } : {
        icon: "🔴",
        title: `${m.name} has not set minimum performance goals`,
        sub: `${perfCount}/${PERF_GOAL_MIN} minimum set · 30-day window passed · −30 pts deducted`,
        time: "Overdue", action: goTo,
      });
    }
    if (devCount < DEV_GOAL_MIN) {
      items.push(withinWindow ? {
        icon: "⏰",
        title: `${m.name} needs ${DEV_GOAL_MIN - devCount} development goal${DEV_GOAL_MIN - devCount > 1 ? "s" : ""}`,
        sub: `${devCount}/${DEV_GOAL_MIN} minimum set (max ${DEV_GOAL_MAX}) · Day ${daysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set`,
        time: "30-Day Rule", action: goTo,
      } : {
        icon: "🔴",
        title: `${m.name} has not set minimum development goals`,
        sub: `${devCount}/${DEV_GOAL_MIN} minimum set · 30-day window passed · −30 pts deducted`,
        time: "Overdue", action: goTo,
      });
    }
    return items;
  };

  const pendingByMember = teamMembers
    .filter(m => directReportIds.has(m.id))
    .map(m => ({
      member: m,
      count: m.goals.reduce((acc, g) => acc + g.remarks.filter(r => r.pending).length, 0),
      goalTitles: m.goals.filter(g => g.remarks.some(r => r.pending)).map(g => g.title),
    }))
    .filter(x => x.count > 0);

  const pendingApprovalByMember = teamMembers
    .filter(m => directReportIds.has(m.id))
    .map(m => ({
      member: m,
      goals: m.goals.filter(g => !g.approved),
    }))
    .filter(x => x.goals.length > 0);

  const redMembers = teamMembers.filter(m => directReportIds.has(m.id) && m.rag === "red");

  // Type B: approved goals where staff submitted a RAG status awaiting manager acknowledgment
  const pendingRagApprovalByMember = teamMembers
    .filter(m => directReportIds.has(m.id))
    .flatMap(m =>
      m.goals
        .filter(g => g.approved && g.ragPendingApproval)
        .map(g => ({ member: m, goal: g }))
    );

  // Goals overdue for approval (submitted > 7 working days ago — incur -10 pts each)
  function workingDaysSince(dateStr?: string): number {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const today = new Date();
    let days = 0;
    const cur = new Date(start);
    while (cur < today) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }
  const overdueApprovalByMember = pendingApprovalByMember
    .map(({ member, goals }) => ({
      member,
      goals: goals.filter(g => workingDaysSince(g.submittedDate) > 7),
    }))
    .filter(x => x.goals.length > 0);

  // Mixed dept goal RAGs that need HOD confirmation
  const mixedRagGoals = isHod ? draftGoals.filter(g => {
    const { isMixed, isConfirmed } = computeDeptRag(g, teamMembers);
    return isMixed && !isConfirmed;
  }) : [];

  // Nudged goals — direct reports who clicked "Nudge Supervisor" — shown first
  const nudgedNotifItems = teamMembers
    .filter(m => directReportIds.has(m.id))
    .flatMap(m =>
      m.goals
        .filter(g => !g.approved && nudgedGoalIds.has(g.id))
        .map(g => ({
          icon: "🔔",
          title: `${m.name} nudged you — "${g.title}" awaiting approval`,
          sub: `Your team member flagged this as overdue for review — click to open their goals`,
          time: "Nudged",
          action: () => { setPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); },
        }))
    );

  // Monthly RAG-confidence nudge for every Key Result the viewer owns — a soft reminder (no
  // penalty; see act18/checkOverduePenalties), so this only ever shows a notification, never a
  // point deduction.
  const staleConfidenceKrs = departmentGoals.flatMap(dg =>
    (dg.keyResults ?? [])
      .filter(k => isAmongOwners(k.owner, effectiveName) && !isPendingAckFor(k, effectiveName) && isConfidenceStale(k.ragConfidenceUpdatedDate))
      .map(k => ({ dg, k }))
  );

  // Check-in cadence nudge — same "Reminder" treatment as the stale-confidence nudge just below,
  // reusing this same opt-in popup (never a standalone banner/badge) so it surfaces exactly where a
  // manager already looks for "what needs my attention," instead of adding new always-visible
  // chrome to Team-at-a-Glance's per-row bells. Direct reports only, capped so a HOD who's behind
  // on many check-ins doesn't get an alarming wall of identical reminders.
  const overdueCheckInNudges = isHod
    ? teamMembers
        .filter(m => directReportIds.has(m.id))
        .map(m => ({ member: m, days: daysSinceLastCheckIn(checkIns, effectiveName, m.name) }))
        .filter(x => x.days === null || x.days > CHECK_IN_CADENCE_DAYS)
        .slice(0, 5)
    : [];

  // Log each surfaced check-in nudge once per member per day to the AI activity log — so the AI
  // Governance panel's audit trail reflects nudges actually shown to a manager, not just seed
  // history. Mirrors Viva Glint's guardrail that every nudge sent is logged and never silent.
  const openPendingActions = () => {
    const today = new Date().toISOString().slice(0, 10);
    overdueCheckInNudges.forEach(({ member, days }) => {
      const alreadyLoggedToday = aiActivityLog.some(
        e => e.kind === "nudge" && e.targetName === member.name && e.date === today,
      );
      if (!alreadyLoggedToday) {
        logAiActivity({
          date: today, kind: "nudge",
          summary: `Nudged ${effectiveName} — no check-in with ${member.name} in ${days ?? CHECK_IN_CADENCE_DAYS}+ days`,
          targetName: member.name, actorName: effectiveName,
        });
      }
    });
    setPendingOpen(true);
  };

  const allNotifItems = [
    ...nudgedNotifItems.map(n => ({ ...n, category: "Goal Nudges" })),
    ...overdueCheckInNudges.map(({ member, days }) => ({
      category: "1:1 Check-ins",
      icon: "💬",
      title: `Check in with ${member.name}`,
      sub: days === null ? "No check-in logged yet" : `Last check-in was ${days} days ago — recommended cadence is every 30 days`,
      time: "Reminder",
      action: () => { setPendingOpen(false); setTeamMemberDrawerReturnHome(true); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    ...staleConfidenceKrs.map(({ dg, k }) => ({
      category: "Confidence Updates",
      icon: "🔄",
      title: `Update RAG confidence — "${k.title}"`,
      sub: `Recommended monthly cadence · last updated ${k.ragConfidenceUpdatedDate ?? "never"} · part of "${dg.title}"`,
      time: "Reminder",
      action: () => { setPendingOpen(false); setSection("team"); },
    })),
    ...mixedRagGoals.map(g => ({
      category: "Progress Status",
      icon: "🔀",
      title: `${g.title} — ${currentQuarterKey()} progress status needs confirmation`,
      sub: "Team members have differing statuses — please confirm the overall quarterly progress status",
      time: "Action Required",
      action: () => { setPendingOpen(false); setSection("team"); },
    })),
    ...teamMembers
      .filter(m => directReportIds.has(m.id))
      .flatMap(m => goalStatusNotifsFor(m, () => { setPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); }))
      .map(n => ({ ...n, category: "Progress Status" })),
    // Type A: goals pending manager approval (+10 pts per review, +5 with feedback)
    ...pendingApprovalByMember.map(({ member, goals }) => ({
      category: "Goal Approvals",
      icon: "📋",
      title: `${member.name} — ${goals.length} goal${goals.length > 1 ? "s" : ""} pending your approval`,
      sub: `Review within 7 working days: +${goals.length * 10} pts (+5 per goal with feedback). ${goals.slice(0, 1).map(g => g.title).join("")}${goals.length > 1 ? ` +${goals.length - 1} more` : ""}`,
      time: "Pending Approval",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    // Type B: approved goals with RAG status submitted, pending manager acknowledgment
    ...pendingRagApprovalByMember.map(({ member, goal }) => ({
      category: "Progress Status",
      icon: "📊",
      title: `${member.name} — ${goal.ragPendingApproval} status update pending your review`,
      sub: `"${goal.title}" · Review the ${goal.ragPendingApproval} progress status to earn +10 pts; overdue reviews incur −10 pts`,
      time: "Status Pending",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    // A direct supervisor proposed a change to a report's contributing goal — HOD review, no penalty SLA
    ...myPendingGoalEditProposals.filter(p => p.source === "supervisor").map(p => ({
      category: "Goal Change Requests",
      icon: "✏️",
      title: `${p.proposedBy} proposed a change to ${p.memberName}'s goal — pending your review`,
      sub: `"${p.goalTitle}" · Review and adjust % contribution as needed before saving`,
      time: "Pending Review",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(p.memberId); setSection("team"); },
    })),
    // A staff member proposed a change to their own goal — HOD accept/reject within 7 working days
    ...myPendingGoalEditProposals.filter(p => p.source === "self").map(p => ({
      category: "Goal Change Requests",
      icon: "✏️",
      title: `${p.memberName} proposed a change to their goal — pending your approval`,
      sub: `"${p.goalTitle}" · Review within 7 working days: accept or reject, with an optional remark — or a 5-point penalty applies`,
      time: "Pending Approval",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(p.memberId); setSection("team"); },
    })),
    // Overdue approvals: -10 pts automatically deducted per goal after 7 working days
    ...overdueApprovalByMember.map(({ member, goals }) => ({
      category: "Goal Approvals",
      icon: "🔴",
      title: `⚠️ Overdue: ${member.name}'s ${goals.length} goal${goals.length > 1 ? "s" : ""} unreviewed past 7 working days`,
      sub: `Point deduction applied: −${goals.length * 10} pts. Review now to stop further deductions.`,
      time: "Overdue",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    ...pendingByMember.map(({ member, count, goalTitles }) => ({
      category: "Remarks",
      icon: "⏳",
      title: `${member.name} — ${count} pending remark${count > 1 ? "s" : ""}`,
      sub: goalTitles.join(" · ") || member.role,
      time: "Today",
      action: () => { setPendingOpen(false); setActiveMember(member); },
    })),
    {
      category: "Rewards",
      icon: "🎁",
      title: `Redemption closes ${redemptionDate}`,
      sub: `Exchange your ${points} pts for Giftano vouchers before the deadline`,
      time: "Reminder",
      action: () => { setPendingOpen(false); setSection("rewards"); },
    },
    ...redMembers.map(m => ({
      category: "Alerts",
      icon: "🔴",
      title: `Goal at risk — ${m.name}`,
      sub: `${m.name}'s goals have moved to RED — click to review`,
      time: "Alert",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); },
    })),
    ...allTeamMemberSkills
      .filter(m => directReportIds.has(m.memberId) && m.pending.length > 0)
      .map(m => ({
        category: "Skill Endorsements",
        icon: "🎓",
        title: `${m.memberName} — ${m.pending.length} skill${m.pending.length > 1 ? "s" : ""} pending your endorsement`,
        sub: `Endorse within 7 working days: +10 pts per skill. Overdue endorsements incur −10 pts each. ${m.pending.join(", ")}`,
        time: "Endorse",
        action: () => {
          setPendingOpen(false);
          setFocusedSkillsMemberId(m.memberId);
          setSection("skills");
        },
      })),
    // Overdue skill endorsements: −10 pts per skill after 7 working days
    ...teamMemberPendingSkills
      .filter(m => directReportIds.has(m.memberId) && workingDaysSince(m.notifiedDate) > 7)
      .map(m => ({
        category: "Skill Endorsements",
        icon: "🔴",
        title: `⚠️ Overdue: ${m.memberName}'s ${m.pending.length} skill${m.pending.length > 1 ? "s" : ""} unendorsed past 7 working days`,
        sub: `Point deduction applied: −${m.pending.length * 10} pts. Endorse now to stop further deductions.`,
        time: "Overdue",
        action: () => {
          setPendingOpen(false);
          setFocusedSkillsMemberId(m.memberId);
          setSection("skills");
        },
      })),
  ];

  const handleSaveGoals = async (goals: DeptGoal[]) => {
    await saveDepartmentGoals(goals.map(g => ({ ...g, weightage: g.weightage ?? 0 })));
    setDraftGoals(goals);
  };

  // Directors are usual accounts with an added supervisory layer — their Home mirrors an HOD's own
  // (Department/Team OKRs summary + Team-at-a-Glance), just built from real cross-department data
  // (getRelevantDeptsForViewer) instead of one fixed roster, since a director's "team" is whichever
  // HODs actually list them as their real leave supervisor per users.csv.
  if (directorMeta) {
    const { depts: directorDepts } = getRelevantDeptsForViewer(directorMeta.name, directorMeta.department, staffList);
    const DIR_GOALS_BY_DEPT: Record<string, DeptGoal[]> = {
      [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
      [COMPLIANCE_DEPT_NAME]: complianceDepartmentGoals, [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
    };
    // Every department's own full roster, combined — Team-at-a-Glance needs the WHOLE set (not
    // just the director's immediate HOD reports) so expanding a supervisor's row can still find
    // *their* reports within the same department, exactly like the normal HOD flow does.
    const allKnownMembers = [...hcwmTeamMembers, ...opsTeamMembersAll, ...complianceTeamMembers, ...marketingTeamMembers];

    return (
      <div className="space-y-6">
        <div
          className="rounded-2xl overflow-hidden px-6 py-8 relative"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <Building2 className="absolute -right-3 -bottom-3 text-white/15 pointer-events-none" size={120} strokeWidth={1.2} />
          <div className="relative text-white">
            <div className="text-xs uppercase tracking-widest text-white/70">Welcome back</div>
            <div className="font-display text-3xl mt-1">{directorMeta.name}</div>
            <div className="text-sm text-white/80 mt-1">{directorMeta.designation}</div>
          </div>
        </div>

        {/* ── Department/Team OKRs summary — one collapsed card per department you oversee, real
            objective counts/confidence/score, not just a bare name list. Full editing (same rights
            as any HOD, with the real HOD acknowledging your changes) lives on Team OKRs. ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Department/Team OKRs</h2>
            <button onClick={() => setSection("team")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium">
              <Target className="size-3.5" /> Open Team OKRs
            </button>
          </div>
          {directorDepts.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground py-2">No department HODs currently list you as their leave supervisor.</p></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {directorDepts.map(dept => {
                const goals = DIR_GOALS_BY_DEPT[dept] ?? [];
                const allKrs = goals.flatMap(g => g.keyResults ?? []);
                const scored = allKrs.filter(k => k.score !== undefined);
                const avgScore = scored.length > 0 ? scored.reduce((s, k) => s + (k.score ?? 0), 0) / scored.length : null;
                return (
                  <Card key={dept} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Building2 className="size-3.5 text-primary shrink-0" /> {dept}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{goals.length} objective{goals.length === 1 ? "" : "s"}</span>
                      <span>{allKrs.length} key result{allKrs.length === 1 ? "" : "s"}</span>
                      {avgScore !== null && <span className="font-medium text-foreground">Avg score {avgScore.toFixed(1)}</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Team at a Glance — your real direct-report HODs, per users.csv, same expand-to-see-
            their-reports interaction any HOD's own view already has. ── */}
        <Card>
          <div className="mb-3">
            <h2 className="font-display text-xl">Team At A Glance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Department HODs who report directly to you</p>
          </div>
          <TeamAtAGlanceSection teamMembers={allKnownMembers} viewerName={directorMeta.name} isHodViewer={true} />
        </Card>

        {/* Development Roadmap — tailored from the director's own real designation/department (not
            borrowed from whichever staff persona happens to be switched in elsewhere), same SSG
            Skills Framework routing every non-HCWM role gets. */}
        <Card>
          <SectionTitle sub="Your own role's track on the SSG Skills Framework for Financial Services (financial services sector).">
            Development Roadmap
          </SectionTitle>
          <a
            href={getSSGJobFunctionUrl(directorMeta.designation, directorMeta.department).url}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLink className="size-3.5" />
            View the full SSG Skills Framework for {getSSGJobFunctionUrl(directorMeta.designation, directorMeta.department).track}
          </a>
        </Card>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSection("skills")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border font-medium"
          >
            <ExternalLink className="size-3.5" /> Organisational Competency Gaps (Skills Profile)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isManager && (
        <>
          {/* ── Metric cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 55%, #1D4ED8 100%)" }}
              onClick={openPendingActions}
            >
              <Laptop
                className="absolute -right-3 -bottom-3 text-white/20 pointer-events-none"
                style={{ width: 100, height: 100 }}
                strokeWidth={1.2}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-white/70">Pending Actions</div>
                <div className="font-display text-4xl mt-2 text-white">{allNotifItems.length}</div>
                <div className="text-xs text-white/80 mt-1">items need your attention</div>
              </div>
            </div>

            {/* Points YTD — vibrant amber with gift graphic */}
            <div
              className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              style={{ background: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0891B2 100%)" }}
              onClick={() => setSection("rewards")}
            >
              {/* Decorative gift icon */}
              <Gift
                className="absolute -right-4 -bottom-4 text-white/20 pointer-events-none"
                style={{ width: 110, height: 110 }}
                strokeWidth={1.2}
              />
              {/* Ribbon detail */}
              <div className="absolute right-8 bottom-8 w-0.5 h-16 bg-white/15 rounded-full pointer-events-none" />
              <div className="absolute right-2 bottom-12 w-16 h-0.5 bg-white/15 rounded-full pointer-events-none" />

              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-white/70">Points YTD</div>
                <div className="font-display text-4xl mt-2 text-white">{displayPoints}</div>
                <div className="text-xs text-white/80 mt-1">earned through dashboard</div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Gift className="size-3 text-white/60" />
                  <span className="text-[10px] text-white/60 leading-snug">
                    Redeem by {redemptionDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Department/Team OKRs ── */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <LaptopLightbulbSVG />
                  <h2 className="font-display text-2xl">Department/Team OKRs</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">2026 Objectives for {effectiveDept}</p>
              </div>
            </div>

            <DeptTeamOkrSection
              objectives={draftGoals}
              viewerName={effectiveName}
              isHodViewer={isHod}
              teamMembers={teamMembers}
              deptGoalSkills={deptGoalSkills}
              onViewAllTeamOkrs={() => setSection("team")}
            />
          </div>

          <TeamHealthWidget mode="manager" viewerName={effectiveName} viewerDept={effectiveDept} />

          {/* ── Team At A Glance + Roadmap ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="mb-5">
                <div className="flex items-center gap-2.5">
                  <StrawberrySVG />
                  <h2 className="font-display text-2xl">Team At A Glance</h2>
                </div>
              </div>
              <TeamAtAGlanceSection teamMembers={teamMembers} viewerName={effectiveName} isHodViewer={isHod} />
            </Card>

            <Card>
              <div className="mb-5">
                <div className="flex items-center gap-2.5">
                  <LemonSVG />
                  <h2 className="font-display text-2xl">Development Roadmap</h2>
                </div>
                {isNewHire && <p className="text-sm text-muted-foreground mt-1">Your onboarding path.</p>}
              </div>
              {isNewHire ? <Roadmap items={milestones as any} /> : <DevelopmentRoadmap />}
            </Card>
          </div>
        </>
      )}

      {!isManager && (() => {
        const staffMember = teamMembers.find(m => m.id === currentStaffMemberId);
        const staffPoints = staffMember?.pointsYTD ?? 0;
        const pendingApprovalGoals = staffMember?.goals.filter(g => !g.approved) ?? [];
        const pendingAckGoals = staffMember?.goals.filter(g => g.pendingAcknowledgement) ?? [];
        const devGoalsDueSoon = currentStaffDevGoals.filter(g => !g.completed && isDueWithinOneMonth(g.dueDate));

        // Detect if the viewed staff member (Priya) manages others — show team features if so
        const staffMemberHasTeam = staffMember
          ? teamMembers.some(m => m.directManager === staffMember.name)
          : false;
        const staffTeamDirectReportIds = staffMemberHasTeam
          ? new Set(teamMembers.filter(m => m.directManager === staffMember!.name).map(m => m.id))
          : new Set<string>();
        const staffTeamPendingApprovalByMember = staffMemberHasTeam
          ? teamMembers
              .filter(m => staffTeamDirectReportIds.has(m.id))
              .map(m => ({ member: m, goals: m.goals.filter(g => !g.approved) }))
              .filter(x => x.goals.length > 0)
          : [];
        const staffTeamPendingByMember = staffMemberHasTeam
          ? teamMembers
              .filter(m => staffTeamDirectReportIds.has(m.id))
              .map(m => ({
                member: m,
                count: m.goals.reduce((acc, g) => acc + g.remarks.filter(r => r.pending).length, 0),
                goalTitles: m.goals.filter(g => g.remarks.some(r => r.pending)).map(g => g.title),
              }))
              .filter(x => x.count > 0)
          : [];
        const staffTeamRedMembers = staffMemberHasTeam
          ? teamMembers.filter(m => staffTeamDirectReportIds.has(m.id) && m.rag === "red")
          : [];
        const staffTeamPendingSkills = staffMemberHasTeam
          ? allTeamMemberSkills.filter(m => staffTeamDirectReportIds.has(m.memberId) && m.pending.length > 0)
          : [];

        const staffDevGoalCount = currentStaffDevGoals.length;
        // Performance goals = Objectives/Key Results this member owns in the live OKR data (see
        // goalStatusNotifsFor above for the same fix and why the old `goals.length` was stale/wrong).
        const staffPerfGoalCount = staffMember
          ? keyResultsOwnedBy(staffMember.name, departmentGoals, opsDepartmentGoals).length + objectivesOwnedBy(staffMember.name, departmentGoals, opsDepartmentGoals).length
          : 0;
        const staffRagPendingGoals = staffMember?.goals.filter(g => g.approved && g.ragPendingApproval) ?? [];
        const staffDaysIn = daysSinceJoin(opsMeta ? opsMeta.user.joinDate : staffMember?.joinDate);
        const staffWithinWindow = staffDaysIn <= GOAL_WINDOW_DAYS;

        const staffNotifItems = [
          // Goal minimums — 30-day rule: 3–5 performance goals, 1–10 development goals required
          ...(staffDevGoalCount < DEV_GOAL_MIN ? [staffWithinWindow ? {
            category: "Goal Minimums",
            icon: "⏰",
            title: `${DEV_GOAL_MIN - staffDevGoalCount} more development goal${DEV_GOAL_MIN - staffDevGoalCount > 1 ? "s" : ""} needed`,
            sub: `You have ${staffDevGoalCount}/${DEV_GOAL_MIN} minimum (max ${DEV_GOAL_MAX}). Day ${staffDaysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set.`,
            time: "30-Day Rule",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          } : {
            category: "Goal Minimums",
            icon: "🔴",
            title: "Development goals minimum not met",
            sub: `You have ${staffDevGoalCount}/${DEV_GOAL_MIN} minimum. 30-day window passed — −30 pts deducted.`,
            time: "Overdue",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          }] : []),
          ...(staffPerfGoalCount < PERF_GOAL_MIN ? [staffWithinWindow ? {
            category: "Goal Minimums",
            icon: "⏰",
            title: `${PERF_GOAL_MIN - staffPerfGoalCount} more performance goal${PERF_GOAL_MIN - staffPerfGoalCount > 1 ? "s" : ""} needed`,
            sub: `You have ${staffPerfGoalCount}/${PERF_GOAL_MIN} minimum (max ${PERF_GOAL_MAX}). Day ${staffDaysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set.`,
            time: "30-Day Rule",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          } : {
            category: "Goal Minimums",
            icon: "🔴",
            title: "Performance goals minimum not met",
            sub: `You have ${staffPerfGoalCount}/${PERF_GOAL_MIN} minimum. 30-day window passed — −30 pts deducted.`,
            time: "Overdue",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          }] : []),
          // Type A: own performance goals pending manager approval
          ...(pendingApprovalGoals.length > 0 ? [{
            category: "Goal Approvals",
            icon: "📋",
            title: `${pendingApprovalGoals.length} performance goal${pendingApprovalGoals.length > 1 ? "s" : ""} pending manager approval`,
            sub: `No goal status will be shown until approved. ${pendingApprovalGoals.slice(0, 1).map(g => g.title).join("")}${pendingApprovalGoals.length > 1 ? ` +${pendingApprovalGoals.length - 1} more` : ""}`,
            time: "Pending Approval",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          }] : []),
          // Type B: approved goals where submitted RAG status is pending manager acknowledgment
          ...staffRagPendingGoals.map(g => ({
            category: "Progress Status",
            icon: "📊",
            title: `${g.ragPendingApproval} status update pending manager review`,
            sub: `"${g.title}" · Awaiting your manager's acknowledgment before status is confirmed`,
            time: "Status Pending",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          })),
          ...pendingAckGoals.map(g => ({
            category: "Goal Change Requests",
            icon: "✏️",
            title: `Goal modified by your manager: "${g.title}"`,
            sub: "Review the updated goal description, metric, or linkage and acknowledge the change",
            time: "Acknowledge",
            action: () => { setStaffPendingOpen(false); setFocusedGoalId(g.id); setSection("mygoals"); },
          })),
          ...devGoalsDueSoon.map(g => ({
            category: "Development Goals",
            icon: "🎯",
            title: `Dev goal due soon: ${g.title}`,
            sub: `Due: ${formatDueDate(g.dueDate)} — mark complete or update your progress`,
            time: "Due",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          })),
          ...currentStaffDevGoals
            .filter(g => managerInputs[`${currentStaffMemberId}:${g.id}`] && !acknowledgedManagerInputs[`${currentStaffMemberId}:${g.id}`])
            .map(g => ({
              category: "Development Goals",
              icon: "💬",
              title: `Manager feedback: ${g.title}`,
              sub: "Your manager has shared feedback & recommendations on this development goal",
              time: "Acknowledge",
              action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
            })),
          ...(pendingDevGoalRecs[currentStaffMemberId] ?? []).map(rec => {
            const daysElapsed = workingDaysSince(rec.recommendedDate);
            const isOverdue = daysElapsed >= 7;
            return {
              category: "Development Goals",
              icon: isOverdue ? "🔴" : "🎓",
              title: `Recommended development goal: ${rec.title}`,
              sub: isOverdue
                ? `${rec.recommendedBy} recommended this — response overdue, −5 pts applied. Acknowledge or decline now.`
                : `${rec.recommendedBy} recommended this — acknowledge or decline within ${7 - daysElapsed} more working day${7 - daysElapsed !== 1 ? "s" : ""} or −5 pts applies`,
              time: isOverdue ? "Overdue" : "Acknowledge",
              action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
            };
          }),
          // Team notifications — only surfaced when the viewed staff member manages direct reports
          ...(staffMemberHasTeam ? teamMembers
            .filter(m => staffTeamDirectReportIds.has(m.id))
            .flatMap(m => goalStatusNotifsFor(m, () => { setStaffPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); }))
            .map(n => ({ ...n, category: "Progress Status" })) : []),
          ...staffTeamPendingApprovalByMember.map(({ member, goals }) => ({
            category: "Goal Approvals",
            icon: "📋",
            title: `${member.name} — ${goals.length} goal${goals.length > 1 ? "s" : ""} pending your approval`,
            sub: `Review within 7 working days: +${goals.length * 10} pts (+5 per goal with feedback). ${goals.slice(0, 1).map(g => g.title).join("")}${goals.length > 1 ? ` +${goals.length - 1} more` : ""}`,
            time: "Pending Approval",
            action: () => { setStaffPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
          })),
          ...staffTeamPendingByMember.map(({ member, count, goalTitles }) => ({
            category: "Remarks",
            icon: "⏳",
            title: `${member.name} — ${count} pending remark${count > 1 ? "s" : ""}`,
            sub: goalTitles.join(" · ") || member.role,
            time: "Today",
            action: () => { setStaffPendingOpen(false); setActiveMember(member); },
          })),
          ...staffTeamRedMembers.map(m => ({
            category: "Alerts",
            icon: "🔴",
            title: `Goal at risk — ${m.name}`,
            sub: `${m.name}'s goals have moved to RED — click to review`,
            time: "Alert",
            action: () => { setStaffPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); },
          })),
          ...staffTeamPendingSkills.map(m => ({
            category: "Skill Endorsements",
            icon: "🎓",
            title: `${m.memberName} — ${m.pending.length} skill${m.pending.length > 1 ? "s" : ""} pending your endorsement`,
            sub: m.pending.join(", "),
            time: "Endorse",
            action: () => { setStaffPendingOpen(false); setFocusedSkillsMemberId(m.memberId); setSection("skills"); },
          })),
          {
            category: "Rewards",
            icon: "🎁",
            title: `Redemption closes ${redemptionDate}`,
            sub: `Exchange your ${staffPoints} pts for Giftano vouchers before the deadline`,
            time: "Reminder",
            action: () => { setStaffPendingOpen(false); setSection("rewards"); },
          },
        ];

        return (
          <>
            {/* ── Staff metric cards (same as manager, no Team at a Glance) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
                style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 55%, #1D4ED8 100%)" }}
                onClick={() => setStaffPendingOpen(true)}
              >
                <Target
                  className="absolute -right-3 -bottom-3 text-white/20 pointer-events-none"
                  style={{ width: 100, height: 100 }}
                  strokeWidth={1.2}
                />
                <div className="relative">
                  <div className="text-xs uppercase tracking-widest text-white/70">Pending Actions</div>
                  <div className="font-display text-4xl mt-2 text-white">{staffNotifItems.length}</div>
                  <div className="text-xs text-white/80 mt-1">items need your attention</div>
                </div>
              </div>

              <div
                className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
                style={{ background: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0891B2 100%)" }}
                onClick={() => setSection("rewards")}
              >
                <Gift
                  className="absolute -right-4 -bottom-4 text-white/20 pointer-events-none"
                  style={{ width: 110, height: 110 }}
                  strokeWidth={1.2}
                />
                <div className="absolute right-8 bottom-8 w-0.5 h-16 bg-white/15 rounded-full pointer-events-none" />
                <div className="absolute right-2 bottom-12 w-16 h-0.5 bg-white/15 rounded-full pointer-events-none" />
                <div className="relative">
                  <div className="text-xs uppercase tracking-widest text-white/70">Points YTD</div>
                  <div className="font-display text-4xl mt-2 text-white">{staffPoints}</div>
                  <div className="text-xs text-white/80 mt-1">earned through dashboard</div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Gift className="size-3 text-white/60" />
                    <span className="text-[10px] text-white/60 leading-snug">Redeem by {redemptionDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Department/Team OKRs (read-only) ── */}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <LaptopLightbulbSVG />
                <h2 className="font-display text-2xl">Department/Team OKRs</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-5">2026 Objectives for {effectiveDept}</p>
              <DeptTeamOkrSection
                objectives={draftGoals}
                viewerName={staffMember?.name ?? ""}
                isHodViewer={false}
                teamMembers={teamMembers}
                deptGoalSkills={deptGoalSkills}
                onViewAllTeamOkrs={() => setSection("team")}
              />
            </div>

            {staffMember && (
              <TeamHealthWidget
                mode="staff"
                viewerName={staffMember.name}
                viewerDept={effectiveDept}
                managerName={staffMember.directManager}
              />
            )}

            {/* ── Team At A Glance + Roadmap (side by side when staff manages a team) ── */}
            {staffMemberHasTeam ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5">
                      <StrawberrySVG />
                      <h2 className="font-display text-2xl">Team At A Glance</h2>
                    </div>
                  </div>
                  <TeamAtAGlanceSection teamMembers={teamMembers} viewerName={staffMember!.name} isHodViewer={false} />
                </Card>
                <Card>
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5">
                      <LemonSVG />
                      <h2 className="font-display text-2xl">Development Roadmap</h2>
                    </div>
                    {isNewHire && <p className="text-sm text-muted-foreground mt-1">Your onboarding path.</p>}
                  </div>
                  {isNewHire ? <Roadmap items={milestones as any} /> : <DevelopmentRoadmap />}
                </Card>
              </div>
            ) : (
              <Card>
                <div className="mb-5">
                  <div className="flex items-center gap-2.5">
                    <LemonSVG />
                    <h2 className="font-display text-2xl">Development Roadmap</h2>
                  </div>
                  {isNewHire && <p className="text-sm text-muted-foreground mt-1">Your onboarding path.</p>}
                </div>
                {isNewHire ? <Roadmap items={milestones as any} /> : <DevelopmentRoadmap />}
              </Card>
            )}

            {/* Staff pending actions popup */}
            {staffPendingOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setStaffPendingOpen(false)}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div
                  className="relative bg-background border border-border rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-[500px] max-h-[80vh] flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                      <div className="font-display text-xl">What Needs Your Attention</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{staffNotifItems.length} items</div>
                    </div>
                    <button onClick={() => setStaffPendingOpen(false)} className="size-8 rounded-full hover:bg-muted grid place-items-center">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-border/50 overflow-y-auto max-h-[480px]">
                    {staffNotifItems.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
                    ) : (
                      <GroupedNotifList items={staffNotifItems} />
                    )}
                  </div>
                  <div className="px-5 py-2.5 border-t border-border bg-muted/20 shrink-0">
                    <button onClick={() => setStaffPendingOpen(false)} className="text-xs text-primary hover:underline">Dismiss</button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Pending Actions popup — notification-style, mirrors former bell dropdown */}
      {pendingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPendingOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-background border border-border rounded-2xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <div className="font-display text-xl">What Needs Your Attention</div>
                <div className="text-xs text-muted-foreground mt-0.5">{allNotifItems.length} items</div>
              </div>
              <button onClick={() => setPendingOpen(false)} className="size-8 rounded-full hover:bg-muted grid place-items-center">
                <X className="size-4" />
              </button>
            </div>

            {/* Notification list */}
            <div className="divide-y divide-border/50 overflow-y-auto max-h-[480px]">
              {allNotifItems.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
              ) : (
                <GroupedNotifList items={allNotifItems} />
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 shrink-0">
              <button onClick={() => setPendingOpen(false)} className="text-xs text-primary hover:underline">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team drawer from pending actions */}
      {activeMember && <TeamDrawer member={activeMember} onClose={() => setActiveMember(null)} />}
    </div>
  );
}

// ── Roadmap (onboarding — new hires only) ─────────────────────────────────────

function Roadmap({ items }: { items: { id: string; name: string; date: string; complete: boolean }[] }) {
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
      {items.map(m => (
        <div key={m.id} className="relative">
          <div className="absolute -left-[18px] top-0.5">
            {m.complete ? (
              <CheckCircle2 className="size-4 text-rag-green bg-card" />
            ) : (
              <Circle className="size-4 text-muted-foreground bg-card" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className={m.complete ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>{m.name}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />{m.date}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


const ROADMAP_DEV_GOAL_MAX = 10;

function DevelopmentRoadmap() {
  const {
    tier, skills, allTeamMemberSkills, staffMemberId, adminMemberId, currentUser, teamMembers, staffList, addPendingSkill, opsMeta,
    staffDevGoals, adminDevGoals, managerDevGoals, upsertStaffDevGoal, upsertAdminDevGoal, upsertManagerDevGoal,
    awardMemberPoints, flagGoalPendingDueDate,
  } = useApp();
  const isOpsTier = tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";
  const isAdmin = tier === "admin";
  const isStaff = tier === "staff";

  // Resolve the viewer's own dev-goal list/upsert function and id — same resolution StaffGoalsView
  // (MyGoalsSection.tsx) uses — so "Add as Development Goal" writes to the right place regardless
  // of which persona is currently being viewed.
  const currentDevGoals = opsMeta ? opsMeta.devGoals : isAdmin ? adminDevGoals : isStaff ? staffDevGoals : managerDevGoals;
  const upsertDevGoal = opsMeta ? opsMeta.upsertDevGoal : isAdmin ? upsertAdminDevGoal : isStaff ? upsertStaffDevGoal : upsertManagerDevGoal;
  const devGoalMemberId = opsMeta ? opsMeta.personaId : isAdmin ? adminMemberId : isStaff ? staffMemberId : "u0";

  // Resolve the viewed user's role/dept/grade for SSG Skills Framework-matched skill recommendations
  const viewedMemberId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : null;
  const viewedMember = viewedMemberId ? teamMembers.find(m => m.id === viewedMemberId) : null;
  const designation = isOpsTier ? (opsMeta?.user.designation ?? currentUser.designation) : (viewedMember?.role ?? currentUser.designation);
  const dept = isOpsTier ? (opsMeta?.user.department ?? currentUser.department) : (viewedMember?.dept ?? currentUser.department);
  const grade = isOpsTier ? (opsMeta?.user.grade ?? currentUser.grade) : ((viewedMember ? staffList.find(s => s.name === viewedMember.name)?.grade : null) ?? currentUser.grade);

  // Verified and pending skills for this user — same source as Skills Profile tab
  const memberSkills = isOpsTier
    ? (opsMeta?.skills ?? null)
    : (viewedMemberId ? allTeamMemberSkills.find(m => m.memberId === viewedMemberId) : null);
  const verifiedSkills: string[] = memberSkills ? memberSkills.verified : (skills as { verified: string[] }).verified ?? [];
  const pendingSkills: string[] = memberSkills ? memberSkills.pending : (skills as { pending: string[] }).pending ?? [];

  // Route to IHRP for HCWM staff, the SSG Skills Framework for all others
  const isHCWM = isHCWMDept(dept);
  const ihrpBadges = isHCWM ? getIHRPBadgesForRole(designation, grade) : null;
  const roadmapUrl = isHCWM
    ? "https://ihrp.sg/skill-badges-overview/"
    : getSSGJobFunctionUrl(designation, dept).url;
  const roadmapTrack = isHCWM
    ? "Human Capital Professionals"
    : getSSGJobFunctionUrl(designation, dept).track;

  const grouped: [string, string[], string][] = [];

  if (isHCWM && ihrpBadges) {
    const unverifiedFunctional = ihrpBadges.functional.filter(s => !verifiedSkills.includes(s));
    const unverifiedBehavioural = ihrpBadges.behavioural.filter(s => !verifiedSkills.includes(s));
    const unverifiedCerts = ihrpBadges.certifications.filter(e => !verifiedSkills.includes(e));
    const funcItems = unverifiedFunctional.slice(0, 3);
    const behavItems = unverifiedBehavioural.slice(0, 2);
    const certItems = unverifiedCerts.slice(0, Math.max(1, 6 - funcItems.length - behavItems.length));
    if (funcItems.length > 0) grouped.push(["IHRP Functional Competency", funcItems, "bg-blue-400"]);
    if (behavItems.length > 0) grouped.push(["IHRP Mindsets & Behaviours", behavItems, "bg-violet-400"]);
    if (certItems.length > 0) grouped.push(["IHRP Certification", certItems, "bg-orange-400"]);
  } else {
    const recommended = getDefaultSkillsForRole(designation, dept, grade);
    const regulatoryExams = getRegulatorExamsForRole(designation, dept);
    const unverifiedSkills = recommended.filter(skill => !verifiedSkills.includes(skill));
    const unverifiedExams = regulatoryExams.filter(e => !verifiedSkills.includes(e));
    const tscSkills = unverifiedSkills.filter(s => classifySkill(s) === "Technical Skills & Competencies").slice(0, 3);
    const ccsSkills = unverifiedSkills.filter(s => classifySkill(s) === "Critical Core Skills").slice(0, 2);
    const examItems = unverifiedExams.slice(0, Math.max(1, 6 - tscSkills.length - ccsSkills.length));
    if (tscSkills.length > 0) grouped.push(["Technical Skills & Competencies", tscSkills, "bg-blue-400"]);
    if (ccsSkills.length > 0) grouped.push(["Critical Core Skills", ccsSkills, "bg-violet-400"]);
    if (examItems.length > 0) grouped.push(["Regulatory Examinations", examItems, "bg-orange-400"]);
  }

  // Marking complete requires a supporting certificate, same as a development goal's completion —
  // opens the shared upload modal instead of submitting directly.
  const [attachModalSkill, setAttachModalSkill] = useState<string | null>(null);
  const handleCertificateUpload = (attachment: SkillAttachment) => {
    if (!attachModalSkill) return;
    void addPendingSkill(attachModalSkill, attachment);
    toast.success(`"${attachModalSkill}" submitted for approval · your manager will be notified`);
    setAttachModalSkill(null);
  };

  // "Add as a new development goal" — creates the goal immediately without a due date, flags it for
  // the highlighted due-date prompt on My Goals. Points are only earned for a user's very first
  // development goal — every subsequent one is unpaid (points instead come from getting the
  // resulting skill approved onto the verified profile).
  const handleAddAsGoal = (skill: string) => {
    if (currentDevGoals.length >= ROADMAP_DEV_GOAL_MAX) {
      toast.error(`Maximum ${ROADMAP_DEV_GOAL_MAX} development goals reached`);
      return;
    }
    const isFirstDevGoal = currentDevGoals.length === 0;
    const id = `dg${Date.now()}`;
    upsertDevGoal({
      id, title: skill,
      description: "Recommended for your role — added from your Development Roadmap.",
      dueDate: "", completed: false,
    });
    flagGoalPendingDueDate(devGoalMemberId, id);
    if (isFirstDevGoal) awardMemberPoints(devGoalMemberId, 10);
    const msg = `"${skill}" added${isFirstDevGoal ? " · +10 pts" : ""} — check out your refreshed development goals list on My Goals.`;
    if (isFirstDevGoal) pointsToast(msg); else toast.success(msg);
  };

  const totalItems = grouped.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div className="space-y-4">
      {totalItems === 0 ? (
        <p className="text-sm text-muted-foreground">All recommended skills have been verified. Check your Skills Profile.</p>
      ) : (
        grouped.map(([cat, skillList, dotColor]) => (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{cat}</div>
            </div>
            <div className="space-y-2 pl-3 border-l border-border/60">
              {skillList.map(skill => {
                // Mutually exclusive: only one path — direct submission or a linked development
                // goal — can be active for a given recommendation at any one time.
                const isPending = pendingSkills.includes(skill);
                const alreadyGoal = currentDevGoals.some(g => g.title === skill);
                const completeDisabled = isPending || alreadyGoal;
                const addGoalDisabled = alreadyGoal || isPending;
                const completeTooltip = isPending
                  ? "Pending manager approval"
                  : alreadyGoal
                  ? "Complete the linked development goal on My Goals to submit this"
                  : "Mark as complete — submit for manager approval to update your skills profile";
                const addGoalTooltip = alreadyGoal
                  ? "Already a development goal"
                  : isPending
                  ? "Already submitted for manager approval"
                  : "Add as a new development goal";
                return (
                  <div key={skill} className="flex items-center gap-2">
                    <TooltipProvider delayDuration={150}>
                      {/* Icon-only, permanently colour-tinted so each action reads at a glance
                          without needing a visible text label (keeps the row compact). */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setAttachModalSkill(skill)}
                            disabled={completeDisabled}
                            className={cn(
                              "size-6 rounded-full border grid place-items-center shrink-0 transition-colors disabled:cursor-default",
                              isPending
                                ? "text-amber-foreground bg-amber/15 border-amber/35"
                                : alreadyGoal
                                ? "text-muted-foreground/40 bg-muted/40 border-border/60"
                                : "text-rag-green bg-rag-green/10 border-rag-green/30 hover:bg-rag-green/20 cursor-pointer",
                            )}
                          >
                            {isPending ? <Clock className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{completeTooltip}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleAddAsGoal(skill)}
                            disabled={addGoalDisabled}
                            className={cn(
                              "size-6 rounded-full border grid place-items-center shrink-0 transition-colors disabled:cursor-default",
                              addGoalDisabled
                                ? "text-muted-foreground/40 bg-muted/40 border-border/60"
                                : "text-teal bg-teal/10 border-teal/30 hover:bg-teal/20 cursor-pointer",
                            )}
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{addGoalTooltip}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className={cn("text-sm flex-1", isPending && "text-amber-foreground/80")}>
                      {skill}
                    </span>
                    {isPending && (
                      <span className="text-[10px] text-amber-foreground/60 shrink-0">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      <div className="pt-1 space-y-1.5 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Showing up to 6 recommended skills &amp; certifications for your role, excluding verified skills.
        </p>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Mark as complete to submit for manager approval, or add as a development goal to work toward it first.
        </p>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          <a
            href={roadmapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            {isHCWM
              ? "Click here to view IHRP Skills Badges for Human Capital Professionals"
              : `Click here to view the full SSG Skills Framework for ${roadmapTrack}`
            }
          </a>
        </p>
      </div>
      {attachModalSkill && (
        <SkillAttachmentModal
          skillName={attachModalSkill}
          onSubmit={handleCertificateUpload}
          onClose={() => setAttachModalSkill(null)}
        />
      )}
    </div>
  );
}
