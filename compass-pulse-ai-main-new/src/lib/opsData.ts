// Affluent Markets persona mock data for the 3 demo accounts, sourced from the real Staff Listing 2.
// Eliza Lim (u21, HOD), Brandon Lim (u22, Manager — reports to Eliza, has Frankie as direct report),
// Goi Teck Poh Frankie (u23, Staff Dealer — reports to Brandon).

import type { TeamMember, PersonalDevGoal, RAG } from "./mockData";

const mkR = (author: string, text: string, pending = true) => [{
  id: `r${Math.random().toString(36).slice(2, 7)}`,
  author, text, date: "3 days ago", pending,
}];

// ── Eliza Lim (u21) — HOD ─────────────────────────────────────────────────────

export const opsCurrentUser = {
  name: "Eliza Lim",
  email: "eliza.lim@phillipsg.com",
  department: "Affluent Markets",
  designation: "Director, Private Clients Solutions",
  grade: 6,
  joinDate: "1993-07-15",
  tenureYears: 33,
  hod: true,
  pointsYTD: 150,
  avatar: "EL",
};

export const opsDepartmentGoals = [
  { id: "ad1", title: "Grow Assets Under Management by 15%", owner: "Eliza Lim", progress: 55, weightage: 40 },
  { id: "ad2", title: "Improve Client Retention Rate to 95%", owner: "Eliza Lim", progress: 70, weightage: 30 },
  { id: "ad3", title: "Digitalise Client Onboarding Journey", owner: "Eliza Lim", progress: 35, weightage: 30 },
];

// All Affluent Markets team members visible to Eliza: Brandon (reports to Eliza) and Frankie
// (reports to Brandon). Matches the flat-then-one-layer real reporting structure in Staff Listing 2.
export const opsTeamMembers: TeamMember[] = [
  {
    id: "u22",
    name: "Brandon Lim",
    role: "Senior Manager, Dealing",
    avatar: "BR",
    rag: "green" as RAG,
    directManager: "Eliza Lim",
    pointsYTD: 75,
    joinDate: "2011-07-04",
    goals: [
      {
        id: "bg1", title: "Achieve 98% trade execution accuracy",
        description: "Tighten dealing desk controls and pre-trade checks to keep execution accuracy at or above 98% across all affluent client orders.",
        metric: "Execution accuracy ≥ 98% by Q3",
        quarters: [{ q: "Q1" as const, rag: "green" as RAG }, { q: "Q2" as const, rag: "green" as RAG }],
        linkedDept: "ad1", weightage: 40, approved: true,
        remarks: mkR("Eliza Lim", "Strong execution numbers this quarter — keep it up."),
      },
      {
        id: "bg2", title: "Onboard 10 new affluent clients this quarter",
        description: "Work with the relationship desk to convert qualified leads into onboarded affluent clients, growing the AUM base.",
        metric: "10 new clients onboarded by Q3",
        quarters: [{ q: "Q2" as const, rag: "amber" as RAG }],
        linkedDept: "ad1", weightage: 35, approved: true,
        remarks: [],
      },
      {
        id: "bg3", title: "Reduce client onboarding turnaround time by 30%",
        description: "Partner with IT to streamline the digital onboarding workflow, cutting average turnaround time from receipt of documents to account activation.",
        metric: "30% faster turnaround vs Q1 baseline",
        quarters: [{ q: "Q1" as const, rag: "green" as RAG }, { q: "Q2" as const, rag: "green" as RAG }],
        linkedDept: "ad3", weightage: 100, approved: true,
        remarks: [],
      },
    ],
  },
  {
    id: "u23",
    name: "Goi Teck Poh Frankie",
    role: "Dealer",
    avatar: "GF",
    rag: "amber" as RAG,
    directManager: "Brandon Lim",
    pointsYTD: 25,
    joinDate: "2024-07-22",
    goals: [
      {
        id: "fg1", title: "Execute trades within SLA 99% of the time",
        description: "Maintain trade execution turnaround within the desk's service-level agreement for at least 99% of orders handled.",
        metric: "99% SLA adherence by Q3",
        quarters: [{ q: "Q2" as const, rag: "amber" as RAG }],
        linkedDept: "ad1", weightage: 25, approved: false, submittedDate: "2026-06-18",
        remarks: mkR("Goi Teck Poh Frankie", "Order volume has spiked this quarter — flagging for support on peak days.", true),
      },
      {
        id: "fg2", title: "Complete CMFAS M6 certification",
        description: "Obtain CMFAS Module 6 (Securities Products and Analysis) certification to deepen product knowledge for client conversations.",
        metric: "CMFAS M6 passed by Q4",
        quarters: [{ q: "Q2" as const, rag: "amber" as RAG }],
        approved: true,
        remarks: [],
      },
      {
        id: "fg3", title: "Build affluent client referral pipeline",
        description: "Develop a steady pipeline of qualified affluent client referrals in support of the desk's retention and growth targets.",
        metric: "5 qualified referrals per quarter",
        quarters: [{ q: "Q1" as const, rag: "amber" as RAG }, { q: "Q2" as const, rag: "green" as RAG }],
        linkedDept: "ad2", weightage: 100, approved: true,
        remarks: mkR("Brandon Lim", "Great progress on referrals — let's discuss expanding this to the wealth desk too.", false),
      },
    ],
  },
];

