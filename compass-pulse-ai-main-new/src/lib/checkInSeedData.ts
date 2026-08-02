// Seed data for the 4 new engagement features (check-ins, Team Pulse, Manager Effectiveness, AI
// Activity Log) — populated on top of Sarah Chen's (HCWM) and Nadia Yong's (Credit Risk) real,
// already-wired teams so both are visible without the user having to generate everything by hand
// first. All in-memory only, same as deptGoalSkills — resets on reload, never CSV-persisted.
import type { CheckIn } from "./checkIns";
import { currentQuarterLabel, type PulseResponse } from "./pulseSurvey";
import { MANAGER_BEHAVIORS, type ManagerEffectivenessRating } from "./managerEffectiveness";
import type { AiActivityLogEntry } from "./aiActivity";

export const seedCheckIns: CheckIn[] = [
  {
    id: "ci-seed-1",
    managerName: "Sarah Chen", memberName: "Anabelle Tan", date: "2026-07-08",
    talkingPoints: [
      `"Certify 75% of the HC team on agentic-AI governance, data ethics, and prompt literacy for HR use cases" is currently AMBER — ask what's needed to get it back on track.`,
      `"Deliver the AI-Fluency Curriculum for People Managers" — check in on rollout pace ahead of the Q4 push.`,
    ],
    notes: "Enrolment for the AI fluency curriculum is behind — desk heads are slow to release training slots during quarter-end. Agreed to escalate via Sarah directly to unblock two of the busier desks.",
    actionItems: [
      { id: "ci1-a1", text: "Sarah to email desk heads directly about protected training slots", done: true },
      { id: "ci1-a2", text: "Anabelle to re-forecast completion date and share by end of month", done: false },
    ],
    aiMinutes: "Check-in with Anabelle Tan. Covered 2 topics from the prep brief, including it: \"Certify 75% of the HC team on agentic-AI governance...\" and 1 more. Notes: Enrolment for the AI fluency curriculum is behind — desk heads are slow to release training slots during quarter-end. Agreed to escalate via Sarah directly to unblock two of the busier desks. 2 action items agreed: Sarah to email desk heads directly about protected training slots; Anabelle to re-forecast completion date and share by end of month. Next check-in recommended within 30 days.",
  },
  {
    id: "ci-seed-2",
    managerName: "Sarah Chen", memberName: "Bryan Goh", date: "2026-07-15",
    talkingPoints: [
      `"Build a succession-ready bench for 100% of Grade 5+ "single point of failure" brokerage and dealing roles" is currently AMBER — ask what's needed to get it back on track.`,
      "No open risks or overdue items right now — a good check-in for workload, priorities, and career development.",
    ],
    notes: "Succession bench work is progressing but slower than hoped — Bryan flagged that identifying true single-points-of-failure needs input from desk heads he doesn't have a direct line to yet.",
    actionItems: [
      { id: "ci2-a1", text: "Sarah to introduce Bryan to the 2 desk heads he needs", done: true },
    ],
    aiMinutes: "Check-in with Bryan Goh. Covered 2 topics from the prep brief, including it: \"Build a succession-ready bench for 100% of Grade 5+...\" and 1 more. Notes: Succession bench work is progressing but slower than hoped — Bryan flagged that identifying true single-points-of-failure needs input from desk heads he doesn't have a direct line to yet. 1 action item agreed: Sarah to introduce Bryan to the 2 desk heads he needs. Next check-in recommended within 30 days.",
  },
  {
    id: "ci-seed-3",
    managerName: "Nadia Yong", memberName: "Victor Lai", date: "2026-07-10",
    talkingPoints: [
      `"Cut average credit approval turnaround time by 30% via workflow automation" is currently AMBER — ask what's needed to get it back on track.`,
      `Celebrate: "Hold average credit approval turnaround time under 3 working days for standard applications" scored 0.9 — worth calling out.`,
    ],
    notes: "Turnaround automation is stuck on an IT prioritisation queue — Victor's already escalated once. Standard-application turnaround is genuinely excellent this quarter, worth recognising publicly.",
    actionItems: [
      { id: "ci3-a1", text: "Nadia to raise automation ticket priority with IT lead directly", done: false },
      { id: "ci3-a2", text: "Nominate Victor's team for a shoutout in next town hall", done: true },
    ],
    aiMinutes: "Check-in with Victor Lai. Covered 2 topics from the prep brief, including it: \"Cut average credit approval turnaround time by 30%...\" and 1 more. Notes: Turnaround automation is stuck on an IT prioritisation queue — Victor's already escalated once. Standard-application turnaround is genuinely excellent this quarter, worth recognising publicly. 2 action items agreed: Nadia to raise automation ticket priority with IT lead directly; Nominate Victor's team for a shoutout in next town hall. Next check-in recommended within 30 days.",
  },
];

