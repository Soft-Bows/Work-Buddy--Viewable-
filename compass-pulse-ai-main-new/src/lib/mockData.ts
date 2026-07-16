export type Tier = "staff" | "manager" | "admin" | "ops_hod" | "ops_mgr1" | "ops_mgr2";
export type RAG = "red" | "amber" | "green";

export interface PersonalDevGoal {
  id: string;
  title: string;
  description: string;
  dueDate: string; // "YYYY-MM"
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  metric: string;
  quarters: { q: "Q1" | "Q2" | "Q3" | "Q4"; rag: RAG }[];
  linkedDept?: string;
  weightage?: number;
  approved?: boolean;
  pendingAcknowledgement?: boolean;
  ragPendingApproval?: "Q1" | "Q2" | "Q3" | "Q4";
  submittedDate?: string;
  remarks: { id: string; author: string; text: string; date: string; pending?: boolean }[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rag: RAG;
  directManager: string;
  pointsYTD: number;
  goals: Goal[];
  joinDate?: string; // "YYYY-MM-DD" — used for the 30-day goal-setting rule
}

/*
 * Org hierarchy (PPE dept):
 *
 * Sarah Chen   ← HOD (logged-in user) — Director, Human Capital
 *   ├─ Anabelle Tan  ← Senior Manager, Learning & Development
 *   │    └─ Belle Lim  ← Executive, Human Capital
 *   └─ Priya Kapoor  ← HR Business Partner (middle manager)
 *        └─ Marcus Webb  ← Assistant Manager, Human Capital
 */

export const currentUser = {
  name: "Sarah Chen",
  email: "sarah.chen@company.com",
  department: "Human Capital & Workplace Management",
  designation: "Director, Human Capital",
  grade: 6,
  joinDate: "2014-01-15",
  tenureYears: 12,
  hod: true,
  pointsYTD: 150,
  avatar: "SC",
};

export const departmentGoals = [
  { id: "d1", title: "Elevate Manager Effectiveness", owner: "Anabelle Tan", progress: 72, weightage: 25 },
  { id: "d2", title: "Reduce Voluntary Attrition < 8%", owner: "Priya Kapoor", progress: 58, weightage: 20 },
  { id: "d3", title: "Launch Wellness Programme Q3", owner: "Anabelle Tan", progress: 40, weightage: 20 },
  { id: "d4", title: "Roll Out Skills Marketplace", owner: "Anabelle Tan", progress: 25, weightage: 20 },
  { id: "d5", title: "Diversity & Inclusion Index +12%", owner: "Priya Kapoor", progress: 65, weightage: 15 },
];

// Remarks must only come from the team member's direct leave supervisor or the HOD.
const mkRemarks = (n: number, pending = 1, authors: string[] = ["Sarah Chen"]) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `r${Math.random().toString(36).slice(2, 7)}`,
    author: authors[i % authors.length],
    text: [
      "Hit a blocker on stakeholder alignment — could use guidance.",
      "Progress steady this quarter, ahead on training milestones.",
      "Concerned about resourcing for Q3, would value a check-in.",
      "Completed certification, exploring next steps.",
    ][i % 4],
    date: "2 days ago",
    pending: i < pending,
  }));