// Eliza's own performance goals (shown in her My Goals as the HOD)
export const noelPerformanceGoals = [
  {
    id: "ep1", title: "Expand high-net-worth client base by 20%",
    description: "Drive division-wide growth of the high-net-worth client segment through targeted acquisition and relationship deepening initiatives.",
    metric: "20% growth in HNW clients by Q4",
    rag: "amber" as RAG, linkedDept: "ad1",
  },
  {
    id: "ep2", title: "Launch digital wealth advisory platform",
    description: "Oversee the rollout of a digital advisory platform to give affluent clients self-service portfolio insights alongside dealer support.",
    metric: "Platform live by Q3",
    rag: "green" as RAG, linkedDept: "ad3",
  },
  {
    id: "ep3", title: "Strengthen dealer compliance and risk controls across division",
    description: "Reinforce pre- and post-trade compliance controls across the dealing desk to protect clients and maintain regulatory standing.",
    metric: "Zero compliance breaches FY2026",
    rag: "green" as RAG, linkedDept: "ad2",
  },
];

// ── Survey data (unique per Affluent Markets persona) ─────────────────────────

export const noelSurveyData = [
  { competency: "Leadership", benchmark: 82, you: 91 },
  { competency: "Communication", benchmark: 78, you: 85 },
  { competency: "Team Wellness", benchmark: 80, you: 78 },
  { competency: "Ethics", benchmark: 88, you: 94 },
  { competency: "Work Performance", benchmark: 84, you: 90 },
  { competency: "Mentoring & Coaching", benchmark: 81, you: 79 },
];

export const keeganSurveyData = [
  { competency: "Leadership", benchmark: 82, you: 80 },
  { competency: "Communication", benchmark: 78, you: 81 },
  { competency: "Team Wellness", benchmark: 80, you: 75 },
  { competency: "Ethics", benchmark: 88, you: 86 },
  { competency: "Work Performance", benchmark: 84, you: 87 },
  { competency: "Mentoring & Coaching", benchmark: 81, you: 67 },
];

// ── Dev goals ─────────────────────────────────────────────────────────────────

export const noelDevGoals: PersonalDevGoal[] = [
  {
    id: "ed1",
    title: "IBF Qualified (IBFQ) — Private Banking & Wealth Management",
    description: "Attain IBF-Q certification in Private Banking & Wealth Management to formalise senior-level expertise in affluent client advisory and relationship management.",
    dueDate: "2026-12",
    completed: false,
  },
  {
    id: "ed2",
    title: "Advanced Leadership Programme for Senior Executives (SMU)",
    description: "Attend SMU's Advanced Leadership Programme to strengthen strategic decision-making and change leadership across the Affluent Markets division.",
    dueDate: "2026-09",
    completed: false,
  },
];

export const keeganDevGoals: PersonalDevGoal[] = [
  {
    id: "bd1",
    title: "CMFAS M6 (Securities Products and Analysis) — Refresher",
    description: "Complete a refresher of CMFAS Module 6 to stay current on securities product knowledge relevant to the dealing desk.",
    dueDate: "2026-10",
    completed: false,
  },
  {
    id: "bd2",
    title: "Certified Financial Planner (CFP) — Module 1",
    description: "Begin the CFP certification pathway, starting with Module 1, to build deeper financial planning capability for client-facing conversations.",
    dueDate: "2026-12",
    completed: false,
  },
];

export const jingleDevGoals: PersonalDevGoal[] = [
  {
    id: "fd1",
    title: "CMFAS M6 (Securities Products and Analysis)",
    description: "Complete CMFAS Module 6 to build core product knowledge across equity instruments and structured products handled by the dealing desk.",
    dueDate: "2026-11",
    completed: false,
  },
  {
    id: "fd2",
    title: "IBF-STS Dealing & Trading — Level 1",
    description: "Complete the IBF Skills and Training Standards module for Dealing & Trading at Level 1, covering trade execution, order handling, and client servicing fundamentals.",
    dueDate: "2027-03",
    completed: false,
  },
];

