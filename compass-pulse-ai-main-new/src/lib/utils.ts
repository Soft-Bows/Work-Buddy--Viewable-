import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Activity, DeptGoal, KeyResult, RAG } from "./mockData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The single, canonical "Job Grade" display for a user's numeric grade (1–6, from users.csv's
// `grade` column). Deliberately just "Grade N" — this used to be two separately-hand-maintained
// functions (in csvData.server.ts and SkillsSection.tsx) that each invented a fictitious
// PhillipCapital-style title band (e.g. "Assistant Vice President") from the number. Real
// designations in users.csv never use AVP/VP titles at all (they run Officer/Executive/Senior
// Executive → Assistant Manager/Manager/Senior Manager → Head/Director), and the two functions
// disagreed with each other on where each band started — so the same grade 3 "Executive" could
// read as "Assistant Manager 3" on one page and "Assistant Vice President 3" on another, neither
// of which is a real title. Showing the raw grade next to the real `designation` (already shown
// alongside it everywhere this is used) is the only representation that can never drift from
// users.csv, since there's no separate band mapping left to fall out of sync.
export function formatJobGrade(grade: number): string {
  return `Grade ${grade}`;
}

// Counts weekdays (Mon–Fri) elapsed between an ISO date string and today — used for 7-working-day
// response SLAs (goal approvals, recommended development goals, etc.)
export function workingDaysSince(dateStr?: string): number {
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

// Due date for updating quarterly goal RAG status: the last working day (Friday) of the first
// full week after the current quarter ends. Mirrored (as a fixed-day approximation, since
// Activity.timelineDays can't encode a variable-length date rule) by the "Update goal RAG status"
// entry in the admin Activity Management catalog — keep both in sync if this rule ever changes.
export function getGoalStatusDueDate(reference: Date = new Date()): Date {
  const y = reference.getFullYear();
  const m = reference.getMonth();
  const qEndMonth = m <= 2 ? 2 : m <= 5 ? 5 : m <= 8 ? 8 : 11; // Mar/Jun/Sep/Dec, 0-indexed
  const quarterEnd = new Date(y, qEndMonth + 1, 0); // last calendar day of the quarter-end month
  const d = new Date(quarterEnd);
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1); // roll forward to the next Monday
  d.setDate(d.getDate() + 4); // Friday of that week
  return d;
}

