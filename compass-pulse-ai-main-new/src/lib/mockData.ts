// director1/director2 — the 2 "Director" demo personas (Elsa Ling, Ethan Lim — real people per
// "Staff Listing 2 (MGT).pdf"), each the real direct leave supervisor of one or more department
// HODs per users.csv. Unlike every other tier, a director doesn't own a department's own OKRs/
// skills content of their own — their real multi-department oversight is embedded into Team OKRs'
// Key Staff Challenges and Admin Console's Departmental Competency Gaps (see getRelevantDeptsForViewer
// in insights.ts), not a dedicated page.
export type Tier = "staff" | "manager" | "admin" | "ops_hod" | "ops_mgr1" | "ops_mgr2" | "director1" | "director2" | "director0";
export type RAG = "red" | "amber" | "green";

export interface PersonalDevGoal {
  id: string;
  title: string;
  description: string;
  dueDate: string; // "YYYY-MM"
  completed: boolean;
  completedDate?: string; // "YYYY-MM-DD" — stamped when `completed` first flips to true
  encouragementSent?: boolean; // a supervisor's "Send encouragement note" is one-shot per goal
}

// A director's own lightweight performance goal, deliberately NOT a duplicate OKR system — per
// 2026 executive-cascading research (tie an executive's own goals directly to one enterprise Key
// Result rather than mirroring it), each goal links to exactly one existing OKR item org-wide
// (either a 2026 Philly Group Key Result, or any department Objective/Key Result), never a
// standalone target of its own. linkedOkrId is an id from the same flattened id-space
// flattenOkrOptions() already uses (a DeptGoal id, a KeyResult id, or a Philly Group Goal/KR id —
// all disjoint namespaces, so one field is enough); linkedOkrLabel is the resolved display text at
// the time it was linked, cached so the row doesn't need to re-search every OKR list on every render.
export interface DirectorPerformanceGoal {
  id: string;
  title: string;
  linkedOkrId?: string;
  linkedOkrLabel?: string;
  status: "on-track" | "at-risk" | "done";
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  metric: string;
  quarters: { q: "Q1" | "Q2" | "Q3" | "Q4"; rag: RAG }[];
  // Id of the Objective (department- or team-level DeptGoal) or KeyResult this performance goal
  // contributes to. Required going forward (both the propose and add flows enforce this) — every
  // individual performance goal must link to exactly one OKR item in the member's own department.
  linkedDept?: string;
  weightage?: number;
  approved?: boolean;
  pendingAcknowledgement?: boolean;
  ragPendingApproval?: "Q1" | "Q2" | "Q3" | "Q4";
  submittedDate?: string;
  // Set only when this goal was created via an HOD's "Recommend a New Goal" — distinct from
  // submittedDate (which belongs to the self-propose flow) so the two SLAs never collide.
  recommendedDate?: string;
  ackPenaltyApplied?: boolean;
  remarks: { id: string; author: string; text: string; date: string; pending?: boolean }[];
}

// A direct (non-HOD) supervisor's or a staff member's proposed change to an existing performance
// goal, held here until the HOD approves/rejects it — the live goal is untouched until then.
export interface GoalEditProposal {
  id: string;
  memberId: string;
  memberName: string;
  goalId: string;
  goalTitle: string;
  changes: { title?: string; description?: string; metric?: string; linkedDept?: string };
  source: "supervisor" | "self";
  proposedBy: string;
  proposedDate: string;
  hodId: string;
  hodName: string;
  penaltyApplied?: boolean;
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
  // Flips once the supervisor has been penalized for this member not reaching 3 performance goals
  // within 7 working days of their 30-day mark — prevents double-charging on later sweeps.
  newJoinerPenaltyApplied?: boolean;
}

/*
 * Org hierarchy (HCWM dept), as of the 2026-08-01 roster cleanup — every real row below is a
 * genuine users.csv account, and the org shape (who reports to whom) matches users.csv's
 * `supervisor` column exactly. A duplicate "Hazel Seah" row (same title as Anabelle Tan's Senior
 * Manager, L&D — an earlier sync artifact), Bella Ong's / the Cafeteria-Messenger-Chauffeur
 * support-staff branch, and Priya Kapoor were removed as duplicates/non-essential to the
 * OKR-tracked roster.
 *
 * Sarah Chen (HOD, logged-in user) — Director, Human Capital
 *   ├─ Anabelle Tan — Senior Manager, Learning & Development
 *   │    └─ Belle Lim — Executive, Human Capital
 *   ├─ Bryan Goh — Assistant Manager, Human Capital
 *   │    └─ Rhea Yee — Executive, Human Capital
 *   ├─ Marcus Teo — HR Business Partner
 *   │    └─ Yara Yip — Executive, Human Capital
 *   └─ Caleb Ong — Head, Workplace Management
 *        ├─ Diana Eng — Officer, Workplace Management
 *        └─ Ethan Lam — Assistant Manager, Workplace Management
 */

export const currentUser = {
  name: "Sarah Chen",
  email: "sarahchen@phillip.com.sg",
  department: "Human Capital & Workplace Management",
  designation: "Director, Human Capital",
  grade: 6,
  joinDate: "2017-04-03",
  tenureYears: 9,
  hod: true,
  pointsYTD: 150,
  avatar: "SS",
};