export const teamMembers: TeamMember[] = [
  {
    id: "u1",
    name: "Anabelle Tan",
    role: "Senior Manager, Learning & Development",
    avatar: "AT",
    rag: "amber",
    directManager: "Sarah Chen",
    pointsYTD: 95,
    joinDate: "2020-06-01",
    goals: [
      { id: "g1", title: "Deliver Q2 manager training", description: "Run 4 cohorts across all business units to lift manager effectiveness scores.", metric: "4/4 cohorts completed", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d1", weightage: 60, approved: false, submittedDate: "2026-06-10", remarks: mkRemarks(3, 2, ["Sarah Chen"]) },
      { id: "g2", title: "Build new hire portal", description: "Design and internally launch a self-service onboarding portal for all new hires.", metric: "Portal live by Aug", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"green"}], linkedDept: "d4", weightage: 40, approved: true, ragPendingApproval: "Q2", remarks: mkRemarks(2, 0, ["Sarah Chen"]) },
      { id: "g3", title: "Coaching certification", description: "Complete ICF Level 1 accredited coaching programme to strengthen people leadership.", metric: "ICF cert obtained", quarters: [{q:"Q2",rag:"amber"}], linkedDept: "d1", weightage: 30, approved: false, submittedDate: "2026-06-24", remarks: mkRemarks(1, 0, ["Sarah Chen"]) },
      { id: "g15", title: "Wellness programme oversight", description: "Coordinate wellness programme delivery across vendor onboarding, mental health first-aider training, and quarterly pulse surveys, ensuring milestones stay on track.", metric: "Programme milestones on track by Q3", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d3", weightage: 20, approved: true, remarks: mkRemarks(1, 0, ["Sarah Chen"]) },
    ],
  },
  {
    id: "u2",
    name: "Priya Kapoor",
    role: "HR Business Partner",
    avatar: "PK",
    rag: "green",
    directManager: "Sarah Chen",
    pointsYTD: 220,
    joinDate: "2022-03-01",
    goals: [
      { id: "g4", title: "Attrition reduction in Tech", description: "Drive retention initiatives across the Technology division targeting voluntary attrition below 10%.", metric: "Voluntary attrition < 10%", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"green"}], linkedDept: "d2", weightage: 70, approved: true, ragPendingApproval: "Q2", remarks: mkRemarks(2, 0, ["Sarah Chen"]) },
      { id: "g5", title: "Engagement survey rollout", description: "Execute the annual engagement survey across all units and deliver insights report.", metric: "100% unit coverage", quarters: [{q:"Q1",rag:"green"}], linkedDept: "d2", weightage: 30, approved: false, submittedDate: "2026-06-25", remarks: mkRemarks(2, 1, ["Sarah Chen"]) },
      { id: "g6", title: "DEI workshops", description: "Lead 3 structured D&I workshops with cross-functional cohorts.", metric: "3/3 workshops delivered", quarters: [{q:"Q2",rag:"green"}], linkedDept: "d5", weightage: 100, approved: true, remarks: mkRemarks(1, 0, ["Sarah Chen"]) },
    ],
  },
  {
    id: "u42",
    name: "James Okafor",
    role: "L&D Specialist",
    avatar: "JO",
    rag: "green",
    directManager: "Sarah Chen",
    pointsYTD: 110,
    joinDate: "2024-03-01",
    goals: [
      { id: "j1", title: "Build L&D content library", description: "Curate and develop a structured digital content library covering core skills for all business units, integrated with the Skills Marketplace platform.", metric: "50 modules published by Q3", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"green"}], linkedDept: "d4", weightage: 10, approved: true, remarks: mkRemarks(1, 0, ["Sarah Chen"]) },
      { id: "j2", title: "Co-facilitate manager effectiveness workshops", description: "Partner with Anabelle to co-facilitate 4 cohorts of the Manager Effectiveness programme across all business units.", metric: "4 cohorts co-facilitated", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d1", weightage: 10, approved: true, remarks: mkRemarks(2, 1, ["Sarah Chen"]) },
      { id: "j3", title: "New hire onboarding refresh", description: "Redesign the 30-day onboarding curriculum to improve new hire time-to-productivity and first-quarter satisfaction scores.", metric: "New curriculum live by Q3, satisfaction ≥ 85%", quarters: [{q:"Q2",rag:"green"}], approved: false, submittedDate: "2026-06-15", remarks: mkRemarks(1, 1, ["Sarah Chen"]) },
    ],
  },
  {
    id: "u4",
    name: "Belle Lim",
    role: "Executive, Human Capital",
    avatar: "BL",
    rag: "amber",
    directManager: "Anabelle Tan",
    pointsYTD: 155,
    joinDate: "2024-09-01",
    goals: [
      { id: "g11", title: "Wellness platform launch", description: "Lead Phase 1 delivery of the employee wellness platform including vendor onboarding.", metric: "Platform live by Sep", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d3", weightage: 65, approved: false, submittedDate: "2026-06-29", remarks: mkRemarks(3, 2, ["Anabelle Tan", "Sarah Chen"]) },
      { id: "g12", title: "Mental health first-aider cohort", description: "Train 20 employees as certified Mental Health First Aiders across Singapore office.", metric: "20 MHFAs certified", quarters: [{q:"Q2",rag:"green"}], linkedDept: "d3", weightage: 10, approved: true, remarks: mkRemarks(1, 0, ["Anabelle Tan"]) },
      { id: "g13", title: "Quarterly wellness pulse", description: "Design and run quarterly employee wellness pulse survey and publish results dashboard.", metric: "4 pulse cycles per year", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"green"}], linkedDept: "d3", weightage: 5, approved: true, remarks: mkRemarks(2, 0, ["Anabelle Tan", "Sarah Chen"]) },
      { id: "g14", title: "Skills marketplace co-design", description: "Collaborate with L&D to co-design the skills tagging framework for the marketplace.", metric: "Framework signed off by Q3", quarters: [{q:"Q2",rag:"green"}], linkedDept: "d4", weightage: 50, approved: false, submittedDate: "2026-06-23", remarks: mkRemarks(1, 1, ["Anabelle Tan"]) },
    ],
  },
];