export function formatGoalStatusDueDate(reference: Date = new Date()): string {
  return getGoalStatusDueDate(reference).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

// Last calendar day of the current quarter (Mar 31 / Jun 30 / Sep 30 / Dec 31) — distinct from
// getGoalStatusDueDate above, which is the *scoring grace-period* deadline a few working days
// after the quarter actually ends.
export function getCurrentQuarterEndDate(reference: Date = new Date()): Date {
  const m = reference.getMonth();
  const qEndMonth = m <= 2 ? 2 : m <= 5 ? 5 : m <= 8 ? 8 : 11; // Mar/Jun/Sep/Dec, 0-indexed
  return new Date(reference.getFullYear(), qEndMonth + 1, 0);
}

// A Key Result's real quarterly-scoring deadline. Normally that's the standard grace-period date
// (getGoalStatusDueDate) — but if the KR's own due date falls on or before the current quarter's
// end, that earlier due date is the actual deadline: an owner whose Key Result was due mid-quarter
// doesn't get to wait for the generic end-of-quarter grace period before the score penalty can
// apply. Longer-running Key Results (due date after this quarter ends) are unaffected.
export function effectiveKrScoreDueDate(kr: { dueDate?: string }, reference: Date = new Date()): Date {
  const standard = getGoalStatusDueDate(reference);
  if (!kr.dueDate) return standard;
  const quarterEndIso = getCurrentQuarterEndDate(reference).toISOString().slice(0, 10);
  if (kr.dueDate > quarterEndIso) return standard;
  const due = new Date(`${kr.dueDate}T00:00:00`);
  return due < standard ? due : standard;
}

export function formatEffectiveKrScoreDueDate(kr: { dueDate?: string }, reference: Date = new Date()): string {
  return effectiveKrScoreDueDate(kr, reference).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

// A Key Result is overdue for scoring once today is past its effective deadline and it still has
// no score — the single source of truth for both the penalty sweep (appContext.tsx) and the
// "overdue" highlight shown to the owner, HOD, and every other team member on the Team OKRs page.
export function isKrOverdue(kr: { dueDate?: string; score?: number }, reference: Date = new Date()): boolean {
  if (kr.score !== undefined) return false;
  const todayIso = reference.toISOString().slice(0, 10);
  const dueIso = effectiveKrScoreDueDate(kr, reference).toISOString().slice(0, 10);
  return todayIso > dueIso;
}

// First working day (Mon–Fri) of the current quarter — used to reset per-quarter quotas (e.g.
// reward redemption limits). Rolls Jan/Apr/Jul/Oct 1 forward to the next weekday if it lands on a
// weekend.
export function getCurrentQuarterStart(reference: Date = new Date()): Date {
  const y = reference.getFullYear();
  const m = reference.getMonth();
  const qStartMonth = m <= 2 ? 0 : m <= 5 ? 3 : m <= 8 ? 6 : 9; // Jan/Apr/Jul/Oct, 0-indexed
  const d = new Date(y, qStartMonth, 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

// A "Starting from when?" trigger is free text — nothing in this dashboard actually parses and
// executes it (the real SLA sweep in appContext.tsx is hardcoded per real flow: daysSinceJoin for
// join-date rules, workingDaysSince against specific stored dates like recommendedDate/
// submittedDate/proposedDate/notifiedDate). This registry only covers the trigger *concepts* that
// really are wired to one of those, so recognizeTrigger can tell an admin whether their trigger text
// maps to something the dashboard can actually act on, versus free-standing descriptive text.
export const KNOWN_TRIGGER_PATTERNS: { keywords: string[]; resolvesTo: string }[] = [
  { keywords: ["joining the company", "join date", "date joined", "joining"], resolvesTo: "each user's join_date in users.csv (via daysSinceJoin)" },
  { keywords: ["recommend"], resolvesTo: "the recommendedDate stamped when a HOD or supervisor recommends a goal" },
  { keywords: ["submit"], resolvesTo: "the submittedDate stamped when a goal or skill is submitted for approval" },
  { keywords: ["propos"], resolvesTo: "the proposedDate stamped when a goal-edit proposal is created" },
  { keywords: ["remark", "notif"], resolvesTo: "the notifiedDate stamped when a pending remark or skill endorsement is raised" },
  { keywords: ["quarter"], resolvesTo: "the fixed quarter-end/quarter-start calendar rule (getGoalStatusDueDate / getCurrentQuarterStart)" },
];

export function recognizeTrigger(text?: string): string | null {
  if (!text?.trim()) return null;
  const lower = text.toLowerCase();
  const match = KNOWN_TRIGGER_PATTERNS.find(p => p.keywords.some(k => lower.includes(k)));
  return match ? match.resolvesTo : null;
}

// True once a member is more than 7 *working* days past their 30-calendar-day join anniversary —
// the deadline for the "leave supervisor penalized if a report hasn't set 3 performance goals"
// rule. Kept separate from the 30-day window itself (daysSinceJoin, below) since this is a second,
// working-day-counted grace period layered on top of it.
export function newJoinerGoalDeadlinePassed(joinDate?: string): boolean {
  if (!joinDate) return false;
  const day30 = new Date(joinDate);
  day30.setDate(day30.getDate() + 30);
  return workingDaysSince(day30.toISOString().slice(0, 10)) >= 7;
}

// Calendar days elapsed since a user's join date — used for the 30-day goal-setting window.
export function daysSinceJoin(joinDate?: string): number {
  if (!joinDate) return Infinity;
  const start = new Date(joinDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Strips a leading zero that's immediately followed by another digit (e.g. "05" -> "5", "-05" -> "-5")
// so numeric inputs across the dashboard never let a user leave a 0 as the first digit of a longer
// number. A lone "0" (or "0." for decimals) is left untouched since those are valid values on their own.
export function stripLeadingZero(value: string): string {
  return value.replace(/^(-?)0+(?=\d)/, "$1");
}

// Quarterly (and confidence-average) scores are only ever set to 1 decimal place — this truncates a
// free-typed value to at most 1 digit after the decimal point as the user types, so a 2nd decimal
// digit is simply dropped rather than accepted and rounded away later.
export function clampScoreDecimal(value: string): string {
  const m = value.match(/^-?\d*\.?\d?/);
  return m ? m[0] : "";
}

// Safety-net rounding applied right before a score is written — guards against floating-point drift
// from a number input's native step arrows (repeated +0.1 clicks can land on
// 0.30000000000000004) so every stored score is a clean 1-decimal value.
export function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

// Flattens every Objective (department + team level) and their Key Results into one linkable
// option list — used wherever an admin/HOD needs to pick a link target (e.g. a team-level
// Objective's `linkedTo`). KRs are indented under their parent Objective's title so the level is
// visually clear in a plain <select>.
export function flattenOkrOptions(deptGoals: DeptGoal[]): { id: string; label: string }[] {
  const opts: { id: string; label: string }[] = [];
  for (const g of deptGoals) {
    const levelTag = g.level === "team" && g.teamName ? ` (${g.teamName}'s OKRs)` : "";
    opts.push({ id: g.id, label: `${g.title}${levelTag}` });
    for (const k of g.keyResults ?? []) {
      opts.push({ id: k.id, label: `↳ ${k.title}` });
    }
  }
  return opts;
}

// Both DeptGoal.owner and KeyResult.owner store one-or-more names as a single comma-separated
// string (e.g. "Anabelle Tan, Bryan Goh") — an Objective/KR can have more than one owner, including
// people from other departments (see OwnerSelect/MultiOwnerSelect's org-wide search). These two
// helpers are the one place that convention is parsed/checked, so every "is this person an owner"
// question in the app agrees with every other one.
export function ownerNames(ownerField: string): string[] {
  return ownerField ? ownerField.split(",").map(s => s.trim()).filter(Boolean) : [];
}
export function isAmongOwners(ownerField: string, name: string): boolean {
  return ownerNames(ownerField).includes(name);
}

// Owner names still owing an acknowledgement on a given Objective/Key Result — replaces the old
// single `pendingAcknowledgement` boolean so appointing one new co-owner never re-flags everyone.
export function isPendingAckFor(item: { pendingAcknowledgementFor?: string[] }, name: string): boolean {
  return !!item.pendingAcknowledgementFor?.includes(name);
}
export function hasPendingAck(item: { pendingAcknowledgementFor?: string[] }): boolean {
  return !!item.pendingAcknowledgementFor && item.pendingAcknowledgementFor.length > 0;
}

// Every Key Result (department- or team-level, across both HCWM's departmentGoals and Credit Risk
// Management's opsDepartmentGoals) owned by a given member, by name. This is the single source of
// truth for "this member's performance goals" everywhere — My Goals, Team OKRs' member drawer, the
// new-joiner/"without goals" 3-goal rules — replacing the old individually-created Goal objects.
export function keyResultsOwnedBy(
  memberName: string,
  ...deptGoalLists: DeptGoal[][]
): { objective: DeptGoal; kr: KeyResult }[] {
  return deptGoalLists
    .flat()
    .flatMap(objective => (objective.keyResults ?? [])
      .filter(kr => isAmongOwners(kr.owner, memberName))
      .map(kr => ({ objective, kr })));
}

// Every Objective (department- or team-level) a given member owns, by name — the Objective-level
// counterpart to keyResultsOwnedBy above, used to surface Objective ownership (not just Key Result
// ownership) on My Goals.
export function objectivesOwnedBy(memberName: string, ...deptGoalLists: DeptGoal[][]): DeptGoal[] {
  return deptGoalLists.flat().filter(g => isAmongOwners(g.owner, memberName));
}

// An Objective's overall score — a plain (unweighted) average of its Key Results' scores, computed
// only once every KR has been scored (undefined until then). Weighting was deliberately removed
// from the OKR model — see mockData.ts's KeyResult/DeptGoal comments.
export function objectiveScore(o: DeptGoal): number | undefined {
  const krs = o.keyResults ?? [];
  if (krs.length === 0 || krs.some(k => k.score === undefined)) return undefined;
  return krs.reduce((sum, k) => sum + k.score!, 0) / krs.length;
}

// An Objective's displayed monthly confidence — an equal (unweighted) average of its Key Results'
// ragConfidence, computed real-time on every render straight from the live Key Result data (same
// "no weighting" principle as objectiveScore above, just applied to the RAG band rather than the
// numeric score). Each RAG band is mapped to its band midpoint for averaging purposes, then bucketed
// back using the same red < 0.4 / amber 0.4–0.6 / green 0.7–1.0 thresholds shown in the RAG Guide.
const RAG_MIDPOINT: Record<RAG, number> = { red: 0.2, amber: 0.5, green: 0.85 };
export function objectiveConfidence(o: DeptGoal): RAG {
  const confidences = (o.keyResults ?? []).map(k => k.ragConfidence);
  if (confidences.length === 0) return "green";
  const avg = confidences.reduce((sum, c) => sum + RAG_MIDPOINT[c], 0) / confidences.length;
  if (avg < 0.4) return "red";
  if (avg < 0.7) return "amber";
  return "green";
}

// The raw numeric average behind objectiveConfidence() above — surfaced alongside the RAG bucket
// (e.g. inside the confidence pill as "GREEN · 0.82") so it's clear how the overall band was derived
// from the underlying Key Results, not just the bucketed result on its own.
export function objectiveConfidenceValue(o: DeptGoal): number | undefined {
  const confidences = (o.keyResults ?? []).map(k => k.ragConfidence);
  if (confidences.length === 0) return undefined;
  return confidences.reduce((sum, c) => sum + RAG_MIDPOINT[c], 0) / confidences.length;
}

// Buckets a raw 0.0–1.0 score (Objective- or Key-Result-level) into the same red/amber/green bands
// as RAG confidence, purely for display — lets a quarterly score be shown inside a coloured pill
// (like confidence already is) instead of as bare, uncontextualised text.
export function scoreToRag(score: number): RAG {
  if (score < 0.4) return "red";
  if (score < 0.7) return "amber";
  return "green";
}

// Last working day (Mon–Fri) of the current calendar month — the monthly RAG-confidence deadline.
export function getMonthlyConfidenceDueDate(reference: Date = new Date()): Date {
  const d = new Date(reference.getFullYear(), reference.getMonth() + 1, 0); // last calendar day
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

export function formatMonthlyConfidenceDueDate(reference: Date = new Date()): string {
  return getMonthlyConfidenceDueDate(reference).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

// Last working day (Mon–Fri) of January for a given year — the deadline for the HOD SLA requiring
// at least 3 department-level Objectives, each with at least 3 Key Results.
export function getJanuaryDeadline(year: number): Date {
  const d = new Date(year, 0, 31); // last calendar day of January
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

export function formatJanuaryDeadline(year: number): string {
  return getJanuaryDeadline(year).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

// "Pilot tests" an activity's timeline configuration before it's allowed to go live — a compulsory
// activity missing any of timelineDays/timelineTrigger/penaltyPoints can never be correctly enforced
// (the SLA sweep in appContext.tsx has nothing to schedule against), and a lone timelineDays or
// timelineTrigger without its pair can't compute a due date either. Returns an empty array when the
// configuration is coherent. Shared by the manual Activity form and the Excel/CSV import pipeline so
// both paths enforce identically — this is the "error pushing it live" prompt the admin must resolve.
export function pilotTestActivity(a: Partial<Activity>): string[] {
  const errors: string[] = [];
  if (a.isCompulsory) {
    if (!a.timelineDays) errors.push("Compulsory activities need a completion timeline (days).");
    if (!a.timelineTrigger?.trim()) errors.push("Compulsory activities need a \"Starting from when?\" trigger — the dashboard can't schedule a deadline without it.");
    if (a.penaltyPoints == null || a.penaltyPoints <= 0) errors.push("Compulsory activities need a penalty point value greater than 0.");
  } else {
    if (a.timelineDays && !a.timelineTrigger?.trim()) errors.push("A completion timeline needs a matching \"Starting from when?\" trigger describing what starts the clock.");
    if (a.timelineTrigger?.trim() && !a.timelineDays) errors.push("A \"Starting from when?\" trigger needs a matching completion-timeline day count, or the dashboard can't compute a due date.");
  }
  return errors;
}