// A Key Result under an Objective (department- or team-level DeptGoal below). Owner/dueDate are
// affixed by the HOD when the KR is created; ragConfidence is a monthly-cadence, forward-looking
// leading indicator ("will we hit this?" — Atlassian/Google-style pulse-check), score is a one-time
// 0.0–1.0 retrospective result set once at quarter-end. These are deliberately un-weighted: an
// Objective's overall score is a plain average of its Key Results' scores once every KR has one (see
// objectiveScore() in utils.ts) — no % contribution/weighting anywhere in the OKR model.
export interface KeyResult {
  id: string;
  title: string;
  owner: string; // name — matches DeptGoal.owner's convention; resolved to a staffList id when needed
  dueDate: string; // "YYYY-MM-DD"
  ragConfidence: RAG;
  ragConfidenceUpdatedDate?: string; // drives the monthly SLA (checkOverduePenalties) + nudge
  // Which calendar month (e.g. "2026-07") the monthly RAG-confidence penalty has already been
  // charged for, if any — recurring, unlike the one-shot ack/score penalty flags below.
  ragPenaltyMonth?: string;
  score?: number; // 0.0–1.0; undefined = not yet scored
  scoreSubmittedDate?: string;
  // "YYYY-Q#" — which quarter `score` was submitted for. Since score never auto-clears at a quarter
  // boundary (see above), this is what lets the UI tell "this is a past quarter's result, label it as
  // such" apart from "this is current" — see isKrScoreFromPastQuarter/isKrScoreStaleForDisplay in
  // utils.ts.
  scoreQuarter?: string;
  // Stamped only on a real TITLE change (updateKeyResult, resolveOkrCounter) — compared against
  // scoreSubmittedDate so a past-quarter score is hidden entirely once it no longer describes the
  // current KR, per the "no longer relevant if modified" display rule. Deliberately narrower than
  // lastTouchedDate below: an owner or due-date change alone shouldn't hide an otherwise-valid score.
  definitionEditedDate?: string;
  // Stamped on ANY edit (title, owner, due date, description, or a new quarterly score) — drives the
  // "recently updated" highlight (see AttentionHighlight.tsx), which is deliberately broader than
  // definitionEditedDate above.
  lastTouchedDate?: string;
  assignedDate?: string;
  // Owner names still owing an acknowledgement — e.g. appointing one new co-owner on an
  // already-multi-owner KR only puts *that* name here, not every existing owner. Undefined/empty =
  // nothing pending. Use isPendingAckFor()/hasPendingAck() from utils.ts rather than checking directly.
  pendingAcknowledgementFor?: string[];
  // What triggered the current pendingAcknowledgementFor, so the owner's ack banner can say the right
  // thing — undefined/"assignment" is the original owner appointment; "hodEdit" is a HOD edit to the
  // title/owner/dueDate after the fact; "hodScore" is specifically a HOD score override, which also
  // drives a highlighted score display until the owner acknowledges it.
  pendingChangeType?: "assignment" | "hodEdit" | "hodScore";
  ackPenaltyApplied?: boolean;
  scorePenaltyApplied?: boolean;
  // A requested change to this KR — available at two checkpoints: before acceptance (pending
  // owner's initial ack) and again right after a monthly confidence update — always routed to the
  // HOD for accept/reject/modify via resolveOkrCounter. title/description is the text-remark type;
  // dueDate is the separate calendar-based alternative-due-date type — either or both may be set.
  // proposedBy is the specific owner who submitted this — on a multi-owner Key Result, the review UI
  // must attribute the request to just this one person, not imply every owner asked for the change.
  counterProposal?: { title?: string; description?: string; dueDate?: string; proposedDate: string; proposedBy: string };
  // Set when the HOD rejects a counterProposal with an optional reason — shown to the owner
  // alongside the reopened original-appointment ack banner, cleared once they next act.
  lastCounterRejection?: { reason?: string; date: string };
  // Multi-owner reconciliation — set when one owner updates monthly confidence / submits a quarterly
  // score while the KR has more than one owner; a *different* owner must agree (finalizes into
  // ragConfidence/score) or counter with an alternative (which just re-proposes, flipping proposedBy).
  pendingCoOwnerConfidence?: { rag: RAG; proposedBy: string; proposedDate: string };
  pendingCoOwnerScore?: { score: number; proposedBy: string; proposedDate: string };
  // Set true once multi-owners have agreed on a quarterly score — informational only (the
  // score-penalty sweep already keys off `score !== undefined`, which only becomes true on agreement).
  alignedScoreThisQuarter?: boolean;
  // ── Mandatory challenge-sharing on a red/amber Monthly Confidence update ──────────────────────
  // Set whenever the owner submits a red or amber confidence — the app requires a short remark on
  // what's blocking progress before the update is accepted (see submitKeyResultConfidenceWithChallenge
  // in appContext.tsx). Cleared the next time the owner submits green, since a recovered confidence
  // has nothing further to report.
  // submittedBy is the specific owner who actually submitted this — on a multi-owner Key Result,
  // Key Staff Challenges must attribute the remark to just this one person, never imply every
  // co-owner submitted the same challenge (no two people can submit the exact same feedback).
  challengeRemark?: { text: string; date: string; rag: "red" | "amber"; submittedBy: string };
  // Philly Group OKRs only (src/lib/phillyGroupOkrs.ts) — a non-Managing-Director director's
  // proposed change to a group Key Result. Wider than counterProposal above (which has no owner/
  // score fields) since a group-level proposal explicitly needs to cover reassigning ownership
  // (incl. multiple owners, same comma-joined convention as elsewhere) and re-proposing the
  // quarterly score, not just title/date changes — no `description` field here since KeyResult
  // itself has none anywhere in this app (only the parent Objective/PhillyGroupGoal does). The
  // Managing Director accepts/rejects via resolvePhillyKrProposal in appContext.tsx; only the MD
  // can edit a group Key Result directly.
  phillyProposal?: { title?: string; dueDate?: string; owner?: string; score?: number; proposedDate: string; proposedBy: string };
  // Names still owing a response to the open challengeRemark — the Objective's own owner(s) plus the
  // department's HOD, minus the KR owner themselves (no point routing feedback to yourself) and
  // minus whoever has already responded. Cleared once challengeResponse is set.
  pendingChallengeResponseFor?: string[];
  // The HOD's or Objective owner's reply — manual text, or AI-drafted (isAI) via the "Ask Work Buddy AI to
  // help draft this" affordance. Once set, pendingChallengeAckByOwner flips true so the KR owner is
  // prompted to acknowledge it.
  challengeResponse?: { text: string; date: string; respondedBy: string; isAI?: boolean };
  pendingChallengeAckByOwner?: boolean;
  // ── Cross-department appointment consent ──────────────────────────────────────────────────────
  // Set whenever a newly-appointed owner's real home department (per staffList) differs from this
  // Key Result's own department — three parties must consent before the appointment is considered
  // settled: the appointee themselves (via the existing pendingAcknowledgementFor/acknowledgeOkrItem
  // mechanism — not tracked again here), the appointee's own HOD, and their direct leave supervisor.
  // If either of the latter two rejects (optionally with a remark), the appointee is removed from
  // `owner` outright and `rejection` is set so the requesting HOD knows why and can reappoint.
  // Simplification: tracks one cross-department appointee at a time per Key Result — appointing more
  // than one cross-department owner in the same edit only tracks the last one detected.
  crossDeptApproval?: {
    appointee: string;
    requestedBy: string;
    // Subset of [the appointee's HOD, their direct leave supervisor] still owing a decision —
    // de-duplicated, so someone who is both isn't asked twice.
    pendingFrom: string[];
    rejection?: { by: string; reason?: string; date: string };
  };
  // ── Mandatory rationale on a below-green Quarterly Score ──────────────────────────────────────
  // Same shape and lifecycle as the Monthly Confidence challengeRemark above, but triggered by the
  // owner submitting a quarterly score under 0.7 rather than a red/amber confidence — the app
  // requires a short note on the rationale/challenges/support needed before the score is accepted.
  // Kept as its own separate cycle (not merged with challengeRemark) since confidence and score are
  // submitted at different cadences and could plausibly both be open on the same Key Result at once.
  scoreRemark?: { text: string; date: string; score: number };
  pendingScoreResponseFor?: string[];
  scoreResponse?: { text: string; date: string; respondedBy: string; isAI?: boolean };
  pendingScoreAckByOwner?: boolean;
}