export const myGoals = {
  performance: [
    { id: "p1", title: "Lift team engagement score +8pts", description: "Sustained quarter-on-quarter improvement.", metric: "+8 pts", rag: "green" as RAG, linkedDept: "d1" },
    { id: "p2", title: "Department attrition < 8%", description: "Annual.", metric: "<8%", rag: "amber" as RAG, linkedDept: "d2" },
    { id: "p3", title: "Launch P&C analytics dashboard", description: "Self-serve insights.", metric: "Q3 GA", rag: "green" as RAG, linkedDept: "d4" },
  ],
  development: [
    { id: "dv1", title: "Executive coaching certification", description: "Complete ICF ACC programme to build leadership coaching capability.", dueDate: "2026-12", completed: false },
    { id: "dv2", title: "Data storytelling masterclass", description: "Tableau and data narrative workshop for people analytics reporting.", dueDate: "2026-07", completed: false },
  ] as PersonalDevGoal[],
};

// Anabelle Tan (u1) — staff-tier demo account (Senior Manager, Learning & Development)
export const staffInitialDevGoals: PersonalDevGoal[] = [
  {
    id: "at1",
    title: "ICF Level 1 Coaching Accreditation",
    description: "Complete the ICF Level 1 accredited coaching programme to formalise leadership coaching capability for manager development programmes.",
    dueDate: "2026-11",
    completed: false,
  },
  {
    id: "at2",
    title: "Instructional Design Certification",
    description: "Earn an ATD certification in instructional design to improve the quality and measurable impact of L&D programme deliverables.",
    dueDate: "2026-08",
    completed: false,
  },
];

// Belle Lim (u4) — admin-tier demo account (Executive, Human Capital)
export const adminInitialDevGoals: PersonalDevGoal[] = [
  {
    id: "bl1",
    title: "IHRP Foundation Certificate",
    description: "Complete the IHRP Foundation Certificate to build a solid grounding in core HR practices, employment frameworks, and Singapore labour law.",
    dueDate: "2026-12",
    completed: false,
  },
  {
    id: "bl2",
    title: "IBF Financial Services Orientation",
    description: "Complete IBF orientation modules to develop foundational knowledge of the financial services industry, regulatory environment, and PhillipCapital's business lines.",
    dueDate: "2026-09",
    completed: false,
  },
];

// Priya Kapoor (u2) — HR Business Partner
export const priyaDevGoals: PersonalDevGoal[] = [
  {
    id: "pk1",
    title: "IHRP Certified Professional (IHRP-CP)",
    description: "Attain IHRP-CP certification to formalise HR business partnering competency across talent strategy, employee relations, and workforce planning.",
    dueDate: "2026-11",
    completed: false,
  },
  {
    id: "pk2",
    title: "Advanced People Analytics Workshop",
    description: "Complete an advanced people analytics workshop to strengthen data-driven attrition and engagement insights for the HRBP function.",
    dueDate: "2026-09",
    completed: false,
  },
];

// James Okafor (u42) — L&D Specialist
export const jamesDevGoals: PersonalDevGoal[] = [
  {
    id: "jo1",
    title: "ATD Instructional Design Certificate",
    description: "Earn the ATD instructional design certificate to strengthen content design quality for the L&D content library and onboarding programmes.",
    dueDate: "2026-10",
    completed: false,
  },
];

export const skills = {
  verified: ["Coaching", "Stakeholder Mgmt", "Strategic Planning", "OD Design", "Facilitation", "Change Management"],
  pending: ["People Analytics", "Conflict Mediation"],
  catalog: ["Coaching", "Stakeholder Mgmt", "Strategic Planning", "OD Design", "Facilitation", "Change Management", "People Analytics", "Conflict Mediation", "Talent Strategy", "Comp & Benefits", "Org Design", "Performance Design", "Leadership Dev"],
};

// Sarah Chen (VP6, Grade 6) — senior leadership-level role matches
export const jobMatches = [
  { id: "j1", title: "Head, Human Capital Operations", dept: "Group Human Resources", match: 94, url: "" },
  { id: "j2", title: "Group HR Business Partner Lead", dept: "Human Capital & Workplace Management", match: 89, url: "" },
];

// Anabelle Tan (AVP4, Grade 4, Senior Manager L&D) — Grade 4 roles not in static listings; Area of Interest picker shows live results
export const staffJobMatches = [
  { id: "j3", title: "Senior Manager, Learning & Development", dept: "Human Capital & Workplace Management", match: 88, url: "" },
];

