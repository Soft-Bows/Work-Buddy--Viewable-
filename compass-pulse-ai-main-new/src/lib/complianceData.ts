// Compliance department mock data — created solely to give the new "Director" persona (see
// directorData.ts) real, non-empty content to aggregate in its multi-department Key Staff
// Challenges / Departmental Competency Gap view. Deliberately much lighter than opsData.ts's
// Credit Risk bundle (no survey data, dev goals, job matches, or opsMeta-style persona object) —
// Compliance is not itself a playable persona in this demo, only a second department a Director
// can see insights for. Every person here has a real users.csv row (u302-u304, hand-maintained —
// see scripts/sync-users-from-staff-listing.mjs) so the same users.csv-driven
// getRelevantDeptsForViewer/staffList logic that powers every other department works unchanged.

import type { TeamMember, DeptGoal, RAG } from "./mockData";

export const COMPLIANCE_DEPT_NAME = "Compliance";

export const complianceDepartmentGoals: DeptGoal[] = [
  {
    id: "cd1", title: "Strengthen Regulatory Compliance Monitoring", owner: "Reuben Tan", progress: 35,
    description: "Keep pace with MAS regulatory expectations across transaction monitoring, KYC/CDD, and audit readiness.",
    level: "department",
    keyResults: [
      {
        id: "ckr1", title: "Complete AML/CFT transaction-monitoring review for 100% of high-risk accounts", owner: "Michelle Ho",
        dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-22",
        challengeRemark: { text: "Transaction-monitoring alert backlog has grown 40% this quarter — need additional analyst headcount to clear it within SLA.", date: "2026-07-22", rag: "amber" },
      },
      { id: "ckr2", title: "Roll out updated KYC/CDD due-diligence procedures across all client-onboarding teams", owner: "Faizal Rahman", dueDate: "2026-10-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-18" },
      {
        id: "ckr3", title: "Achieve zero major findings in the annual MAS compliance audit", owner: "Reuben Tan",
        dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-24",
        challengeRemark: { text: "Awaiting sign-off from Legal on the revised escalation framework before we can finalise audit prep.", date: "2026-07-24", rag: "amber" },
      },
    ],
  },
];

export const complianceTeamMembers: TeamMember[] = [
  { id: "u302", name: "Reuben Tan", role: "Head, Compliance", avatar: "RT", rag: "amber" as RAG, directManager: "Daniel Lee", pointsYTD: 0, joinDate: "2018-01-15", goals: [] },
  { id: "u303", name: "Michelle Ho", role: "Senior Executive, Compliance", avatar: "MH", rag: "amber" as RAG, directManager: "Reuben Tan", pointsYTD: 0, joinDate: "2020-06-01", goals: [] },
  { id: "u304", name: "Faizal Rahman", role: "Executive, Compliance", avatar: "FR", rag: "green" as RAG, directManager: "Reuben Tan", pointsYTD: 0, joinDate: "2022-09-01", goals: [] },
];

// Deliberately a partial skill set per person — "Sanctions Screening" (tagged as required on cd1
// below) is nobody's verified skill yet, so the Competency Gap view has a real, non-zero gap to show.
export const complianceAllMemberSkills = [
  { memberId: "u302", memberName: "Reuben Tan", verified: ["MAS Regulatory Compliance", "Regulatory Reporting", "Team Leadership"], pending: [] as string[] },
  { memberId: "u303", memberName: "Michelle Ho", verified: ["AML / CFT (Anti-Money Laundering)", "KYC / CDD Compliance"], pending: ["Sanctions Screening"] },
  { memberId: "u304", memberName: "Faizal Rahman", verified: ["KYC / CDD Compliance"], pending: [] as string[] },
];

// Skills tagged as required on cd1 — merged into appContext's deptGoalSkills initial state so the
// Departmental Competency Gap / Director Insights views have real data to compute from immediately,
// without anyone needing to manually tag skills first (that state is in-memory only, never
// persisted — see updateGoalSkills's own comment in appContext.tsx).
export const complianceGoalSkills: Record<string, string[]> = {
  cd1: ["MAS Regulatory Compliance", "AML / CFT (Anti-Money Laundering)", "KYC / CDD Compliance", "Sanctions Screening"],
};