// "This quarter," computed at load time rather than hardcoded — a literal "2026-Q3" here silently
// stops being "this quarter" once the calendar rolls over, which is exactly what happened once this
// demo kept running past July with a hardcoded month: every seeded response quietly aged out and
// the widget fell back to its empty "not enough responses yet" state despite the data still being
// right there. Computing it fresh means the seed data is always "current" whenever this is viewed.
const CURRENT_QUARTER = currentQuarterLabel();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// Current quarter's pulse — 4 HCWM + 3 Credit Risk + 3 Marketing responses, all above the
// 3-response anonymity threshold so every team's aggregate is visible without the user submitting
// anything first. Submitted a few weeks back (not "just now") so the New Insights badge reads as
// already-settled rather than perpetually fresh in the demo.
export const seedPulseResponses: PulseResponse[] = [
  { id: "pr-seed-1", respondentName: "Belle Lim", department: "Human Capital & Workplace Management", quarter: CURRENT_QUARTER, submittedAt: daysAgo(25), ratings: { workload: 3, clarity: 4, support: 4, growth: 4 } },
  { id: "pr-seed-2", respondentName: "Rhea Yee", department: "Human Capital & Workplace Management", quarter: CURRENT_QUARTER, submittedAt: daysAgo(24), ratings: { workload: 3, clarity: 4, support: 5, growth: 3 } },
  { id: "pr-seed-3", respondentName: "Bryan Goh", department: "Human Capital & Workplace Management", quarter: CURRENT_QUARTER, submittedAt: daysAgo(23), ratings: { workload: 2, clarity: 3, support: 4, growth: 3 } },
  { id: "pr-seed-4", respondentName: "Anabelle Tan", department: "Human Capital & Workplace Management", quarter: CURRENT_QUARTER, submittedAt: daysAgo(22), ratings: { workload: 2, clarity: 4, support: 4, growth: 4 } },
  { id: "pr-seed-5", respondentName: "Diana Chang", department: "Credit Risk Management (F.K.A. Credit Admin)", quarter: CURRENT_QUARTER, submittedAt: daysAgo(21), ratings: { workload: 3, clarity: 4, support: 4, growth: 3 } },
  { id: "pr-seed-6", respondentName: "Elton Phua", department: "Credit Risk Management (F.K.A. Credit Admin)", quarter: CURRENT_QUARTER, submittedAt: daysAgo(20), ratings: { workload: 3, clarity: 4, support: 5, growth: 4 } },
  { id: "pr-seed-7", respondentName: "Bella Lim", department: "Credit Risk Management (F.K.A. Credit Admin)", quarter: CURRENT_QUARTER, submittedAt: daysAgo(19), ratings: { workload: 4, clarity: 4, support: 4, growth: 3 } },
  { id: "pr-seed-8", respondentName: "Michelle Sylvia", department: "Marketing Communications", quarter: CURRENT_QUARTER, submittedAt: daysAgo(18), ratings: { workload: 3, clarity: 4, support: 4, growth: 4 } },
  { id: "pr-seed-9", respondentName: "Rave Tan", department: "Marketing Communications", quarter: CURRENT_QUARTER, submittedAt: daysAgo(17), ratings: { workload: 3, clarity: 3, support: 4, growth: 3 } },
  { id: "pr-seed-10", respondentName: "Christabel Lin", department: "Marketing Communications", quarter: CURRENT_QUARTER, submittedAt: daysAgo(16), ratings: { workload: 4, clarity: 3, support: 5, growth: 5 } },
];

// The 2026 cycle opens Aug 1 and is live now — every rating below is dated within the open window
// so the demo reflects a real, currently-submittable state rather than a future or past cycle. A
// 2025 cycle is also seeded for Sarah Chen and Nadia Yong (the two department HODs) so their
// year-over-year trend has something real to compare against once the 2026 aggregate exists.
const CYCLE_YEAR = new Date().getFullYear();

