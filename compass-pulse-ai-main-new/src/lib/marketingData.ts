// Marketing Communications department mock data — the real, active roster from "Staff Listing 2
// (MGT).pdf" (Michelle Sylvia HOD, Rave Tan, Christabel Lin intern; u305-u307, hand-maintained —
// see scripts/sync-users-from-staff-listing.mjs). Built the same way complianceData.ts was: light
// enough to give the "Director" persona (Elsa Ling, who really is both Sarah Chen's and Michelle
// Sylvia's leave supervisor per the PDF) real, non-empty content to aggregate in Team OKRs' Key
// Staff Challenges and Admin Console's Departmental Competency Gaps — not a full playable persona.

import type { TeamMember, DeptGoal, RAG } from "./mockData";

export const MARKETING_DEPT_NAME = "Marketing Communications";

export const marketingDepartmentGoals: DeptGoal[] = [
  {
    id: "md1", title: "Elevate Group Brand Presence Across Digital & Earned Media", owner: "Michelle Sylvia", progress: 40,
    description: "Grow share of voice and campaign engagement across owned, earned, and paid channels ahead of the Q4 brand refresh.",
    level: "department", linkedPhillyGoalId: "pg1", linkedPhillyKrId: "pg1kr1",
    keyResults: [
      {
        id: "mkr1", title: "Launch the refreshed corporate brand identity across all client-facing touchpoints", owner: "Michelle Sylvia",
        dueDate: "2026-11-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-21",
        challengeRemark: { text: "Creative agency handover slipped by 3 weeks — re-baselining the rollout schedule with Legal & Compliance sign-off still pending.", date: "2026-07-21", rag: "amber" },
      },
      { id: "mkr2", title: "Grow qualified website traffic from earned media coverage by 25%", owner: "Rave Tan", dueDate: "2026-10-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-19" },
      {
        id: "mkr3", title: "Publish 12 client-education content pieces supporting the Financial Literacy campaign", owner: "Christabel Lin",
        dueDate: "2026-09-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-23",
        challengeRemark: { text: "Only 4 of 12 pieces published so far — internal subject-matter-expert review turnaround is the bottleneck.", date: "2026-07-23", rag: "amber" },
      },
    ],
  },
];

export const marketingTeamMembers: TeamMember[] = [
  { id: "u305", name: "Michelle Sylvia", role: "Head, Marketing Communications", avatar: "MS", rag: "amber" as RAG, directManager: "Elsa Ling", pointsYTD: 0, joinDate: "2019-07-01", goals: [] },
  { id: "u306", name: "Rave Tan", role: "Assistant Manager, Marketing Communications", avatar: "RT", rag: "green" as RAG, directManager: "Michelle Sylvia", pointsYTD: 0, joinDate: "2023-08-01", goals: [] },
  { id: "u307", name: "Christabel Lin", role: "Intern", avatar: "CL", rag: "amber" as RAG, directManager: "Rave Tan", pointsYTD: 0, joinDate: "2026-05-18", goals: [] },
];

// Deliberately a partial skill set per person — "Media Relations" (tagged as required on md1
// below) is nobody's verified skill yet, so the Competency Gap view has a real, non-zero gap.
export const marketingAllMemberSkills = [
  { memberId: "u305", memberName: "Michelle Sylvia", verified: ["Brand Strategy", "Corporate Communications", "Team Leadership"], pending: [] as string[] },
  { memberId: "u306", memberName: "Rave Tan", verified: ["Content Marketing", "Digital Campaign Management"], pending: ["Media Relations"] },
  { memberId: "u307", memberName: "Christabel Lin", verified: ["Content Marketing"], pending: [] as string[] },
];

// Skills tagged as required on md1 — merged into appContext's deptGoalSkills initial state so the
// Departmental Competency Gap view has real data to compute from immediately, without anyone
// needing to manually tag skills first (that state is in-memory only, never persisted).
export const marketingGoalSkills: Record<string, string[]> = {
  md1: ["Brand Strategy", "Corporate Communications", "Content Marketing", "Digital Campaign Management", "Media Relations"],
};
