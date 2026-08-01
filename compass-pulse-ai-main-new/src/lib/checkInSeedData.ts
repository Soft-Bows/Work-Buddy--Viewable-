// Seed data for the 4 new engagement features (check-ins, Team Pulse, Manager Effectiveness, AI
// Activity Log) — populated on top of Sarah Chen's (HCWM) and Nadia Yong's (Credit Risk) real,
// already-wired teams so both are visible without the user having to generate everything by hand
// first. All in-memory only, same as deptGoalSkills — resets on reload, never CSV-persisted.
import type { CheckIn } from "./checkIns";
import type { PulseResponse } from "./pulseSurvey";
import type { ManagerEffectivenessRating } from "./managerEffectiveness";
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

// "This month," computed at load time rather than hardcoded — a literal "2026-07" here silently
// stops being "this month" the moment the calendar rolls over, which is exactly what happened once
// this demo kept running past July: every seeded response quietly aged into "last month" and the
// widget fell back to its empty "not enough responses yet" state despite the data still being
// right there. Computing it fresh means the seed data is always "current" whenever this is viewed.
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

// Current month's pulse — 4 HCWM + 3 Credit Risk responses, both above the 3-response anonymity
// threshold so both teams' aggregates are visible without the user submitting anything first.
export const seedPulseResponses: PulseResponse[] = [
  { id: "pr-seed-1", respondentName: "Belle Lim", department: "Human Capital & Workplace Management", month: CURRENT_MONTH, ratings: { workload: 3, clarity: 4, support: 4, growth: 4 } },
  { id: "pr-seed-2", respondentName: "Rhea Yee", department: "Human Capital & Workplace Management", month: CURRENT_MONTH, ratings: { workload: 3, clarity: 4, support: 5, growth: 3 } },
  { id: "pr-seed-3", respondentName: "Bryan Goh", department: "Human Capital & Workplace Management", month: CURRENT_MONTH, ratings: { workload: 2, clarity: 3, support: 4, growth: 3 } },
  { id: "pr-seed-4", respondentName: "Anabelle Tan", department: "Human Capital & Workplace Management", month: CURRENT_MONTH, ratings: { workload: 2, clarity: 4, support: 4, growth: 4 } },
  { id: "pr-seed-5", respondentName: "Diana Chang", department: "Credit Risk Management (F.K.A. Credit Admin)", month: CURRENT_MONTH, ratings: { workload: 3, clarity: 4, support: 4, growth: 3 } },
  { id: "pr-seed-6", respondentName: "Elton Phua", department: "Credit Risk Management (F.K.A. Credit Admin)", month: CURRENT_MONTH, ratings: { workload: 3, clarity: 4, support: 5, growth: 4 } },
  { id: "pr-seed-7", respondentName: "Bella Lim", department: "Credit Risk Management (F.K.A. Credit Admin)", month: CURRENT_MONTH, ratings: { workload: 4, clarity: 4, support: 4, growth: 3 } },
  { id: "pr-seed-8", respondentName: "Michelle Sylvia", department: "Marketing Communications", month: CURRENT_MONTH, ratings: { workload: 3, clarity: 4, support: 4, growth: 4 } },
  { id: "pr-seed-9", respondentName: "Rave Tan", department: "Marketing Communications", month: CURRENT_MONTH, ratings: { workload: 3, clarity: 3, support: 4, growth: 3 } },
  { id: "pr-seed-10", respondentName: "Christabel Lin", department: "Marketing Communications", month: CURRENT_MONTH, ratings: { workload: 4, clarity: 3, support: 5, growth: 5 } },
];

export const seedManagerRatings: ManagerEffectivenessRating[] = [
  { id: "mr-seed-1", managerName: "Sarah Chen", raterName: "Anabelle Tan", month: CURRENT_MONTH, ratings: { coach: 5, empower: 4, wellbeing: 5, communicate: 4, career: 4, vision: 5 } },
  { id: "mr-seed-2", managerName: "Sarah Chen", raterName: "Bryan Goh", month: CURRENT_MONTH, ratings: { coach: 4, empower: 4, wellbeing: 4, communicate: 5, career: 3, vision: 4 } },
  { id: "mr-seed-3", managerName: "Sarah Chen", raterName: "Marcus Teo", month: CURRENT_MONTH, ratings: { coach: 4, empower: 5, wellbeing: 4, communicate: 4, career: 4, vision: 4 } },
  { id: "mr-seed-4", managerName: "Nadia Yong", raterName: "Victor Lai", month: CURRENT_MONTH, ratings: { coach: 4, empower: 3, wellbeing: 4, communicate: 4, career: 3, vision: 4 } },
  { id: "mr-seed-5", managerName: "Nadia Yong", raterName: "Diana Chang", month: CURRENT_MONTH, ratings: { coach: 3, empower: 3, wellbeing: 4, communicate: 3, career: 3, vision: 4 } },
  { id: "mr-seed-6", managerName: "Nadia Yong", raterName: "Elton Phua", month: CURRENT_MONTH, ratings: { coach: 4, empower: 4, wellbeing: 4, communicate: 4, career: 4, vision: 3 } },
  { id: "mr-seed-7", managerName: "Michelle Sylvia", raterName: "Rave Tan", month: CURRENT_MONTH, ratings: { coach: 4, empower: 4, wellbeing: 4, communicate: 4, career: 3, vision: 4 } },
  { id: "mr-seed-8", managerName: "Michelle Sylvia", raterName: "Christabel Lin", month: CURRENT_MONTH, ratings: { coach: 5, empower: 4, wellbeing: 5, communicate: 5, career: 4, vision: 4 } },
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