// An Objective — either the department's overarching OKRs (level "department") or one of
// potentially several team-level OKR sets a HOD can stand up for a large department (level "team",
// grouped and labelled by teamName, e.g. "Human Capital's OKRs" / "Learning & Development's OKRs").
// A team-level Objective must link to a department-level Objective or one of its Key Results
// (linkedTo), and its owner must be a leave supervisor/team lead, who gets propose-edit rights on
// their own set (HOD approves). `progress`/`weightage`/`ragQ1-4` are the pre-existing
// manually-tracked fields kept for backward compatibility with the admin dept-goal editor;
// `weightage` is no longer surfaced anywhere in the OKR UI. `keyResults` is the OKR layer proper.
export interface DeptGoal {
  id: string;
  title: string;
  description?: string;
  owner: string;
  progress: number;
  weightage?: number;
  dueDate?: string;
  ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string;
  level?: "department" | "team"; // undefined treated as "department" (pre-OKR seed data)
  teamName?: string; // team-level only
  linkedTo?: string; // team-level only — id of a department-level DeptGoal or KeyResult
  // Optional link up to a 2026 Philly Group OKR (src/lib/phillyGroupOkrs.ts) — any department's
  // Objective can point at one Philly Group Key Result to show how its work ladders up to the
  // group level. linkedPhillyKrId is only meaningful alongside linkedPhillyGoalId.
  linkedPhillyGoalId?: string;
  linkedPhillyKrId?: string;
  // See KeyResult.lastTouchedDate — same meaning, at the Objective level, drives the same
  // "recently updated" highlight.
  lastTouchedDate?: string;
  keyResults?: KeyResult[];
  assignedDate?: string;
  // See KeyResult.pendingAcknowledgementFor — same meaning, at the Objective level.
  pendingAcknowledgementFor?: string[];
  // See KeyResult.pendingChangeType — same meaning, at the Objective level.
  pendingChangeType?: "assignment" | "hodEdit" | "hodScore";
  ackPenaltyApplied?: boolean;
  // proposedBy is the specific owner who submitted this — on a multi-owner Key Result, the review UI
  // must attribute the request to just this one person, not imply every owner asked for the change.
  counterProposal?: { title?: string; description?: string; dueDate?: string; proposedDate: string; proposedBy: string };
  lastCounterRejection?: { reason?: string; date: string };
}