// Belle Lim (E1, Grade 1, Executive Human Capital) — job rotation opportunities.
// Excludes same designation (Executive, Human Capital) — rotation is about broadening skills,
// not lateral same-role moves. Roles below use transferable interpersonal & admin skills.
// URLs point to the live PhillipCapital careers listing rather than specific postings — individual
// job-page URLs cannot be kept reliably fresh/non-broken since postings change over time.
export const adminJobMatches = [
  { id: "j5", title: "Executive, Client Services", dept: "Client Services", match: 84, url: "https://www.phillip.com.sg/sg/career/" },
  { id: "j6", title: "Executive, Operations", dept: "Operations / Settlement", match: 78, url: "https://www.phillip.com.sg/sg/career/" },
];

export const competencies = ["Leadership", "Communication", "Team Wellness", "Ethics", "Work Performance", "Mentoring & Coaching"];
export const surveyData = competencies.map((c, i) => ({
  competency: c,
  benchmark: [82, 78, 80, 88, 84, 81][i],
  you: [85, 80, 79, 90, 83, 68][i],
}));

export const anabelleSurveyData = competencies.map((c, i) => ({
  competency: c,
  benchmark: [82, 78, 80, 88, 84, 81][i],
  you: [80, 86, 83, 88, 85, 75][i],
}));

export const actionPlanItems = [
  { id: "a1", type: "internal", title: "Internal: Mentoring Playbook 2026", desc: "Company handbook chapter 4 on structured mentoring.", done: false, deadline: "Aug 30", postedDate: "2026-04-15" },
  { id: "a2", type: "internal", title: "Internal: Pair with a Mentor Network buddy", desc: "Match via P&C platform.", done: true, deadline: "Jul 15", postedDate: "2026-04-15" },
  { id: "a3", type: "external", title: "Coursera: The Manager's Toolkit", desc: "U. of London — 6 modules, ~12 hrs.", done: false, deadline: "Oct 01", postedDate: "2026-04-15" },
  { id: "a4", type: "external", title: "Book: The Coaching Habit (Bungay Stanier)", desc: "Read & complete reflection journal.", done: false, deadline: "Sep 15", postedDate: "2026-04-15" },
];

export const rewardsCatalog = [
  { id: "rw1", name: "$10 Giftano Voucher", points: 200, icon: "🎁", brands: ["Grab", "Starbucks"] },
  { id: "rw2", name: "$20 Giftano Voucher", points: 350, icon: "🎁", brands: ["FairPrice", "Cold Storage"] },
  { id: "rw3", name: "$50 Giftano Voucher", points: 500, icon: "🎁", brands: ["CapitaLand Mall"] },
];

export const pointsLog = [
  { id: "pl1", userId: "u0", text: "Responded to James's Q2 remark", pts: 10, date: "2h ago" },
  { id: "pl2", userId: "u0", text: "Sent compliment to Priya", pts: 25, date: "Yesterday" },
  { id: "pl3", userId: "u0", text: "Completed action plan item", pts: 50, date: "3 days ago" },
  { id: "pl4", userId: "u0", text: "Approved skill addition", pts: 5, date: "5 days ago" },
  { id: "pl5", userId: "u0", text: "Goal RAG update (Q2)", pts: 10, date: "1 week ago" },
];

export const corporateValues = [
  { id: "v1", name: "Integrity", icon: "🛡️" },
  { id: "v2", name: "Innovation", icon: "💡" },
  { id: "v3", name: "Collaboration", icon: "🤝" },
  { id: "v4", name: "Excellence", icon: "⭐" },
  { id: "v5", name: "Empathy", icon: "💖" },
  { id: "v6", name: "Ownership", icon: "🎯" },
  { id: "v7", name: "Curiosity", icon: "🔍" },
  { id: "v8", name: "Inclusion", icon: "🌍" },
];

export const colleagues = ["James Okafor", "Priya Kapoor", "Anabelle Tan", "Belle Lim", "Eliza Lim", "Brandon Lim", "Goi Teck Poh Frankie"];

export const onboardingMilestones = [
  { id: "om1", name: '"Building the Clock" Orientation', date: "+3mo", complete: true },
  { id: "om2", name: "30-day check-in meeting", date: "+1mo", complete: true },
  { id: "om3", name: "First skills profile submission", date: "+2mo", complete: true },
  { id: "om4", name: "Probation review", date: "+6mo", complete: false },
];