// Builds a full 30-item ratings object from a baseline score, with specific items overridden for
// realistic texture (nobody scores flat 4s across every question) — avoids hand-typing all 30
// scores per rater while still producing genuine per-area variance for the radar chart/drill-down.
function fullRatings(base: number, overrides: Record<string, number> = {}): Record<string, number> {
  return Object.fromEntries(MANAGER_BEHAVIORS.map(b => [b.id, overrides[b.id] ?? base]));
}

export const seedManagerRatings: ManagerEffectivenessRating[] = [
  // ── Sarah Chen (HOD, HCWM) — 4 raters this cycle, comfortably above the anonymity threshold.
  // Strong on Ethics/Integrity, a real dip on work-life harmony (b15) and cross-dept alignment (b17)
  // — exactly the kind of below-3.5 signal the AI action plan is meant to surface.
  { id: "mr-2026-1", managerName: "Sarah Chen", raterName: "Anabelle Tan", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-04T09:00:00.000Z`,
    ratings: fullRatings(4, { b15: 2, b17: 3, b26: 5, b27: 5 }),
    textResponses: { t1: "Sarah is excellent at translating strategy into clear team goals — keep involving us early when priorities shift.", t2: "Work-life harmony during quarter-end crunch could be better protected for the team." } },
  { id: "mr-2026-2", managerName: "Sarah Chen", raterName: "Bryan Goh", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-05T09:00:00.000Z`,
    ratings: fullRatings(4, { b15: 3, b17: 3, b9: 5 }) },
  { id: "mr-2026-3", managerName: "Sarah Chen", raterName: "Marcus Teo", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-06T09:00:00.000Z`,
    ratings: fullRatings(4, { b15: 2, b28: 5, b29: 5 }),
    textResponses: { t1: "Very fair and consistent — gives credit where it's due.", t2: "Could delegate more of the cross-department coordination work instead of holding onto it herself." } },
  { id: "mr-2026-4", managerName: "Sarah Chen", raterName: "Caleb Ong", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-07T09:00:00.000Z`,
    ratings: fullRatings(4, { b15: 3, b17: 4 }) },
  { id: "mr-2025-1", managerName: "Sarah Chen", raterName: "Anabelle Tan", cycleYear: CYCLE_YEAR - 1, submittedAt: `${CYCLE_YEAR - 1}-08-05T09:00:00.000Z`, ratings: fullRatings(3, { b15: 2 }) },
  { id: "mr-2025-2", managerName: "Sarah Chen", raterName: "Bryan Goh", cycleYear: CYCLE_YEAR - 1, submittedAt: `${CYCLE_YEAR - 1}-08-06T09:00:00.000Z`, ratings: fullRatings(3, { b17: 2 }) },
  { id: "mr-2025-3", managerName: "Sarah Chen", raterName: "Marcus Teo", cycleYear: CYCLE_YEAR - 1, submittedAt: `${CYCLE_YEAR - 1}-08-07T09:00:00.000Z`, ratings: fullRatings(4, { b15: 2 }) },

  // ── Nadia Yong (HOD, Credit Risk) — 5 raters this cycle.
  { id: "mr-2026-5", managerName: "Nadia Yong", raterName: "Victor Lai", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-04T10:00:00.000Z`,
    ratings: fullRatings(4, { b20: 3, b21: 3 }),
    textResponses: { t1: "Nadia is decisive under pressure and backs her team publicly.", t2: "Workload prioritisation across the team could be clearer during peak periods." } },
  { id: "mr-2026-6", managerName: "Nadia Yong", raterName: "Diana Chang", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-05T10:00:00.000Z`, ratings: fullRatings(4, { b20: 3 }) },
  { id: "mr-2026-7", managerName: "Nadia Yong", raterName: "Elton Phua", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-06T10:00:00.000Z`, ratings: fullRatings(4) },
  { id: "mr-2026-8", managerName: "Nadia Yong", raterName: "Delia Wong", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-07T10:00:00.000Z`, ratings: fullRatings(4, { b21: 3 }) },
  { id: "mr-2026-9", managerName: "Nadia Yong", raterName: "Bella Lim", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-08T10:00:00.000Z`, ratings: fullRatings(4) },
  { id: "mr-2025-4", managerName: "Nadia Yong", raterName: "Victor Lai", cycleYear: CYCLE_YEAR - 1, submittedAt: `${CYCLE_YEAR - 1}-08-04T10:00:00.000Z`, ratings: fullRatings(3, { b20: 2 }) },
  { id: "mr-2025-5", managerName: "Nadia Yong", raterName: "Diana Chang", cycleYear: CYCLE_YEAR - 1, submittedAt: `${CYCLE_YEAR - 1}-08-05T10:00:00.000Z`, ratings: fullRatings(3) },
  { id: "mr-2025-6", managerName: "Nadia Yong", raterName: "Elton Phua", cycleYear: CYCLE_YEAR - 1, submittedAt: `${CYCLE_YEAR - 1}-08-06T10:00:00.000Z`, ratings: fullRatings(4, { b21: 2 }) },

  // ── Caleb Ong (Manager, non-HOD leave supervisor, Workplace Management) — only 2 real direct
  // reports in the live roster, so this genuinely sits below the 3-rater anonymity threshold. Left
  // that way deliberately rather than fabricating a 3rd rater who doesn't exist in the real org
  // chart — this is itself a useful demo of the anonymity gate working as intended for a small team.
  { id: "mr-2026-10", managerName: "Caleb Ong", raterName: "Diana Eng", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-05T11:00:00.000Z`, ratings: fullRatings(4) },
  { id: "mr-2026-11", managerName: "Caleb Ong", raterName: "Ethan Lam", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-06T11:00:00.000Z`, ratings: fullRatings(4, { b6: 3 }) },

  // ── Directors — each real leave supervisor of only 1-2 department HODs, so both sit below
  // threshold too; same honest small-span-of-control demonstration as Caleb Ong above.
  { id: "mr-2026-12", managerName: "Elsa Ling", raterName: "Sarah Chen", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-08T12:00:00.000Z`, ratings: fullRatings(4) },
  { id: "mr-2026-13", managerName: "Elsa Ling", raterName: "Michelle Sylvia", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-09T12:00:00.000Z`, ratings: fullRatings(4, { b3: 3 }) },
  { id: "mr-2026-14", managerName: "Ethan Lim", raterName: "Nadia Yong", cycleYear: CYCLE_YEAR, submittedAt: `${CYCLE_YEAR}-08-08T12:30:00.000Z`, ratings: fullRatings(4) },
];

export const seedAiActivityLog: AiActivityLogEntry[] = [
  { id: "log-seed-1", date: "2026-07-08", kind: "prep_agent", summary: "Prep brief used for Anabelle Tan's check-in", targetName: "Anabelle Tan", actorName: "Sarah Chen" },
  { id: "log-seed-2", date: "2026-07-08", kind: "ai_minutes", summary: "AI minutes generated for Anabelle Tan's check-in", targetName: "Anabelle Tan", actorName: "Sarah Chen" },
  { id: "log-seed-3", date: "2026-07-10", kind: "prep_agent", summary: "Prep brief used for Victor Lai's check-in", targetName: "Victor Lai", actorName: "Nadia Yong" },
  { id: "log-seed-4", date: "2026-07-10", kind: "ai_minutes", summary: "AI minutes generated for Victor Lai's check-in", targetName: "Victor Lai", actorName: "Nadia Yong" },
  { id: "log-seed-5", date: "2026-07-15", kind: "prep_agent", summary: "Prep brief used for Bryan Goh's check-in", targetName: "Bryan Goh", actorName: "Sarah Chen" },
  { id: "log-seed-6", date: "2026-07-15", kind: "ai_minutes", summary: "AI minutes generated for Bryan Goh's check-in", targetName: "Bryan Goh", actorName: "Sarah Chen" },
  { id: "log-seed-7", date: "2026-07-20", kind: "nudge", summary: "Nudged Sarah Chen — no check-in with Marcus Teo in 30+ days", targetName: "Marcus Teo", actorName: "Sarah Chen" },
  { id: "log-seed-8", date: "2026-07-22", kind: "calibration_flag", summary: "Quarterly scores from Nadia Yong trend 0.15 above the Credit Risk team average — worth a calibration check", targetName: "Nadia Yong" },
];