// Department-level Objectives — HCWM runs a deliberately lean set of 4 (d1-d3 + d6), per the
// 2026-08-15 OKR simplification: fewer, better-resourced Objectives instead of 6 thin ones. d1-d3
// keep their original 2026-08-01-revamp titles; each now carries a fuller, brokerage/financial-
// institution-flavoured set of Key Results (IBF certification tracks, dealing-desk/relationship-
// manager tooling, MAS-adjacent governance) so ownership spreads realistically across the team
// instead of concentrating in 1-2 Key Results per Objective. d6 (AI transformation) is unchanged —
// "the final one" retained as-is. Plus a team-level set (d7/d8) for Sarah's Learning & Development
// team, linked to d6.
//
// Ownership is deliberately spread so that, per the 2026-08-15 review, only Ethan Lam and Yara Yip
// fall under the 3-Key-Result minimum (surfaced in the Team OKRs page's "Team Members With
// Insufficient Goals" section) — every other person (Sarah Chen, Anabelle Tan, Belle Lim, Rhea Yee,
// Bryan Goh, Marcus Teo, Caleb Ong, Diana Eng) owns 3 or more Key Results across d1-d3/d6-d8.
export const departmentGoals: DeptGoal[] = [
  {
    id: "d1", title: "Build an AI-ready workforce that embraces innovation and continuous learning", owner: "Sarah Chen", progress: 18,
    description: "Give every business function — not just HC — the AI skills and confidence to adopt new tools fast.",
    level: "department", linkedPhillyGoalId: "pg3", linkedPhillyKrId: "pg3kr1",
    keyResults: [
      { id: "kr20", title: "Certify 50% of dealing, trading, and relationship-manager staff on AI-assisted client-suitability and trade-surveillance tools", owner: "Bryan Goh, Marcus Teo", dueDate: "2026-11-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-21" },
      { id: "kr21", title: "Roll out an AI-assisted onboarding and HR-helpdesk chatbot resolving 70% of new-hire queries without escalation", owner: "Diana Eng, Rhea Yee", dueDate: "2026-12-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-18" },
      { id: "kr22", title: "Achieve 65% completion of the IBF-aligned \"AI in Financial Services\" foundational course among Grade 3+ staff", owner: "Caleb Ong, Belle Lim", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-20",
        challengeRemark: { text: "Enrolment is lagging on the dealing desk — team bandwidth is stretched during quarter-end, and we're waiting on desk heads to free up training slots.", date: "2026-07-20", rag: "amber", submittedBy: "Caleb Ong" } },
    ],
  },
  {
    id: "d2", title: "Build a strong global talent pipeline to support regional growth and succession", owner: "Marcus Teo", progress: 25,
    level: "department", linkedPhillyGoalId: "pg3", linkedPhillyKrId: "pg3kr2",
    keyResults: [
      { id: "kr4", title: "Complete critical-role documentation (SOPs + handover notes) for 100% of Grade 3+ HC roles", owner: "Rhea Yee", dueDate: "2026-11-30", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-19" },
      { id: "kr5", title: "Digitise and standardise the internal document-routing and onboarding-logistics process across 2 additional network offices", owner: "Marcus Teo", dueDate: "2026-11-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-16" },
      { id: "kr23", title: "Build a succession-ready bench for 100% of Grade 5+ \"single point of failure\" brokerage and dealing roles", owner: "Bryan Goh, Caleb Ong", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-17" },
      { id: "kr24", title: "Launch an AI-assisted internal talent-marketplace matching tool, redeploying 15% of open Grade 3-4 roles internally before external hiring", owner: "Belle Lim, Yara Yip", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-14" },
    ],
  },
  {
    id: "d3", title: "Strengthen One Phillip culture through greater global collaboration and employee connectedness", owner: "Sarah Chen", progress: 12,
    level: "department", linkedPhillyGoalId: "pg4", linkedPhillyKrId: "pg4kr1",
    keyResults: [
      { id: "kr27", title: "Launch a cross-office \"One Phillip\" engagement series, reaching 3 network offices with a shared employee-connectedness pulse score", owner: "Belle Lim", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-25" },
      { id: "kr25", title: "Pilot an AI-powered internal culture and sentiment-pulse assistant across 100% of HC and Workplace Management staff", owner: "Diana Eng, Caleb Ong", dueDate: "2026-11-30", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-23" },
      { id: "kr26", title: "Grow participation in the cross-office mentoring and brokerage-desk shadowing programme by 25%", owner: "Rhea Yee, Bryan Goh", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-19" },
      { id: "kr28", title: "Achieve a top-quartile employee-connectedness pulse score across 100% of client-facing dealing and relationship-management teams", owner: "Marcus Teo, Diana Eng", dueDate: "2026-12-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-24" },
    ],
  },
  {
    // Grounded in the OKR Institute's AI-transformation framework (functional-level OKRs translate
    // AI strategy into department commitments) and AIHR's guidance to avoid "safe," input-only HR
    // OKRs (training/policy counts) in favour of real outcome metrics. kr15/kr16 added per IHRP's
    // Jobs Skills Insight Report direction and MOM's HR Industry Transformation Plan (agentic-AI
    // governance as a named 2026 HR competency gap) and 2026 global-mobility/employer-branding
    // research on bridging HQ and regional network offices (Frazer Jones, ChapmanCG, SeamlessHR).
    id: "d6", title: "Embed AI Across the Human Capital Lifecycle", owner: "Sarah Chen", progress: 15,
    description: "Turn AI pilots into everyday practice across hiring, learning, and employee support, with consistent adoption across every network office.",
    level: "department",
    keyResults: [
      { id: "kr10", title: "Cut average time-to-shortlist by 30% using AI-assisted screening", owner: "Rhea Yee", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "kr11", title: "70% of HC team actively using an approved AI tool weekly (usage, not just training completion)", owner: "Belle Lim", dueDate: "2026-10-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "kr12", title: "Launch an AI-assisted internal Q&A assistant, resolving 40% of routine HC queries without escalation", owner: "Sarah Chen", dueDate: "2026-12-15", ragConfidence: "red", ragConfidenceUpdatedDate: "2026-06-24",
        challengeRemark: { text: "Blocked on IT security sign-off for the assistant's access to HR system data — need Infosec's approval before we can move past the pilot sandbox.", date: "2026-06-24", rag: "red", submittedBy: "Sarah Chen" } },
      { id: "kr15", title: "Certify 75% of the HC team on agentic-AI governance, data ethics, and prompt literacy for HR use cases", owner: "Anabelle Tan", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "kr16", title: "Launch a cross-office HR ambassador programme linking 3 regional network offices, lifting internal employer-brand consistency and shared-culture pulse-survey scores by 15%", owner: "Sarah Chen", dueDate: "2026-12-15", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
    ],
  },
  {
    // Team-level OKR set for Sarah's department — Learning & Development, owned by Anabelle Tan
    // (Senior Manager, L&D — the natural leave-supervisor/team-lead fit). Linked to d1, not d6:
    // d7's own KRs (org-wide people-manager certification) are the delivery scope of d1 ("AI-ready
    // workforce" across the whole business), not d6 (HC's own internal transformation) — d1's own
    // kr1 was removed since d7 now serves as that contributing team objective in its place, per the
    // OKR convention that a contributing "key result" of an overarching objective can itself be
    // another team's full objective. Title/description deliberately frame this as L&D's bounded
    // delivery of a curriculum, not a claim on the org's whole AI-fluent culture — that outcome
    // belongs to d1 itself, not to any one team under it.
    id: "d7", title: "Deliver the AI-Fluency Curriculum for People Managers", owner: "Anabelle Tan", progress: 20,
    description: "L&D's delivery arm for the company's AI-readiness push: build and run the curriculum that gets people managers certified.",
    level: "team", teamName: "Learning & Development", linkedTo: "d1",
    keyResults: [
      { id: "kr13", title: "80% of people managers complete AI-fluency certification, verified by a practical assessment (not attendance)", owner: "Anabelle Tan", dueDate: "2026-10-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "kr14", title: "Launch 3 AI-augmented microlearning modules on the Skills Marketplace with ≥70% completion rate", owner: "Anabelle Tan, Belle Lim", dueDate: "2026-11-15", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-06-24" },
    ],
  },
  {
    // A second, distinct L&D team-level set (grouped with d7 under the same "Learning & Development's
    // OKRs" header) — the hands-on, practical-skills arm (prompt engineering, agentic AI, building
    // agents) for HC's OWN workflows, correctly scoped under d6 (HC's internal AI transformation)
    // rather than d1's org-wide delivery scope, which is where d7 sits instead.
    id: "d8", title: "Build Practical AI-Agent Fluency in L&D", owner: "Anabelle Tan", progress: 10,
    description: "Move beyond AI awareness to hands-on capability: prompt-writing, agentic-AI patterns, and building simple AI agents for HC's own workflows.",
    level: "team", teamName: "Learning & Development", linkedTo: "d6",
    keyResults: [
      { id: "kr17", title: "Certify 60% of the HC team on practical prompt-engineering fundamentals, verified by a hands-on assessment (not attendance)", owner: "Anabelle Tan", dueDate: "2026-11-30", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
      { id: "kr18", title: "Pilot 2 agentic-AI-built internal HR workflow agents (e.g. onboarding FAQ agent, leave-request triage agent) with active production usage", owner: "Anabelle Tan", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-06-24" },
    ],
  },
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
    avatar: "AS",
    rag: "amber",
    directManager: "Sarah Chen",
    pointsYTD: 95,
    joinDate: "2018-05-07",
    goals: [
      { id: "g1", title: "Deliver Q2 manager training", description: "Run 4 cohorts across all business units to lift manager effectiveness scores.", metric: "4/4 cohorts completed", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d1", weightage: 60, approved: false, submittedDate: "2026-06-10", remarks: mkRemarks(3, 2, ["Sarah Chen"]) },
      { id: "g2", title: "Build new hire portal", description: "Design and internally launch a self-service onboarding portal for all new hires.", metric: "Portal live by Aug", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"green"}], linkedDept: "d1", weightage: 40, approved: true, ragPendingApproval: "Q2", remarks: mkRemarks(2, 0, ["Sarah Chen"]) },
      { id: "g3", title: "Coaching certification", description: "Complete ICF Level 1 accredited coaching programme to strengthen people leadership.", metric: "ICF cert obtained", quarters: [{q:"Q2",rag:"amber"}], linkedDept: "d1", weightage: 30, approved: false, submittedDate: "2026-06-24", remarks: mkRemarks(1, 0, ["Sarah Chen"]) },
      { id: "g15", title: "Wellness programme oversight", description: "Coordinate wellness programme delivery across vendor onboarding, mental health first-aider training, and quarterly pulse surveys, ensuring milestones stay on track.", metric: "Programme milestones on track by Q3", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d3", weightage: 20, approved: true, remarks: mkRemarks(1, 0, ["Sarah Chen"]) },
    ],
  },
  {
    id: "u4",
    name: "Belle Lim",
    role: "Executive, Human Capital",
    avatar: "BY",
    rag: "amber",
    directManager: "Bryan Goh",
    pointsYTD: 155,
    joinDate: "1988-08-10",
    goals: [
      { id: "g11", title: "Wellness platform launch", description: "Lead Phase 1 delivery of the employee wellness platform including vendor onboarding.", metric: "Platform live by Sep", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"amber"}], linkedDept: "d3", weightage: 65, approved: false, submittedDate: "2026-06-29", remarks: mkRemarks(3, 2, ["Anabelle Tan", "Sarah Chen"]) },
      { id: "g12", title: "Mental health first-aider cohort", description: "Train 20 employees as certified Mental Health First Aiders across Singapore office.", metric: "20 MHFAs certified", quarters: [{q:"Q2",rag:"green"}], linkedDept: "d3", weightage: 10, approved: true, remarks: mkRemarks(1, 0, ["Anabelle Tan"]) },
      { id: "g13", title: "Quarterly wellness pulse", description: "Design and run quarterly employee wellness pulse survey and publish results dashboard.", metric: "4 pulse cycles per year", quarters: [{q:"Q1",rag:"green"},{q:"Q2",rag:"green"}], linkedDept: "d3", weightage: 5, approved: true, remarks: mkRemarks(2, 0, ["Anabelle Tan", "Sarah Chen"]) },
      { id: "g14", title: "Skills marketplace co-design", description: "Collaborate with L&D to co-design the skills tagging framework for the marketplace.", metric: "Framework signed off by Q3", quarters: [{q:"Q2",rag:"green"}], linkedDept: "d6", weightage: 50, approved: false, submittedDate: "2026-06-23", remarks: mkRemarks(1, 1, ["Anabelle Tan"]) },
    ],
  },
  // Real active HCWM staff from Staff Listing 2 (anonymized: surname kept, first name
  // randomized) — imported via scripts/sync-users-from-staff-listing.mjs. No goals have
  // been seeded for them; they surface here as "no goals set" placeholders alongside the
  // 3 hand-authored personas above.
  // 2026-07-31 cleanup: removed James Okafor, Bella Ong's team (incl. Bella herself, Executive
  // Secretary), Hazel Seah's team (a duplicate of Anabelle Tan's Learning & Development team, incl.
  // Elton Tay), every Cafeteria/Messenger role, and everyone reporting to "Loh Hoon Sun" / "Bong Wui
  // Chiat Lester" (neither of whom is an HCWM row themselves) — none of these had real dev/perf goal
  // data wired up, and they were cluttering the roster with duplicate/thin placeholder entries.
  { id: "u103", name: "Rhea Yee", role: "Executive, Human Capital", avatar: "RY", rag: "green", directManager: "Bryan Goh", pointsYTD: 0, joinDate: "1988-08-10", goals: [] },
  { id: "u120", name: "Bryan Goh", role: "Assistant Manager, Human Capital", avatar: "BG", rag: "green", directManager: "Sarah Chen", pointsYTD: 0, joinDate: "2008-08-11", goals: [] },
  { id: "u136", name: "Marcus Teo", role: "HR Business Partner", avatar: "MT", rag: "green", directManager: "Sarah Chen", pointsYTD: 0, joinDate: "2015-08-11", goals: [] },
  { id: "u171", name: "Caleb Ong", role: "Head, Workplace Management", avatar: "CO", rag: "green", directManager: "Sarah Chen", pointsYTD: 0, joinDate: "2022-09-28", goals: [] },
  { id: "u184", name: "Diana Eng", role: "Officer, Workplace Management", avatar: "DE", rag: "green", directManager: "Caleb Ong", pointsYTD: 0, joinDate: "2023-05-15", goals: [] },
  { id: "u228", name: "Ethan Lam", role: "Assistant Manager, Workplace Management", avatar: "EL", rag: "green", directManager: "Caleb Ong", pointsYTD: 0, joinDate: "2025-11-03", goals: [] },
  { id: "u242", name: "Yara Yip", role: "Executive, Human Capital", avatar: "YY", rag: "green", directManager: "Marcus Teo", pointsYTD: 0, joinDate: "2026-03-16", goals: [] },
];

export const myGoals = {
  performance: [
    { id: "p1", title: "Lift team engagement score +8pts", description: "Sustained quarter-on-quarter improvement.", metric: "+8 pts", rag: "green" as RAG, linkedDept: "d1" },
    { id: "p2", title: "Department attrition < 8%", description: "Annual.", metric: "<8%", rag: "amber" as RAG, linkedDept: "d2" },
    { id: "p3", title: "Launch P&C analytics dashboard", description: "Self-serve insights.", metric: "Q3 GA", rag: "green" as RAG, linkedDept: "d1" },
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
  { id: "pl1", userId: "u0", text: "Responded to James's Q2 remark", pts: 10, date: "2h ago", rawDate: "2026-06-29T10:00:00.000Z" },
  { id: "pl2", userId: "u0", text: "Sent compliment to Priya", pts: 25, date: "Yesterday", rawDate: "2026-06-28T09:00:00.000Z" },
  { id: "pl3", userId: "u0", text: "Completed action plan item", pts: 50, date: "3 days ago", rawDate: "2026-06-26T09:00:00.000Z" },
  { id: "pl4", userId: "u0", text: "Approved skill addition", pts: 5, date: "5 days ago", rawDate: "2026-06-24T09:00:00.000Z" },
  { id: "pl5", userId: "u0", text: "Goal RAG update (Q2)", pts: 10, date: "1 week ago", rawDate: "2026-06-22T09:00:00.000Z" },
];

export const corporateValues = [
  { id: "v1", name: "Role Model", icon: "🦸" },
  { id: "v2", name: "Learning Advocate", icon: "🎓" },
  { id: "v3", name: "Innovator", icon: "💡" },
  { id: "v4", name: "Integrity Icon", icon: "🛡️" },
  { id: "v5", name: "Strategic Builder", icon: "🧩" },
  { id: "v6", name: "Community Steward", icon: "🌳" },
  { id: "v7", name: "Brother's Keeper", icon: "🫂" },
  { id: "v8", name: "Positive-Sum Mindset", icon: "🌈" },
  { id: "v9", name: "Collaboration Catalyst", icon: "🤝" },
  { id: "v10", name: "Wellbeing Champion", icon: "🧘" },
];

export const colleagues = ["Anabelle Tan", "Belle Lim", "Bryan Goh", "Nadia Yong", "Victor Lai", "Marcus Ko"];

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
  { name: "Bryan Goh", dept: "Human Capital & Workplace Management", jobFamily: "Human Capital", role: "Assistant Manager, Human Capital", grade: 5, join: "17 years ago", supervisor: "Sarah Chen", hod: false },
  { name: "Nadia Yong", dept: "Credit Risk Management", jobFamily: "Credit Risk", role: "Head, Credit Risk", grade: 6, join: "5 years ago", supervisor: "—", hod: true },
  { name: "Victor Lai", dept: "Credit Risk Management", jobFamily: "Credit Risk", role: "Manager, Credit Risk", grade: 5, join: "11 years ago", supervisor: "Nadia Yong", hod: false },
  { name: "Marcus Ko", dept: "Credit Risk Management", jobFamily: "Credit Risk", role: "Executive, Credit Risk", grade: 3, join: "3 years ago", supervisor: "Victor Lai", hod: false },
];

// ── Activity catalog ─────────────────────────────────────────────────────────

// Supporting-certificate metadata attached when a skill is submitted for verified-skill approval.
// No backend file storage exists in this app — objectUrl is a browser-local blob URL, not a
// persisted upload.
export interface SkillAttachment {
  fileName: string;
  fileSizeKB: number;
  fileType: string;
  objectUrl: string;
}

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

// Canonical labels + iteration order for Activity's category/audience fields — shared by
// AdminSection.tsx's Activity Management UI and activityImportExport.ts's Excel/CSV export+import,
// so the two never drift apart.
export const CATEGORY_LABELS: Record<Activity["category"], string> = {
  goal: "Goal",
  recognition: "Recognition",
  skill: "Skill",
  engagement: "Engagement",
  penalty: "Penalty",
};
export const CATEGORY_ORDER: Activity["category"][] = ["goal", "recognition", "skill", "engagement", "penalty"];

export const AUDIENCE_LABELS: Record<Activity["audience"], string> = {
  all: "All Staff",
  manager: "Managers & HODs",
  hod: "HODs Only",
};
export const AUDIENCE_ORDER: Activity["audience"][] = ["all", "manager", "hod"];

export const defaultActivities: Activity[] = [
  {
    // Performance goals are now Key Results assigned by the HOD, not self-proposed — this describes
    // the actual enforced rule (sweepNewJoinerPenalty in appContext.tsx): the report's *direct
    // supervisor*, not the report themselves, is penalized if the report doesn't reach 3 owned
    // performance goals by 30 days + 7 working days after joining.
    id: "act1", name: "Ensure a new report reaches 3 assigned performance goals (within 30 days of joining + 7 working days)", points: 0,
    isCompulsory: true, audience: "manager", category: "goal", live: true,
    timelineDays: 37, timelineTrigger: "report's 30-day join anniversary",
    penaltyPoints: 15,
  },
  {
    // Points are earned once only, for a user's very first development goal — every subsequent
    // one is unpaid at creation time (points instead come from getting the resulting skill
    // approved onto the verified profile — see "Skill approved and verified on your profile").
    id: "act2", name: "Add your first development goal (within 30 days of joining)", points: 10,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 30, timelineTrigger: "joining the company",
    penaltyPoints: 30,
  },
  {
    // Credits the skill's owner, not whoever approved it — fires whether the skill came from a
    // completed development goal, the Skills Catalog, or the Development Roadmap; they all funnel
    // through the same pending → verified approval step.
    id: "act5", name: "Skill approved and verified on your profile", points: 5,
    isCompulsory: false, audience: "all", category: "skill", live: true,
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
    id: "act10", name: "Endorse a pending skill submission", points: 5,
    isCompulsory: true, audience: "manager", category: "skill", live: true,
    timelineDays: 7, timelineTrigger: "team member submits a skill for endorsement",
    penaltyPoints: 10,
  },
  {
    // Points only apply for a user's first development goal (see act2) — this still carries its
    // own timeline/penalty for setting a due date regardless of whether points were earned.
    id: "act13", name: "Add a recommended skill/certification as a development goal", points: 10,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 7, timelineTrigger: "adding a recommended item from your Development Roadmap without a due date",
    penaltyPoints: 5,
  },
  {
    id: "act14", name: "Submit a recommended skill/certification for approval", points: 0,
    isCompulsory: false, audience: "all", category: "skill", live: true,
  },
  {
    id: "act15", name: "Respond to a recommended development goal", points: 0,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 7, timelineTrigger: "HOD or direct leave supervisor recommends a development goal",
    penaltyPoints: 5,
  },
  {
    // Recommended cadence, not a hard per-instance deadline — owners get a Pending Actions nudge
    // when it's been over 30 calendar days since their last update, but there's no automatic
    // point penalty for this one (see act19 for the compulsory, penalized quarterly counterpart).
    id: "act18", name: "Update your performance goal's RAG confidence (monthly)", points: 0,
    isCompulsory: false, audience: "all", category: "goal", live: true,
  },
  {
    id: "act19", name: "Score your performance goal (quarterly)", points: 0,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 10, timelineTrigger: "the last working day of the first week in the next month after the current quarter",
    penaltyPoints: 15,
  },
  {
    // New: a shared (multi-owner) performance goal's confidence/score is only finalized once every
    // owner agrees — this covers the "respond to your co-owner" side of that reconciliation. No
    // penalty (mirrors act18): the compulsory, penalized deadline is still only the quarterly score
    // itself (act19), which co-owners are exempted from only once they've actually aligned.
    id: "act25", name: "Respond to a co-owner's proposed confidence/score update on a shared performance goal", points: 0,
    isCompulsory: false, audience: "all", category: "goal", live: true,
  },
  {
    // Reflects the HCWM AI-transformation Objective's (d6) new agentic-AI upskilling Key Result —
    // grounded in IHRP's Jobs Skills Insight Report direction and MOM's HR Industry Transformation
    // Plan (see d6's KR15 in departmentGoals above).
    id: "act20", name: "Complete Agentic AI for HR Fundamentals", points: 15,
    isCompulsory: false, audience: "all", category: "skill", live: true,
  },
  {
    // New HOD-level SLA: every HOD must have set at least 3 department-level Objectives, each with
    // at least 3 Key Results, by the last working day of January — enforced in
    // checkOverduePenalties (appContext.tsx) via getJanuaryDeadline (utils.ts).
    id: "act21", name: "Set at least 3 department Objectives, each with at least 3 Key Results (by the last working day of January)", points: 0,
    isCompulsory: true, audience: "hod", category: "penalty", live: true,
    timelineTrigger: "start of the calendar year",
    penaltyPoints: 10,
  },
  {
    // Fills a real catalog gap — this SLA (sweepOkrAck in appContext.tsx) was already enforced but
    // had no matching Activity entry. Covers the original appointment ack and any later HOD edit or
    // score override (pendingChangeType), since all three re-open the same pendingAcknowledgement flag.
    id: "act22", name: "Acknowledge a performance goal appointment or HOD update (within 7 working days)", points: 0,
    isCompulsory: true, audience: "all", category: "goal", live: true,
    timelineDays: 7, timelineTrigger: "HOD appoints you as owner, or edits/overrides the score of, an Objective or performance goal",
    penaltyPoints: 5,
  },
  {
    // A supervisor sends this from Team At A Glance when a direct (or indirect) report has just
    // completed a development goal — rewards the act of noticing and encouraging, on top of
    // whatever points the report already earned for the goal itself.
    id: "act23", name: "Sent an encouragement note", points: 5,
    isCompulsory: false, audience: "all", category: "recognition", live: true,
  },
  {
    id: "act24", name: "Received an encouragement note", points: 5,
    isCompulsory: false, audience: "all", category: "recognition", live: true,
  },
];
