// Upward feedback on manager behaviours — the full 32-item "Manager Self-Improvement Survey"
// question set, grouped into 6 leadership areas plus a 2-question free-text "General" section.
// Content is a direct, verbatim reuse of the company's own reference survey document — not
// invented — so the theming, item text, and area groupings below all trace back to that source.
export interface ManagerBehavior {
  id: string;
  text: string;
  leadershipArea: string;
}

export const LEADERSHIP_AREAS = [
  "Leadership",
  "Coaching, Mentoring and Development",
  "Communication",
  "Team Engagement and Collaboration",
  "Work Performance",
  "Ethics / Integrity and Trust",
] as const;

export const MANAGER_BEHAVIORS: ManagerBehavior[] = [
  // Leadership
  { id: "b1", text: "Communicates the company strategy clearly and translates it into actionable, aligned team goals", leadershipArea: "Leadership" },
  { id: "b2", text: "Inspires and motivates the team towards achieving goals", leadershipArea: "Leadership" },
  { id: "b3", text: "Encourages team members to adapt to change and drive innovative solutions", leadershipArea: "Leadership" },
  { id: "b4", text: "Is open to changing work requirements and new ways of doing things", leadershipArea: "Leadership" },
  { id: "b5", text: "Delegates tasks, authority and responsibility fairly and appropriately", leadershipArea: "Leadership" },
  // Coaching, Mentoring and Development
  { id: "b6", text: "Encourages and provides opportunities for learning and professional development", leadershipArea: "Coaching, Mentoring and Development" },
  { id: "b7", text: "Sets clear performance goals for team members and provides constructive support to achieve them", leadershipArea: "Coaching, Mentoring and Development" },
  { id: "b8", text: "Gives constructive and timely feedback to team members that can be applied to improve work outputs and/or performance", leadershipArea: "Coaching, Mentoring and Development" },
  // Communication
  { id: "b9", text: "Encourages open communication and is receptive to ideas, opinions and feedback", leadershipArea: "Communication" },
  { id: "b10", text: "Ensures team alignment on goals, roles, and responsibilities through clear communication", leadershipArea: "Communication" },
  { id: "b11", text: "Communicates effectively with team members and cross-functional stakeholders by conveying relevant information in a coherent and timely manner", leadershipArea: "Communication" },
  // Team Engagement and Collaboration
  { id: "b12", text: "Seeks team members' inputs and/or involves them in decision-making processes", leadershipArea: "Team Engagement and Collaboration" },
  { id: "b13", text: "Fosters a sense of ownership and responsibility among team members for achieving shared goals", leadershipArea: "Team Engagement and Collaboration" },
  { id: "b14", text: "Identifies and handles conflict in an appropriate manner", leadershipArea: "Team Engagement and Collaboration" },
  { id: "b15", text: "Cultivates an environment that balances both productivity and work-life harmony", leadershipArea: "Team Engagement and Collaboration" },
  { id: "b16", text: "Recognises team members for their contributions and/or good performance", leadershipArea: "Team Engagement and Collaboration" },
  { id: "b17", text: "Ensures inter-departmental alignment and fosters collaboration to achieve common objectives", leadershipArea: "Team Engagement and Collaboration" },
  // Work Performance
  { id: "b18", text: "Possesses and appropriately applies his/her expertise and skillset", leadershipArea: "Work Performance" },
  { id: "b19", text: "Stays current with the latest trends and applies relevant knowledge to the team's work", leadershipArea: "Work Performance" },
  { id: "b20", text: "Prioritises tasks and manages the team's workload for optimal productivity", leadershipArea: "Work Performance" },
  { id: "b21", text: "Anticipates potential challenges, develops and executes plan(s) to overcome them effectively", leadershipArea: "Work Performance" },
  { id: "b22", text: "Demonstrates good judgment and common sense by making sound decisions in a timely manner", leadershipArea: "Work Performance" },
  { id: "b23", text: "Leads by example in setting and striving to achieve his/her own stretch goals", leadershipArea: "Work Performance" },
  { id: "b24", text: "Motivates the team to push beyond comfort zone while providing the necessary support", leadershipArea: "Work Performance" },
  { id: "b25", text: "Demonstrates strong problem-solving abilities, including addressing root causes of issues", leadershipArea: "Work Performance" },
  // Ethics / Integrity and Trust
  { id: "b26", text: "Demonstrates respect for all individuals, regardless of their position or background", leadershipArea: "Ethics / Integrity and Trust" },
  { id: "b27", text: "Keeps promises and commitments", leadershipArea: "Ethics / Integrity and Trust" },
  { id: "b28", text: "Gives credit to others where due", leadershipArea: "Ethics / Integrity and Trust" },
  { id: "b29", text: "Takes responsibility for his/her own actions, including ownership of related outcomes", leadershipArea: "Ethics / Integrity and Trust" },
  { id: "b30", text: "Keeps control of their emotions and behavior, even when involved in high-pressure situations", leadershipArea: "Ethics / Integrity and Trust" },
];

// The survey's 2 free-text "General" questions — deliberately not part of the 1-5 scale/leadership
// area grouping above, since they're open-ended and aggregated as a list of anonymous comments
// rather than averaged.
export interface ManagerSurveyTextQuestion {
  id: string;
  text: string;
}

export const MANAGER_SURVEY_TEXT_QUESTIONS: ManagerSurveyTextQuestion[] = [
  { id: "t1", text: "What is your supervisor's greatest strength and what can he/she continue to do to grow?" },
  { id: "t2", text: "What is one area of development for your supervisor and what can he/she do to improve in that area?" },
];

