// Credit Risk Management persona mock data for the 3 demo accounts, sourced from the real Staff
// Listing 2. Previously represented Affluent Markets — swapped to Credit Risk Management per the
// user's request, using the same 3-tier structure (HOD / manager-leave-supervisor / staff), all
// drawn from real, active (no Last Day of Service) rows in users.csv:
//   Nadia Yong (u156 → u21, ops_hod)  — "Head, Credit Risk", the department's real head.
//   Victor Lai (u135 → u22, ops_mgr1) — "Manager, Credit Risk", the only "Manager"-grade person
//     (everyone else is Assistant Manager or below), the natural leave-supervisor/team-lead fit.
//   Marcus Ko  (u188 → u23, ops_mgr2) — "Executive, Credit Risk", a junior individual contributor.
// Real reporting lines in users.csv are flat (everyone reports directly to Nadia Yong) — Marcus Ko's
// directManager is set to Victor Lai here as a demo simplification so the 3-tier nesting reads
// naturally (mirroring the same simplification made for the prior Affluent Markets swap); every
// other real Credit Risk person below keeps their real supervisor, Nadia Yong.
//
// Naming note: internal content-bundle variables are named by the *tier they feed*
// (opsHod*/opsMgr1*/opsMgr2*) rather than by whichever person currently occupies that tier — this
// avoids the confusing "keegan/noel/jingle no longer means who it used to" drift from the previous
// two swaps, so a future identity change only needs to touch the *values*, not variable names.

import type { TeamMember, PersonalDevGoal, RAG, DeptGoal } from "./mockData";

// ── Nadia Yong (u21) — HOD ─────────────────────────────────────────────────────

export const opsCurrentUser = {
  name: "Nadia Yong",
  email: "nadia.yong@phillipsg.com",
  department: "Credit Risk Management",
  designation: "Head, Credit Risk",
  grade: 6,
  joinDate: "2021-05-10",
  tenureYears: 5,
  hod: true,
  pointsYTD: 75,
  avatar: "NY",
};