// ── Skills ────────────────────────────────────────────────────────────────────

export const noelSkills = {
  verified: ["Wealth Advisory", "Client Relationship Management", "Strategic Planning", "Team Leadership", "Stakeholder Engagement", "Risk Management"],
  pending: ["Digital Transformation", "Succession Planning"],
};

export const keeganSkills = {
  verified: ["Trade Execution", "Client Servicing", "Team Coaching", "Dealing Operations"],
  pending: ["Wealth Advisory", "Portfolio Construction"],
};

export const jingleSkills = {
  verified: ["Trade Execution", "Market Analysis", "Client Communication"],
  pending: ["Wealth Advisory", "Portfolio Construction"],
};

// All-team skills for the Affluent Markets team (used by SkillsSection allTeamMemberSkills lookup)
export const opsAllTeamMemberSkills = [
  { memberId: "u21", memberName: "Eliza Lim", verified: noelSkills.verified, pending: noelSkills.pending },
  { memberId: "u22", memberName: "Brandon Lim", verified: keeganSkills.verified, pending: keeganSkills.pending },
  { memberId: "u23", memberName: "Goi Teck Poh Frankie", verified: jingleSkills.verified, pending: jingleSkills.pending },
];

// ── Job matches ───────────────────────────────────────────────────────────────

export const noelJobMatches = [
  { id: "nj1", title: "Regional Head, Private Wealth", dept: "Affluent Markets", match: 89, url: "" },
  { id: "nj2", title: "Managing Director, Wealth Management", dept: "Group Wealth", match: 82, url: "" },
];

export const keeganJobMatches = [
  { id: "kj1", title: "Assistant Vice President, Dealing", dept: "Affluent Markets", match: 86, url: "" },
  { id: "kj2", title: "Senior Manager, Affluent Markets", dept: "Affluent Markets", match: 80, url: "" },
];

// Frankie is grade 1 (Executive-band) — eligible for the seniority-matched job cards, so these
// link to the live PhillipCapital careers listing (not a specific posting, which can't stay fresh).
export const jingleJobMatches = [
  { id: "jj1", title: "Senior Dealer", dept: "Affluent Markets", match: 84, url: "https://www.phillip.com.sg/sg/career/" },
  { id: "jj2", title: "Relationship Manager", dept: "Affluent Markets", match: 75, url: "https://www.phillip.com.sg/sg/career/" },
];

// ── Persona user objects (for opsMeta) ───────────────────────────────────────

export const keeganUser = {
  name: "Brandon Lim",
  email: "brandon.lim@phillipsg.com",
  department: "Affluent Markets",
  designation: "Senior Manager, Dealing",
  grade: 4,
  hod: false,
  avatar: "BR",
  pointsYTD: 75,
  joinDate: "2011-07-04",
  tenureYears: 15,
};

export const jingleUser = {
  name: "Goi Teck Poh Frankie",
  email: "frankie.goi@phillipsg.com",
  department: "Affluent Markets",
  designation: "Dealer",
  grade: 1,
  hod: false,
  avatar: "GF",
  pointsYTD: 25,
  joinDate: "2024-07-22",
  tenureYears: 2,
};

// Dev milestones for Brandon (used in HomeSection roadmap)
export const keeganDevMilestones = [
  { id: "bm1", name: "CMFAS M6 refresher", date: "Sep 2026", complete: false, type: "dev" },
  { id: "bm2", name: "CFP Module 1 enrolment", date: "Q4 2026", complete: false, type: "dev" },
  { id: "bm3", name: "Client onboarding pilot", date: "Jun 2026", complete: true, type: "perf" },
];

export const jingleDevMilestones = [
  { id: "fm1", name: "CMFAS M6 preparation", date: "Oct 2026", complete: false, type: "dev" },
  { id: "fm2", name: "IBF-STS Dealing Level 1 enrolment", date: "Q1 2027", complete: false, type: "dev" },
  { id: "fm3", name: "First affluent client referral", date: "May 2026", complete: true, type: "perf" },
];

export const noelDevMilestones = [
  { id: "em1", name: "IBF-Q Private Banking enrolment", date: "Sep 2026", complete: false, type: "dev" },
  { id: "em2", name: "Advanced Leadership Programme (SMU)", date: "Q4 2026", complete: false, type: "dev" },
  { id: "em3", name: "Digital advisory platform launch", date: "Q3 2026", complete: false, type: "perf" },
  { id: "em4", name: "Q1 AUM growth review", date: "Mar 2026", complete: true, type: "perf" },
];