export interface ManagerEffectivenessRating {
  id: string;
  managerName: string;
  raterName: string;
  cycleYear: number; // the annual cycle this rating belongs to, e.g. 2026
  submittedAt: string; // ISO timestamp
  ratings: Record<string, number>; // ManagerBehavior id -> 1-5
  textResponses?: Record<string, string>; // ManagerSurveyTextQuestion id -> free text
}

// Same anonymity threshold as the pulse survey — a manager only ever sees an aggregate, never a
// single rater's score, and never at all below this count.
export const MIN_RATERS_FOR_AGGREGATE = 3;

// Annual — this cycle opened Jun 1, 2026 and ran 2 months, closing at the end of July — already
// concluded as of "now," so the full 2026 cycle's insights (and the AI action plan built from them)
// are ready to view immediately rather than waiting for a window that hasn't happened yet.
export function isManagerSurveyWindowOpen(reference: Date = new Date()): boolean {
  const m = reference.getMonth(); // 0-indexed: Jun = 5, Jul = 6
  return m === 5 || m === 6;
}

// True once this year's window has already closed (past July) — distinct from "not yet open"
// (before June), so the UI can say "closed for this year" instead of a misleading "opens soon."
export function hasManagerSurveyWindowClosedThisYear(reference: Date = new Date()): boolean {
  return reference.getMonth() > 6;
}

export function currentManagerSurveyCycleYear(reference: Date = new Date()): number {
  return reference.getFullYear();
}

export function averageManagerScores(ratings: ManagerEffectivenessRating[]): Record<string, number> | null {
  if (ratings.length < MIN_RATERS_FOR_AGGREGATE) return null;
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const r of ratings) {
    for (const [bId, val] of Object.entries(r.ratings)) {
      sums[bId] = (sums[bId] ?? 0) + val;
      counts[bId] = (counts[bId] ?? 0) + 1;
    }
  }
  const avgs: Record<string, number> = {};
  for (const bId of Object.keys(sums)) avgs[bId] = sums[bId] / counts[bId];
  return avgs;
}

// Collapses the 30 individual item averages down to one average per leadership area — a 30-spoke
// radar chart is unreadable, a 6-spoke one (one per LEADERSHIP_AREAS entry) reads at a glance.
export function averageManagerScoresByArea(avgs: Record<string, number> | null): Record<string, number> | null {
  if (!avgs) return null;
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const b of MANAGER_BEHAVIORS) {
    const v = avgs[b.id];
    if (v === undefined) continue;
    sums[b.leadershipArea] = (sums[b.leadershipArea] ?? 0) + v;
    counts[b.leadershipArea] = (counts[b.leadershipArea] ?? 0) + 1;
  }
  const areaAvgs: Record<string, number> = {};
  for (const area of Object.keys(sums)) areaAvgs[area] = sums[area] / counts[area];
  return areaAvgs;
}

// Every free-text answer to a given question, across a set of ratings — anonymous, listed rather
// than aggregated (there's nothing to average about open-ended text).
export function collectTextResponses(ratings: ManagerEffectivenessRating[], questionId: string): string[] {
  return ratings.map(r => r.textResponses?.[questionId]).filter((t): t is string => !!t?.trim());
}

// Nearest-rank percentile — deliberately simple and small-sample-honest: with only 3 data points,
// P75 lands on the highest of the 3. That's an accurate reflection of how few managers in a roster
// this size actually clear the anonymity threshold in any one cycle, not something to paper over
// with a fancier interpolation that would imply a bigger benchmark population than really exists.
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(rank, sorted.length - 1))];
}

// The top-quartile (P75) benchmark for every item and leadership area, computed across every
// manager in the given cycle whose own rater count clears MIN_RATERS_FOR_AGGREGATE — the same
// anonymity gate a single manager's own aggregate uses, applied at the peer-comparison level too,
// so the benchmark itself can never leak a thinly-rated manager's score. Scales automatically as
// more managers/raters are added — never hardcoded to today's qualifying set.
export function peerP75(allRatings: ManagerEffectivenessRating[], cycleYear: number): { itemP75: Record<string, number>; areaP75: Record<string, number> } {
  const byManager = new Map<string, ManagerEffectivenessRating[]>();
  for (const r of allRatings) {
    if (r.cycleYear !== cycleYear) continue;
    if (!byManager.has(r.managerName)) byManager.set(r.managerName, []);
    byManager.get(r.managerName)!.push(r);
  }
  const managerItemAvgs: Record<string, number>[] = [];
  const managerAreaAvgs: Record<string, number>[] = [];
  for (const ratings of byManager.values()) {
    const avgs = averageManagerScores(ratings);
    if (!avgs) continue;
    managerItemAvgs.push(avgs);
    const areaAvgs = averageManagerScoresByArea(avgs);
    if (areaAvgs) managerAreaAvgs.push(areaAvgs);
  }
  const itemP75: Record<string, number> = {};
  for (const b of MANAGER_BEHAVIORS) {
    const vals = managerItemAvgs.map(a => a[b.id]).filter((v): v is number => v !== undefined);
    if (vals.length) itemP75[b.id] = percentile(vals, 75);
  }
  const areaP75: Record<string, number> = {};
  for (const area of LEADERSHIP_AREAS) {
    const vals = managerAreaAvgs.map(a => a[area]).filter((v): v is number => v !== undefined);
    if (vals.length) areaP75[area] = percentile(vals, 75);
  }
  return { itemP75, areaP75 };
}