export const devMilestones = [
  { id: "dm1", name: "Coaching certification", date: "Q3 2026", complete: false, type: "dev" },
  { id: "dm2", name: "All-hands presentation", date: "Q4 2026", complete: false, type: "dev" },
  { id: "dm3", name: "Lift team engagement +8pts", date: "Q4 2026", complete: false, type: "perf" },
  { id: "dm4", name: "P&C analytics dashboard GA", date: "Q3 2026", complete: false, type: "perf" },
  { id: "dm5", name: "Mid-year performance review", date: "Jun 2026", complete: true, type: "perf" },
];

export const staffList = [
  { name: "James Okafor", dept: "Human Capital & Workplace Management", role: "L&D Specialist", grade: 4, join: "2 years ago", supervisor: "Sarah Chen", hod: false },
  { name: "Priya Kapoor", dept: "Human Capital & Workplace Management", role: "HR Business Partner", grade: 3, join: "3 years ago", supervisor: "Sarah Chen", hod: false },
  { name: "Eliza Lim", dept: "Affluent Markets", role: "Director, Private Clients Solutions", grade: 6, join: "33 years ago", supervisor: "—", hod: true },
  { name: "Brandon Lim", dept: "Affluent Markets", role: "Senior Manager, Dealing", grade: 4, join: "15 years ago", supervisor: "Eliza Lim", hod: false },
  { name: "Goi Teck Poh Frankie", dept: "Affluent Markets", role: "Dealer", grade: 1, join: "2 years ago", supervisor: "Brandon Lim", hod: false },
];

// ── Activity catalog ─────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  name: string;
  points: number;             // positive = earn, negative = penalty
  isCompulsory: boolean;
  audience: "all" | "manager" | "hod";
  category: "goal" | "recognition" | "skill" | "engagement" | "penalty";
  live: boolean;
  // Timeline — how long the user has to complete the activity once triggered
  timelineDays?: number;      // e.g. 7 (days)
  timelineTrigger?: string;   // e.g. "team member submits goal for approval"
  // Penalty incurred if a compulsory activity is not completed within the timeline
  penaltyPoints?: number;     // magnitude (positive number); stored as-is, applied as negative
}

export const defaultActivities: Activity[] = [
  {
    id: "act1", name: "Propose a performance goal", points: 10,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 30, timelineTrigger: "joining the company",
    penaltyPoints: 30,
  },
  {
    id: "act2", name: "Add a development goal", points: 10,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 30, timelineTrigger: "joining the company",
    penaltyPoints: 30,
  },
  {
    id: "act3", name: "Update goal RAG status (quarterly)", points: 10,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 14, timelineTrigger: "end of each quarter",
    penaltyPoints: 15,
  },
  {
    id: "act4", name: "Respond to a team member's remark", points: 10,
    isCompulsory: true, audience: "manager", category: "goal", live: true,
    timelineDays: 5, timelineTrigger: "team member posts a pending remark",
    penaltyPoints: 10,
  },
  {
    id: "act5", name: "Approve a skill endorsement", points: 5,
    isCompulsory: false, audience: "manager", category: "skill", live: true,
  },
  {
    id: "act6", name: "Send a compliment", points: 25,
    isCompulsory: false, audience: "all", category: "recognition", live: true,
  },
  {
    id: "act7", name: "Complete an action plan item", points: 50,
    isCompulsory: true, audience: "manager", category: "goal", live: true,
    timelineDays: 30, timelineTrigger: "action plan item is assigned",
    penaltyPoints: 20,
  },
  {
    id: "act8", name: "Acknowledge team goal contribution linkage", points: 15,
    isCompulsory: false, audience: "hod", category: "engagement", live: true,
  },
  {
    id: "act9", name: "Approve team member's goal", points: 10,
    isCompulsory: true, audience: "manager", category: "goal", live: true,
    timelineDays: 7, timelineTrigger: "team member submits a goal for approval",
    penaltyPoints: 10,
  },
  {
    id: "act10", name: "Endorse a pending skill submission", points: 5,
    isCompulsory: true, audience: "manager", category: "skill", live: true,
    timelineDays: 7, timelineTrigger: "team member submits a skill for endorsement",
    penaltyPoints: 10,
  },
  {
    id: "act11", name: "Approve team dept goal progress update", points: 20,
    isCompulsory: true, audience: "hod", category: "goal", live: true,
    timelineDays: 7, timelineTrigger: "a team goal RAG update is submitted",
    penaltyPoints: 15,
  },
  {
    id: "act12", name: "Review and set team goal weightages (contributions)", points: 25,
    isCompulsory: true, audience: "hod", category: "goal", live: true,
    timelineDays: 14, timelineTrigger: "a new individual goal is linked to a team goal",
    penaltyPoints: 20,
  },
];