// Credit Risk Management OKRs — 2026-08-15 refresh: every Objective now carries an AI/agentic-AI
// element (covenant monitoring, credit memo drafting, model explainability, anomaly detection, an
// analyst "copilot") reflecting the department's push toward AI-assisted, evidence-based risk
// control and automation — not just ad2's original standalone AI objective. Ownership is spread so
// that, per the 2026-08-30 review, only Marcus Ko and Farah Ang fall under the 3-Key-Result minimum
// (surfaced in the Team OKRs page's "Team Members With Insufficient Goals" section); every other
// person (Nadia Yong, Victor Lai, Diana Chang, Elton Phua, Delia Wong, Bella Lim, Brianna Lee,
// Jasmine Tan, Nadia Lee) owns 3 or more Key Results — Nadia Lee was previously under-resourced at 0
// and has since been added as a co-owner on 3 Key Results spread across different Objectives.
export const opsDepartmentGoals: DeptGoal[] = [
  {
    id: "ad1", title: "Strengthen Portfolio Credit Quality", owner: "Nadia Yong", progress: 45,
    level: "department",
    keyResults: [
      { id: "akr1", title: "Cut the non-performing loan (NPL) ratio from 3.2% to under 2.5%", owner: "Nadia Yong, Diana Chang", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-20",
        challengeRemark: { text: "Recovery team is stretched thin covering both the legacy NPL book and the new enhanced due-diligence reviews — could use additional headcount to hit the December target.", date: "2026-06-20", rag: "amber" } },
      { id: "akr2", title: "Complete enhanced due-diligence review for 100% of the top-20 credit exposures", owner: "Victor Lai", dueDate: "2026-10-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-06-18" },
      { id: "akr16", title: "Deploy an agentic-AI covenant-monitoring assistant that auto-flags breaches across 100% of corporate facilities", owner: "Elton Phua, Diana Chang", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-21",
        challengeRemark: { text: "Awaiting sign-off from Legal and Compliance on the assistant's auto-flagging thresholds before we can move past the pilot cohort.", date: "2026-07-21", rag: "amber" } },
      { id: "akr17", title: "Cut portfolio-review cycle time by 25% via AI-assisted financial spreading", owner: "Bella Lim", dueDate: "2026-11-30", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-19" },
    ],
  },
  {
    id: "ad2", title: "Modernise Credit Risk Assessment with AI", owner: "Nadia Yong", progress: 20,
    description: "The department's contribution to the organisation's AI-transformation journey: move credit assessment from manual, judgment-heavy review toward AI-assisted, evidence-based decisioning.",
    level: "department",
    keyResults: [
      { id: "akr3", title: "Deploy an AI-assisted credit scoring model for 50% of new retail credit applications", owner: "Nadia Yong", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "akr4", title: "Cut average credit approval turnaround time by 30% via workflow automation", owner: "Victor Lai", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "akr18", title: "Pilot an agentic-AI credit memo drafting assistant, cutting analyst drafting time by 40%", owner: "Delia Wong, Jasmine Tan", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-22" },
      { id: "akr19", title: "Achieve 90% model-explainability coverage (SHAP/LIME reporting) for all AI-assisted scoring decisions", owner: "Brianna Lee", dueDate: "2026-12-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-20" },
    ],
  },
  {
    id: "ad3", title: "Strengthen Regulatory Compliance & Governance", owner: "Nadia Yong", progress: 60,
    level: "department",
    keyResults: [
      { id: "akr5", title: "Pass the annual MAS/Basel III credit risk compliance audit with zero major findings", owner: "Marcus Ko", dueDate: "2026-11-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-06-10" },
      { id: "akr15", title: "Complete first-line compliance checklist review for 100% of new credit applications", owner: "Farah Ang", dueDate: "2026-11-30", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-26" },
      { id: "akr20", title: "Implement an AI-assisted regulatory-change monitoring tool covering 100% of MAS credit-risk circulars", owner: "Diana Chang, Nadia Yong", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-23" },
      { id: "akr21", title: "Complete IBF-accredited AI governance and model-risk-management certification for 100% of model owners", owner: "Bella Lim, Victor Lai", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-17" },
    ],
  },
  {
    id: "ad4", title: "Deliver Timely, Accurate Credit Risk Assessments", owner: "Victor Lai", progress: 50,
    description: "The credit risk team's own outcome objective — assessment speed and accuracy, not case volume processed.",
    level: "department",
    keyResults: [
      { id: "akr6", title: "Hold average credit approval turnaround time under 3 working days for standard applications", owner: "Victor Lai", dueDate: "2026-09-30", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-06-15" },
      { id: "akr7", title: "Keep the credit model override rate under 8%, verified by quarterly model validation", owner: "Marcus Ko", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-15" },
      { id: "akr22", title: "Cut manual data-entry effort in the assessment workflow by 50% via RPA and agentic automation", owner: "Elton Phua", dueDate: "2026-11-30", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-18" },
      { id: "akr23", title: "Achieve a 95% straight-through-processing rate for standard retail credit applications", owner: "Delia Wong, Nadia Lee", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-16" },
    ],
  },
  {
    id: "ad5", title: "Strengthen Credit Risk Monitoring & Early Warning", owner: "Nadia Yong", progress: 25,
    level: "department",
    keyResults: [
      { id: "akr8", title: "Roll out an early-warning watchlist covering 100% of large corporate exposures", owner: "Diana Chang, Nadia Lee", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-22" },
      { id: "akr9", title: "Reduce the average days-past-due for the 30+ DPD retail bucket by 20%", owner: "Elton Phua", dueDate: "2026-12-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-18" },
      { id: "akr10", title: "Complete quarterly stress-testing of the top-10 industry sector exposures", owner: "Delia Wong", dueDate: "2026-10-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-20" },
      { id: "akr24", title: "Deploy an AI-driven anomaly-detection model flagging early-warning signals across 100% of the SME book", owner: "Bella Lim, Jasmine Tan", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-21" },
    ],
  },
  {
    id: "ad6", title: "Elevate Credit Risk Data & Model Governance", owner: "Nadia Yong", progress: 15,
    level: "department",
    keyResults: [
      { id: "akr11", title: "Validate and re-certify 100% of Tier-1 credit scoring models", owner: "Bella Lim", dueDate: "2026-12-01", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-24" },
      { id: "akr12", title: "Digitise the credit memo approval workflow, cutting paper-based approvals to zero", owner: "Brianna Lee, Nadia Lee", dueDate: "2026-11-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-15" },
      { id: "akr13", title: "Complete IBF-accredited credit risk upskilling for 100% of the team", owner: "Jasmine Tan", dueDate: "2026-12-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-10" },
      { id: "akr25", title: "Build an agentic-AI credit-risk-analyst \"copilot\" pilot handling first-pass exposure summaries for 30% of new applications", owner: "Brianna Lee, Farah Ang", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-25" },
    ],
  },
];

// All Credit Risk Management team members visible to Nadia: Victor (u22, reports to Nadia) and
// Marcus (u23, reports to Victor per the demo-hierarchy simplification noted above), plus every
// other real, active Credit Risk person from Staff Listing 2 as "no goals set" placeholders.
export const opsTeamMembers: TeamMember[] = [
  { id: "u22", name: "Victor Lai", role: "Manager, Credit Risk", avatar: "VL", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2015-06-22", goals: [] },
  { id: "u23", name: "Marcus Ko", role: "Executive, Credit Risk", avatar: "MK", rag: "green" as RAG, directManager: "Victor Lai", pointsYTD: 0, joinDate: "2023-07-24", goals: [] },
  { id: "u110", name: "Diana Chang", role: "Senior Executive, Credit Risk", avatar: "DC", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "1996-04-02", goals: [] },
  { id: "u114", name: "Elton Phua", role: "Assistant Manager, Credit Risk", avatar: "EP", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2004-11-22", goals: [] },
  { id: "u139", name: "Delia Wong", role: "Assistant Manager, Credit Risk", avatar: "DW", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2016-08-29", goals: [] },
  { id: "u155", name: "Bella Lim", role: "Senior Executive, Credit Risk", avatar: "BL", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2021-05-10", goals: [] },
  { id: "u164", name: "Brianna Lee", role: "Assistant Manager, Credit Risk", avatar: "BR", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2022-04-11", goals: [] },
  { id: "u165", name: "Jasmine Tan", role: "Senior Executive, Credit Risk", avatar: "JT", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2022-05-04", goals: [] },
  { id: "u181", name: "Nadia Lee", role: "Senior Executive, Credit Risk", avatar: "NL", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2023-04-03", goals: [] },
  { id: "u214", name: "Farah Ang", role: "Executive, Credit Risk", avatar: "FA", rag: "green" as RAG, directManager: "Nadia Yong", pointsYTD: 0, joinDate: "2025-08-04", goals: [] },
];

// ── Survey data (unique per persona) ──────────────────────────────────────────

export const opsHodSurveyData = [
  { competency: "Leadership", benchmark: 82, you: 90 },
  { competency: "Communication", benchmark: 78, you: 84 },
  { competency: "Team Wellness", benchmark: 80, you: 79 },
  { competency: "Ethics", benchmark: 88, you: 93 },
  { competency: "Work Performance", benchmark: 84, you: 89 },
  { competency: "Mentoring & Coaching", benchmark: 81, you: 80 },
];

export const opsMgr1SurveyData = [
  { competency: "Leadership", benchmark: 82, you: 79 },
  { competency: "Communication", benchmark: 78, you: 80 },
  { competency: "Team Wellness", benchmark: 80, you: 82 },
  { competency: "Ethics", benchmark: 88, you: 88 },
  { competency: "Work Performance", benchmark: 84, you: 86 },
  { competency: "Mentoring & Coaching", benchmark: 81, you: 74 },
];

// ── Dev goals ─────────────────────────────────────────────────────────────────

export const opsHodDevGoals: PersonalDevGoal[] = [
  {
    id: "nhd1",
    title: "Certified Credit Risk Professional — Refresher",
    description: "Refresh certification to stay current with evolving credit risk management standards and MAS regulatory expectations.",
    dueDate: "2026-11",
    completed: false,
  },
];

export const opsMgr1DevGoals: PersonalDevGoal[] = [
  {
    id: "vld1",
    title: "Advanced Credit Risk Modelling Certificate",
    description: "Deepen quantitative modelling skills to support the department's AI-assisted credit scoring rollout.",
    dueDate: "2026-10",
    completed: false,
  },
  {
    id: "vld2",
    title: "People Management Essentials",
    description: "Strengthen team coaching and performance conversations as a first-time people manager.",
    dueDate: "2026-12",
    completed: false,
  },
];

export const opsMgr2DevGoals: PersonalDevGoal[] = [
  {
    id: "mkd1",
    title: "IBF Credit Risk Analysis Certificate",
    description: "Build foundational credit risk analysis certification to strengthen core assessment skills.",
    dueDate: "2026-11",
    completed: false,
  },
  {
    id: "mkd2",
    title: "Financial Modelling for Credit Analysts",
    description: "Develop practical financial modelling skills for credit exposure and cash-flow analysis.",
    dueDate: "2027-02",
    completed: false,
  },
];

// ── Skills ────────────────────────────────────────────────────────────────────

export const opsHodSkills = {
  verified: ["Credit Risk Assessment", "Regulatory Compliance", "Team Leadership", "Portfolio Risk Monitoring", "Stakeholder Engagement"],
  pending: ["AI/ML in Credit Scoring"],
};

export const opsMgr1Skills = {
  verified: ["Credit Risk Assessment", "Financial Modelling", "Team Coaching", "Credit Approval Workflow"],
  pending: ["AI/ML in Credit Scoring"],
};

export const opsMgr2Skills = {
  verified: ["Credit Risk Assessment", "Financial Analysis"],
  pending: ["Financial Modelling", "AI/ML in Credit Scoring"],
};

// All-team skills for the Credit Risk Management team (used by SkillsSection allTeamMemberSkills lookup)
export const opsAllTeamMemberSkills = [
  { memberId: "u21", memberName: "Nadia Yong", verified: opsHodSkills.verified, pending: opsHodSkills.pending },
  { memberId: "u22", memberName: "Victor Lai", verified: opsMgr1Skills.verified, pending: opsMgr1Skills.pending },
  { memberId: "u23", memberName: "Marcus Ko", verified: opsMgr2Skills.verified, pending: opsMgr2Skills.pending },
];

// ── Job matches ───────────────────────────────────────────────────────────────

export const opsHodJobMatches = [
  { id: "nj1", title: "Director, Credit Risk", dept: "Credit Risk Management", match: 88, url: "" },
  { id: "nj2", title: "Chief Risk Officer", dept: "Group Risk", match: 76, url: "" },
];

export const opsMgr1JobMatches = [
  { id: "vj1", title: "Senior Manager, Credit Risk", dept: "Credit Risk Management", match: 85, url: "" },
  { id: "vj2", title: "Manager, Enterprise Risk", dept: "Group Risk", match: 74, url: "" },
];

// Marcus is grade 3 (Executive-band) — eligible for the seniority-matched job cards, so these link
// to the live PhillipCapital careers listing (not a specific posting, which can't stay fresh).
export const opsMgr2JobMatches = [
  { id: "mj1", title: "Senior Executive, Credit Risk", dept: "Credit Risk Management", match: 82, url: "https://www.phillip.com.sg/sg/career/" },
  { id: "mj2", title: "Executive, Enterprise Risk", dept: "Group Risk", match: 73, url: "https://www.phillip.com.sg/sg/career/" },
];

// ── Persona user objects (for opsMeta) ───────────────────────────────────────

export const opsMgr1User = {
  name: "Victor Lai",
  email: "victor.lai@phillipsg.com",
  department: "Credit Risk Management",
  designation: "Manager, Credit Risk",
  grade: 5,
  hod: false,
  avatar: "VL",
  pointsYTD: 0,
  joinDate: "2015-06-22",
  tenureYears: 11,
};

export const opsMgr2User = {
  name: "Marcus Ko",
  email: "marcus.ko@phillipsg.com",
  department: "Credit Risk Management",
  designation: "Executive, Credit Risk",
  grade: 3,
  hod: false,
  avatar: "MK",
  pointsYTD: 0,
  joinDate: "2023-07-24",
  tenureYears: 3,
};

// ── Dev milestones (used in HomeSection roadmap) ─────────────────────────────

export const opsHodDevMilestones = [
  { id: "nm1", name: "Credit Risk Professional cert refresh", date: "Nov 2026", complete: false, type: "dev" },
  { id: "nm2", name: "AI credit scoring model pilot launch", date: "Q4 2026", complete: false, type: "perf" },
];

export const opsMgr1DevMilestones = [
  { id: "vm1", name: "Advanced Credit Risk Modelling cert", date: "Oct 2026", complete: false, type: "dev" },
  { id: "vm2", name: "People Management Essentials", date: "Q4 2026", complete: false, type: "dev" },
  { id: "vm3", name: "Credit approval turnaround pilot", date: "Jun 2026", complete: true, type: "perf" },
];

export const opsMgr2DevMilestones = [
  { id: "mm1", name: "IBF Credit Risk Analysis cert", date: "Nov 2026", complete: false, type: "dev" },
  { id: "mm2", name: "Financial modelling course enrolment", date: "Q1 2027", complete: false, type: "dev" },
  { id: "mm3", name: "First credit assessment sign-off", date: "May 2026", complete: true, type: "perf" },
];
