import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workingDaysSince, effectiveKrScoreDueDate, newJoinerGoalDeadlinePassed, keyResultsOwnedBy, getJanuaryDeadline, ownerNames, isAmongOwners, hasPendingAck } from "./utils";
import type { Tier, TeamMember, RAG, PersonalDevGoal, Activity, Goal, SkillAttachment, GoalEditProposal, DeptGoal, KeyResult } from "./mockData";
import {
  currentUser as _currentUser,
  departmentGoals as _departmentGoals,
  teamMembers as _teamMembers,
  myGoals as _myGoals,
  staffInitialDevGoals as _staffInitialDevGoals,
  adminInitialDevGoals as _adminInitialDevGoals,
  skills as _skills,
  jobMatches as _jobMatches,
  surveyData as _surveyData,
  anabelleSurveyData as _anabelleSurveyData,
  actionPlanItems as _actionPlanItems,
  rewardsCatalog as _rewardsCatalog,
  pointsLog as _pointsLog,
  corporateValues as _corporateValues,
  onboardingMilestones as _onboardingMilestones,
  devMilestones as _devMilestones,
  staffList as _staffList,
  colleagues as _colleagues,
  defaultActivities as _defaultActivities,
} from "./mockData";
import {
  opsCurrentUser,
  opsDepartmentGoals as _opsDepartmentGoals,
  opsTeamMembers as _opsTeamMembers,
  opsHodDevGoals as _opsHodDevGoals,
  opsMgr1DevGoals as _opsMgr1DevGoals,
  opsMgr2DevGoals as _opsMgr2DevGoals,
  opsHodSkills, opsMgr1Skills, opsMgr2Skills,
  opsHodJobMatches, opsMgr1JobMatches, opsMgr2JobMatches,
  opsMgr1User, opsMgr2User,
  opsAllTeamMemberSkills as _opsAllTeamMemberSkills,
  opsHodDevMilestones, opsMgr1DevMilestones, opsMgr2DevMilestones,
  opsHodSurveyData, opsMgr1SurveyData,
} from "./opsData";
import { DIRECTOR_PERSONAS } from "./directorData";
import { marketingGoalSkills } from "./marketingData";
import {
  COMPLIANCE_DEPT_NAME,
  complianceDepartmentGoals,
  complianceTeamMembers,
  complianceAllMemberSkills,
  complianceGoalSkills,
} from "./complianceData";
import type { CheckIn } from "./checkIns";
import type { PulseResponse } from "./pulseSurvey";
import type { ManagerEffectivenessRating } from "./managerEffectiveness";
import type { AiActivityLogEntry } from "./aiActivity";
import {
  seedCheckIns as _seedCheckIns,
  seedPulseResponses as _seedPulseResponses,
  seedManagerRatings as _seedManagerRatings,
  seedAiActivityLog as _seedAiActivityLog,
} from "./checkInSeedData";
import {
  getAppData,
  resolveRemarkFn,
  addPendingSkillFn,
  redeemRewardFn,
  toggleActionPlanFn,
  logComplimentFn,
  updateDepartmentGoalsFn,
  endorseTeamMemberSkillFn,
  rejectPendingSkillFn,
} from "./api/data.functions";

type AppData = Awaited<ReturnType<typeof getAppData>>;

// A HOD/direct leave supervisor's recommended development goal, awaiting the team member's
// acknowledgement or decline before it is published to their Development Goals list.
export interface DevGoalRecommendation {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  recommendedBy: string;
  recommendedDate: string; // ISO "YYYY-MM-DD"
  penaltyApplied?: boolean; // true once the 7-working-day non-response penalty has actually been deducted
}
export interface DeclinedDevGoalRecommendation extends DevGoalRecommendation {
  declinedDate: string;
  reason: string;
}

// A HOD/direct leave supervisor's recommended *performance* goal — distinct from an Objective/KR
// appointment. `linkedTo` is an id from flattenOkrOptions (an Objective or Key Result) purely for
// reference/context; accepting a recommendation never appoints the recommendee as an owner of
// whatever it's linked to. Same acknowledge-or-decline lifecycle as DevGoalRecommendation above.
export interface PerfGoalRecommendation {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  linkedTo: string; // "" if not linked to any Objective/KR
  recommendedBy: string;
  recommendedDate: string;
  penaltyApplied?: boolean;
}
export interface AcknowledgedPerfGoalRecommendation extends PerfGoalRecommendation {
  acknowledgedDate: string;
}
export interface DeclinedPerfGoalRecommendation extends PerfGoalRecommendation {
  declinedDate: string;
  reason: string;
}

export interface OpsMeta {
  personaId: "u21" | "u22" | "u23";
  user: { name: string; department: string; designation: string; grade: number; hod: boolean; avatar: string; pointsYTD: number; joinDate: string; tenureYears: number; email: string; };
  performanceGoals: Array<{ id: string; title: string; description: string; metric: string; rag: RAG; linkedDept: string }>;
  devGoals: PersonalDevGoal[];
  upsertDevGoal: (goal: PersonalDevGoal) => void;
  deleteDevGoal: (id: string) => void;
  skills: { verified: string[]; pending: string[] };
  jobMatches: Array<{ id: string; title: string; dept: string; match: number; url: string }>;
  milestones: Array<{ id: string; name: string; date: string; complete: boolean; type: string }>;
  teamMembers?: TeamMember[];
  departmentGoals?: DeptGoal[];
}

// A director's real identity — deliberately thin (no personal KRs/dev-goals/skills, unlike
// OpsMeta) since directors own no department's OKR content of their own in this data model; their
// real leave-supervisor relationship to one or more HODs (per users.csv) is what actually drives
// their dashboard, via getRelevantDeptsForViewer (src/lib/insights.ts) rather than anything here.
export interface DirectorViewMeta {
  personaId: string;
  name: string;
  department: string;
  designation: string;
  avatar: string;
}

interface AppCtx {
  tier: Tier;
  setTier: (t: Tier) => void;
  section: string;
  setSection: (s: string) => void;
  isLoading: boolean;
  points: number;
  staffPoints: number;
  adminPoints: number;
  addPoints: (n: number) => void;
  awardMemberPoints: (memberId: string, n: number) => void;
  focusedTeamMemberId: string | null;
  setFocusedTeamMemberId: (id: string | null) => void;
  // When a team member's drawer is opened from the Home page's "Team at a Glance" section, closing
  // it should return the viewer to Home rather than leaving them stranded on the Team OKRs page they
  // never navigated to on purpose. Single-shot: set true right before the navigating setSection
  // ("team") call, consumed and reset by the drawer's onClose.
  teamMemberDrawerReturnHome: boolean;
  setTeamMemberDrawerReturnHome: (v: boolean) => void;
  focusedSkillsMemberId: string | null;
  setFocusedSkillsMemberId: (id: string | null) => void;
  // data
  teamMemberPendingSkills: { memberId: string; memberName: string; pending: string[]; verified: string[]; notifiedDate?: string }[];
  allTeamMemberSkills: { memberId: string; memberName: string; verified: string[]; pending: string[] }[];
  endorseTeamMemberSkill: (memberId: string, skill: string) => Promise<void>;
  rejectTeamMemberSkill: (memberId: string, skill: string) => Promise<void>;
  currentUser: AppData["currentUser"];
  departmentGoals: DeptGoal[];
  teamMembers: TeamMember[];
  myGoals: AppData["myGoals"];
  skills: AppData["skills"];
  jobMatches: AppData["jobMatches"];
  surveyData: AppData["surveyData"];
  actionPlanItems: AppData["actionPlanItems"];
  rewardsCatalog: AppData["rewardsCatalog"];
  updateRewardCatalogItem: (id: string, changes: { name?: string; points?: number }) => void;
  pointsLog: AppData["pointsLog"];
  corporateValues: AppData["corporateValues"];
  onboardingMilestones: AppData["onboardingMilestones"];
  devMilestones: AppData["devMilestones"];
  staffList: AppData["staffList"];
  disabledStaffList: AppData["disabledStaffList"];
  colleagues: string[];
  staffMemberId: string;
  setStaffMemberId: (id: string) => void;
  adminMemberId: string;
  setAdminMemberId: (id: string) => void;
  staffDevGoals: PersonalDevGoal[];
  adminDevGoals: PersonalDevGoal[];
  managerDevGoals: PersonalDevGoal[];
  upsertStaffDevGoal: (goal: PersonalDevGoal) => void;
  deleteStaffDevGoal: (id: string) => void;
  upsertAdminDevGoal: (goal: PersonalDevGoal) => void;
  deleteAdminDevGoal: (id: string) => void;
  upsertManagerDevGoal: (goal: PersonalDevGoal) => void;
  deleteManagerDevGoal: (id: string) => void;
  // Dev goals for team members outside the switchable staff/admin/manager/ops personas
  teamDevGoalsById: Record<string, PersonalDevGoal[]>;
  upsertTeamDevGoal: (memberId: string, goal: PersonalDevGoal) => void;
  deleteTeamDevGoal: (memberId: string, id: string) => void;
  updateGoalRag: (memberId: string, goalId: string, quarter: "Q1" | "Q2" | "Q3" | "Q4", rag: RAG) => void;
  addGoalRemark: (memberId: string, goalId: string, author: string, text: string) => void;
  modifyGoal: (memberId: string, goalId: string, changes: Partial<{ title: string; description: string; metric: string; linkedDept: string; weightage: number }>, andApprove: boolean) => void;
  proposeGoal: (memberId: string, goal: { title: string; description: string; metric: string; linkedDept: string }) => void;
  approveGoal: (memberId: string, goalId: string) => void;
  acknowledgeGoal: (memberId: string, goalId: string) => void;
  // HOD recommends a brand-new performance goal to one or more team members, linked to a
  // specific department goal — lands approved but pending the member's acknowledgement.
  recommendGoal: (memberIds: string[], goal: { title: string; description: string; metric: string; linkedDept: string }, recommendedBy: string) => void;
  // A direct (non-HOD) supervisor's or a staff member's proposed change to an existing performance
  // goal — held here until the HOD approves/rejects it; the live goal is untouched until then.
  pendingGoalEditProposals: GoalEditProposal[];
  proposeGoalEdit: (input: Omit<GoalEditProposal, "id" | "proposedDate" | "penaltyApplied">) => void;
  resolveGoalEditProposal: (id: string) => void;
  // HOD/direct leave supervisor recommends a development goal — held here until the team member
  // acknowledges (publishing it to their dev goals) or declines (with a mandatory reason).
  pendingDevGoalRecs: Record<string, DevGoalRecommendation[]>;
  declinedDevGoalRecs: Record<string, DeclinedDevGoalRecommendation[]>;
  recommendDevGoal: (memberId: string, rec: { title: string; description: string; dueDate: string; recommendedBy: string }) => void;
  acknowledgeDevGoalRec: (memberId: string, recId: string) => void;
  declineDevGoalRec: (memberId: string, recId: string, reason: string) => void;
  // Same acknowledge-or-decline lifecycle as above, for HOD/leave-supervisor-recommended
  // *performance* goals — linkage to an Objective/KR is reference-only, never an ownership grant.
  pendingPerfGoalRecs: Record<string, PerfGoalRecommendation[]>;
  acknowledgedPerfGoalRecs: Record<string, AcknowledgedPerfGoalRecommendation[]>;
  declinedPerfGoalRecs: Record<string, DeclinedPerfGoalRecommendation[]>;
  recommendPerfGoal: (memberId: string, rec: { title: string; description: string; dueDate: string; linkedTo: string; recommendedBy: string }) => void;
  acknowledgePerfGoalRec: (memberId: string, recId: string) => void;
  declinePerfGoalRec: (memberId: string, recId: string, reason: string) => void;
  // HOD-tagged "skills needed" per department/team goal — keyed by goal id, unique across every
  // department's goal set. Feeds the admin Organisational Competency Gaps computation.
  deptGoalSkills: Record<string, string[]>;
  updateGoalSkills: (goalId: string, skills: string[]) => void;
  // 1:1 check-ins, Team Pulse, Manager Effectiveness, AI Activity Log — see checkIns.ts/
  // pulseSurvey.ts/managerEffectiveness.ts/aiActivity.ts for the full rationale on each.
  checkIns: CheckIn[];
  addCheckIn: (checkIn: Omit<CheckIn, "id">) => void;
  toggleCheckInActionItem: (checkInId: string, itemId: string) => void;
  pulseResponses: PulseResponse[];
  submitPulseResponse: (response: Omit<PulseResponse, "id">) => void;
  managerEffectivenessRatings: ManagerEffectivenessRating[];
  submitManagerEffectivenessRating: (rating: Omit<ManagerEffectivenessRating, "id">) => void;
  aiActivityLog: AiActivityLogEntry[];
  logAiActivity: (entry: Omit<AiActivityLogEntry, "id">) => void;
  // Development goals added from a Development Roadmap recommendation, awaiting a due date —
  // flagged for highlighting in the UI and subject to the same 7-working-day penalty SLA.
  pendingDueDateGoals: { memberId: string; goalId: string; createdDate: string; penaltyApplied?: boolean }[];
  flagGoalPendingDueDate: (memberId: string, goalId: string) => void;
  clearPendingDueDate: (goalId: string) => void;
  // Credit Risk Management equivalents of `departmentGoals` / `allTeamMemberSkills`, exposed
  // unconditionally (not tier-gated) so admin-level, org-wide computations can see every department at once.
  opsDepartmentGoals: DeptGoal[];
  opsAllTeamMemberSkills: { memberId: string; memberName: string; verified: string[]; pending: string[] }[];
  // Credit Risk Management team roster (with goals/remarks), exposed unconditionally for org-wide
  // admin computations (e.g. Key Staff Challenges) that need to see every department's data at once.
  opsTeamMembersAll: TeamMember[];
  // HCWM's own mirror of the two above — exposed unconditionally too (not just "whatever
  // `departmentGoals`/`teamMembers` currently resolve to", which flips to Credit Risk Management's
  // data whenever the viewer is on an ops tier). Needed so a HOD/Director insights view (Key Staff
  // Challenges, Departmental Competency Gap) can look up *any* wired department's data by name
  // regardless of which persona the viewer currently is.
  hcwmTeamMembers: TeamMember[];
  hcwmDepartmentGoals: DeptGoal[];
  hcwmAllTeamMemberSkills: { memberId: string; memberName: string; verified: string[]; pending: string[] }[];
  // mutations
  resolveRemark: (remarkId: string) => Promise<void>;
  addPendingSkill: (skill: string, attachment?: SkillAttachment) => Promise<void>;
  skillAttachments: Record<string, SkillAttachment & { viewed: boolean }>;
  markAttachmentViewed: (memberId: string, skill: string) => void;
  devGoalAttachments: Record<string, SkillAttachment>;
  attachDevGoalCertificate: (goalId: string, attachment: SkillAttachment) => void;
  redeemReward: (cost: number, name: string) => Promise<void>;
  toggleActionPlanItem: (id: string, done: boolean) => Promise<void>;
  logCompliment: (recipient: string) => Promise<void>;
  saveDepartmentGoals: (goals: { id: string; title: string; owner: string; progress: number; weightage: number; dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string }[]) => Promise<void>;
  // OKR CRUD — Objectives (department/team-level DeptGoal entries) and their Key Results
  addObjective: (
    objective: Omit<DeptGoal, "id" | "assignedDate" | "pendingAcknowledgementFor" | "keyResults"> & {
      keyResults?: Omit<KeyResult, "id" | "assignedDate" | "pendingAcknowledgementFor">[];
    },
    isOps: boolean,
  ) => void;
  // actingOnBehalfOfHod: set only when a Director (not the department's real HOD) is making this
  // edit — their real HOD is added to the pending-acknowledgement list regardless of whether the
  // normal owner-reacknowledgement rules would have included them, since a director's changes are
  // never self-executing (see appContext.tsx's own comment on updateObjective for the full reasoning).
  updateObjective: (objectiveId: string, changes: Partial<DeptGoal>, isOps: boolean, requestedBy?: string, actingOnBehalfOfHod?: string) => void;
  renameTeam: (oldName: string, newName: string, isOps: boolean) => void;
  deleteObjective: (objectiveId: string, isOps: boolean) => void;
  // requestedBy is who's making the appointment — used to detect a cross-department owner (their
  // real staffList department differs from this KR's own) and, if so, kick off the 3-party consent
  // workflow (see crossDeptApproval on KeyResult) instead of just the appointee's own acknowledgement.
  addKeyResult: (objectiveId: string, kr: Omit<KeyResult, "id" | "assignedDate" | "pendingAcknowledgementFor">, isOps: boolean, requestedBy: string, actingOnBehalfOfHod?: string) => void;
  updateKeyResult: (objectiveId: string, krId: string, changes: Partial<KeyResult>, isOps: boolean, requestedBy: string, actingOnBehalfOfHod?: string) => void;
  deleteKeyResult: (objectiveId: string, krId: string, isOps: boolean) => void;
  // The appointee's HOD or direct leave supervisor accepts/rejects a cross-department appointment —
  // see respondToCrossDeptAppointment's own comment for the reject-removes-the-owner behaviour.
  respondToCrossDeptAppointment: (
    objectiveId: string, krId: string, responderName: string,
    decision: "accept" | "reject", reason: string | undefined, isOps: boolean,
  ) => void;
  // viewerName is whichever owner is acknowledging — only their name is cleared from
  // pendingAcknowledgementFor, so a co-owner who hasn't acted yet stays pending.
  acknowledgeOkrItem: (objectiveId: string, krId: string | null, viewerName: string, isOps: boolean) => void;
  proposeOkrCounter: (objectiveId: string, krId: string | null, counter: { title?: string; description?: string; dueDate?: string }, isOps: boolean, proposedBy: string) => void;
  resolveOkrCounter: (
    objectiveId: string, krId: string | null,
    resolution: { type: "accept" } | { type: "reject"; reason?: string } | { type: "modify"; changes: { title?: string; owner?: string; dueDate?: string } },
    isOps: boolean,
    resolvedBy?: string,
  ) => void;
  // proposedBy is the acting owner's name — used to route multi-owner KRs through the co-owner
  // reconciliation flow instead of writing directly (see pendingCoOwnerConfidence/pendingCoOwnerScore).
  // challengeText is required by the UI whenever ragConfidence is red/amber (see challengeRemark on
  // KeyResult) — routes to the Objective owner(s) + HOD for a response.
  updateKeyResultConfidence: (objectiveId: string, krId: string, ragConfidence: RAG, proposedBy: string, isOps: boolean, challengeText?: string) => void;
  // scoreRemarkText is required by the UI whenever score is below 0.7 (see scoreRemark on
  // KeyResult) — same Objective owner(s) + HOD routing as the confidence challenge above.
  submitKeyResultScore: (objectiveId: string, krId: string, score: number, proposedBy: string, isOps: boolean, scoreRemarkText?: string) => void;
  // A co-owner agrees with the other owner's proposed confidence/score — finalizes it.
  agreeCoOwnerConfidence: (objectiveId: string, krId: string, isOps: boolean) => void;
  agreeCoOwnerScore: (objectiveId: string, krId: string, isOps: boolean) => void;
  // HOD or the Objective's own owner responds to an open challengeRemark — manual text, or
  // AI-drafted (isAI) via the "Ask Pulse AI to help draft this" affordance. Flips the ball to the
  // KR owner, who must then acknowledge it via acknowledgeChallengeResponse.
  respondToChallengeRemark: (objectiveId: string, krId: string, responseText: string, respondedBy: string, isOps: boolean, isAI?: boolean) => void;
  // Same shape, for the below-green quarterly-score remark cycle instead of the confidence one.
  respondToScoreRemark: (objectiveId: string, krId: string, responseText: string, respondedBy: string, isOps: boolean, isAI?: boolean) => void;
  acknowledgeScoreResponse: (objectiveId: string, krId: string, isOps: boolean) => void;
  acknowledgeChallengeResponse: (objectiveId: string, krId: string, isOps: boolean) => void;
  // HOD-only score override (post-submission) — highlights the score for the owner until they
  // acknowledge it via acknowledgeOkrItem (see pendingChangeType on KeyResult/DeptGoal).
  overrideKeyResultScore: (objectiveId: string, krId: string, score: number, isOps: boolean, scoreRemarkText?: string) => void;
  // Delegated team-OKR editor / secondary owner — one leave supervisor per team-level OKR set
  // (keyed by teamName), resolved for the current viewer's own department; a missing key means no
  // one is granted for that set yet.
  teamOkrEditors: Record<string, string>;
  setTeamOkrEditor: (teamName: string, name: string, isOps: boolean) => void;
  // HOD-editable override for the "Team Members With Insufficient Goals" box label (keyed by leadName).
  teamBoxNames: Record<string, string>;
  renameTeamBox: (leadName: string, newName: string, isOps: boolean) => void;
  // Manager input on team member dev goals — keyed "memberId:goalId"
  managerInputs: Record<string, string>;
  saveManagerInput: (memberId: string, goalId: string, text: string) => void;
  // Acknowledgement for manager dev-goal feedback
  acknowledgedManagerInputs: Record<string, boolean>;
  acknowledgeManagerFeedback: (memberId: string, goalId: string) => void;
  // Nudge state — goal IDs nudged by staff, so supervisor sees them at top of pending actions
  nudgedGoalIds: Set<string>;
  nudgeGoal: (goalId: string) => void;
  // A supervisor celebrating a direct/indirect report's just-completed development goal — one-shot
  // per goal (see PersonalDevGoal.encouragementSent), +5 points to both people.
  sendEncouragementNote: (supervisorId: string, memberId: string, goalId: string) => void;
  // Focus a specific goal on the My Goals page (e.g., from pending-action notification)
  focusedGoalId: string | null;
  setFocusedGoalId: (id: string | null) => void;
  // Focus a specific Objective on the Team OKRs page — e.g. clicking a performance goal's "linked
  // objective" or "view all key results" icon on My Goals navigates here and scrolls to it.
  // expandKrs additionally forces that Objective's Key Results list open (the "view all key
  // results" icon's behaviour; the "linked objective" icon leaves it collapsed).
  focusedObjectiveId: string | null;
  focusObjective: (objectiveId: string, expandKrs: boolean) => void;
  clearFocusedObjective: () => void;
  focusedObjectiveExpandKrs: boolean;
  // Activity catalog — admin-editable list of all point-earning/penalty activities
  liveActivities: Activity[];
  addActivity: (activity: Omit<Activity, "id">) => void;
  updateActivity: (id: string, changes: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  bulkUpsertActivities: (updates: { id: string; changes: Partial<Activity> }[]) => void;
  // Supervisor management — admin can update a user's direct leave supervisor
  updateSupervisor: (userId: string, newSupervisor: string) => void;
  // Operations persona overlay — non-null when tier is ops_hod/ops_mgr1/ops_mgr2
  opsMeta: OpsMeta | null;
  // Director persona overlay — non-null when tier is director1/director2
  directorMeta: DirectorViewMeta | null;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children, initialTier }: { children: ReactNode; initialTier?: Tier }) {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<Tier>(initialTier ?? "manager");
  const [section, setSection] = useState("home");
  const [points, setPoints] = useState(_currentUser.pointsYTD);
  const [staffPoints, setStaffPoints] = useState(() => _teamMembers.find(m => m.id === "u1")?.pointsYTD ?? 95);
  const [adminPoints, setAdminPoints] = useState(() => _teamMembers.find(m => m.id === "u4")?.pointsYTD ?? 0);
  const staffPointsLoaded = useRef(false);
  const adminPointsLoaded = useRef(false);
  const [focusedTeamMemberId, setFocusedTeamMemberId] = useState<string | null>(null);
  const [teamMemberDrawerReturnHome, setTeamMemberDrawerReturnHome] = useState(false);
  const [focusedSkillsMemberId, setFocusedSkillsMemberId] = useState<string | null>(null);
  const [liveTeamMemberSkills, setLiveTeamMemberSkills] = useState<
    { memberId: string; memberName: string; pending: string[]; verified: string[] }[]
  >([]);

  // Personal dev goals — separate state for staff (Priya), admin (James), and manager (Sarah)
  const [staffDevGoals, setStaffDevGoals] = useState<PersonalDevGoal[]>(_staffInitialDevGoals);
  const [adminDevGoals, setAdminDevGoals] = useState<PersonalDevGoal[]>(_adminInitialDevGoals);
  const [managerDevGoals, setManagerDevGoals] = useState<PersonalDevGoal[]>(_myGoals.development);

  const upsertStaffDevGoal = (goal: PersonalDevGoal) =>
    setStaffDevGoals(prev => prev.some(g => g.id === goal.id) ? prev.map(g => g.id === goal.id ? goal : g) : [...prev, goal]);
  const deleteStaffDevGoal = (id: string) =>
    setStaffDevGoals(prev => prev.filter(g => g.id !== id));
  const upsertAdminDevGoal = (goal: PersonalDevGoal) =>
    setAdminDevGoals(prev => prev.some(g => g.id === goal.id) ? prev.map(g => g.id === goal.id ? goal : g) : [...prev, goal]);
  const deleteAdminDevGoal = (id: string) =>
    setAdminDevGoals(prev => prev.filter(g => g.id !== id));
  const upsertManagerDevGoal = (goal: PersonalDevGoal) =>
    setManagerDevGoals(prev => prev.some(g => g.id === goal.id) ? prev.map(g => g.id === goal.id ? goal : g) : [...prev, goal]);
  const deleteManagerDevGoal = (id: string) =>
    setManagerDevGoals(prev => prev.filter(g => g.id !== id));

  // Generic dev-goal storage for any team member not covered by the staff/admin/manager/ops
  // switchable-persona slots above — so HOD/leave-supervisor drawers can always show a member's full
  // dev goal list, not just the currently-switched-to persona.
  const [teamDevGoalsById, setTeamDevGoalsById] = useState<Record<string, PersonalDevGoal[]>>({});
  const upsertTeamDevGoal = (memberId: string, goal: PersonalDevGoal) =>
    setTeamDevGoalsById(prev => {
      const existing = prev[memberId] ?? [];
      const next = existing.some(g => g.id === goal.id) ? existing.map(g => g.id === goal.id ? goal : g) : [...existing, goal];
      return { ...prev, [memberId]: next };
    });
  const deleteTeamDevGoal = (memberId: string, id: string) =>
    setTeamDevGoalsById(prev => ({ ...prev, [memberId]: (prev[memberId] ?? []).filter(g => g.id !== id) }));

  // Ops persona dev goals state (one per tier, mutated independently)
  const [opsHodDevGoalsState, setOpsHodDevGoals] = useState<PersonalDevGoal[]>(_opsHodDevGoals);
  const [opsMgr1DevGoalsState, setOpsMgr1DevGoals] = useState<PersonalDevGoal[]>(_opsMgr1DevGoals);
  const [opsMgr2DevGoalsState, setOpsMgr2DevGoals] = useState<PersonalDevGoal[]>(_opsMgr2DevGoals);

  // Live Credit Risk Management team members (Victor + Marcus as seen from Nadia's HOD view)
  const [liveOpsTeamMembers, setLiveOpsTeamMembers] = useState<TeamMember[]>(_opsTeamMembers);

  const upsertOpsHodDevGoal = useCallback((g: PersonalDevGoal) => setOpsHodDevGoals(prev => prev.some(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]), []);
  const deleteOpsHodDevGoal = useCallback((id: string) => setOpsHodDevGoals(prev => prev.filter(g => g.id !== id)), []);
  const upsertOpsMgr1DevGoal = useCallback((g: PersonalDevGoal) => setOpsMgr1DevGoals(prev => prev.some(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]), []);
  const deleteOpsMgr1DevGoal = useCallback((id: string) => setOpsMgr1DevGoals(prev => prev.filter(g => g.id !== id)), []);
  const upsertOpsMgr2DevGoal = useCallback((g: PersonalDevGoal) => setOpsMgr2DevGoals(prev => prev.some(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]), []);
  const deleteOpsMgr2DevGoal = useCallback((id: string) => setOpsMgr2DevGoals(prev => prev.filter(g => g.id !== id)), []);

  // Live team members state — shared single source of truth for both manager and staff views
  const [liveTeamMembers, setLiveTeamMembers] = useState<TeamMember[]>(_teamMembers);
  const csvLoaded = useRef(false);

  // Live department (Objective/Key-Result) goals — CSV can't hold the OKR shape (keyResults,
  // ack/counterpropose state, team-level sets), so — like liveActivities — this is persisted to
  // localStorage instead of synced from the server. A version stamp is stored alongside it: bump
  // SEED_VERSION any time departmentGoals/opsDepartmentGoals in mockData.ts/opsData.ts materially
  // change (new/edited Objectives or Key Results), so browsers with an older cached copy pick up the
  // fresh seed instead of silently keeping stale content forever (this is exactly the bug where
  // HCWM's OKR refresh wasn't showing up — the localStorage copy predated the content change).
  const SEED_VERSION = "2026-08-30-crm-insufficient-goals-fix";
  // Department-level Objective count is capped 3-5 everywhere a HOD can create one (see
  // MAX_OBJECTIVES_PER_SET in TeamSection.tsx's CreateObjectivePanel) — but that cap only guards
  // the *creation* UI, not whatever's sitting in localStorage. A cached copy that predates this
  // invariant (or predates a seed content change generally) can still hold a stale, out-of-range
  // count even if its version stamp happens to match for some other reason, which is exactly the
  // class of bug where a browser kept showing 6 HCWM department Objectives after the seed was
  // trimmed to 4 — so, on top of the version-stamp check, always re-validate the cached data's
  // department-level count is within range before trusting it; fall back to the fresh seed otherwise.
  const isValidDeptLevelCount = (goals: DeptGoal[]): boolean => {
    const count = goals.filter(g => (g.level ?? "department") !== "team").length;
    return count >= 3 && count <= 5;
  };
  const DEPT_GOALS_STORAGE_KEY = "compassPulse.liveDepartmentGoals";
  const DEPT_GOALS_VERSION_KEY = "compassPulse.liveDepartmentGoals.seedVersion";
  const [liveDepartmentGoals, setLiveDepartmentGoals] = useState<DeptGoal[]>(() => {
    try {
      if (typeof window === "undefined") return _departmentGoals;
      if (window.localStorage.getItem(DEPT_GOALS_VERSION_KEY) !== SEED_VERSION) return _departmentGoals;
      const raw = window.localStorage.getItem(DEPT_GOALS_STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as DeptGoal[];
        if (isValidDeptLevelCount(cached)) return cached;
      }
    } catch { /* fall through to the seed */ }
    return _departmentGoals;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(DEPT_GOALS_STORAGE_KEY, JSON.stringify(liveDepartmentGoals));
      window.localStorage.setItem(DEPT_GOALS_VERSION_KEY, SEED_VERSION);
    } catch { /* storage unavailable (e.g. private browsing) — session-only fallback */ }
  }, [liveDepartmentGoals]);

  // Same treatment for the ops department's goals — previously always the static seed with no edit
  // capability at all; now live-editable by the ops HOD the same way HCWM's are.
  const OPS_DEPT_GOALS_STORAGE_KEY = "compassPulse.liveOpsDepartmentGoals";
  const OPS_DEPT_GOALS_VERSION_KEY = "compassPulse.liveOpsDepartmentGoals.seedVersion";
  const [liveOpsDepartmentGoals, setLiveOpsDepartmentGoals] = useState<DeptGoal[]>(() => {
    try {
      if (typeof window === "undefined") return _opsDepartmentGoals;
      if (window.localStorage.getItem(OPS_DEPT_GOALS_VERSION_KEY) !== SEED_VERSION) return _opsDepartmentGoals;
      const raw = window.localStorage.getItem(OPS_DEPT_GOALS_STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as DeptGoal[];
        if (isValidDeptLevelCount(cached)) return cached;
      }
    } catch { /* fall through to the seed */ }
    return _opsDepartmentGoals;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(OPS_DEPT_GOALS_STORAGE_KEY, JSON.stringify(liveOpsDepartmentGoals));
      window.localStorage.setItem(OPS_DEPT_GOALS_VERSION_KEY, SEED_VERSION);
    } catch { /* storage unavailable (e.g. private browsing) — session-only fallback */ }
  }, [liveOpsDepartmentGoals]);

  // Delegated "team-OKR editor" — one leave supervisor per department the HOD can grant direct edit
  // rights to for *team-level* Objectives/KRs only (department-level stays HOD-only) — this is also
  // the "secondary owner" a HOD can set per team-level OKR set. Keyed by teamName (a department can
  // have several team-level sets, e.g. "Learning & Development", each with its own delegate); a
  // missing/empty key means no one is currently granted for that set. Persisted the same way as
  // liveDepartmentGoals above.
  const TEAM_OKR_EDITOR_STORAGE_KEY = "compassPulse.teamOkrEditors";
  const [teamOkrEditors, setTeamOkrEditorsState] = useState<Record<string, string>>(() => {
    try {
      const raw = typeof window !== "undefined" && window.localStorage.getItem(TEAM_OKR_EDITOR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(TEAM_OKR_EDITOR_STORAGE_KEY, JSON.stringify(teamOkrEditors)); }
    catch { /* storage unavailable */ }
  }, [teamOkrEditors]);

  const OPS_TEAM_OKR_EDITOR_STORAGE_KEY = "compassPulse.opsTeamOkrEditors";
  const [opsTeamOkrEditors, setOpsTeamOkrEditorsState] = useState<Record<string, string>>(() => {
    try {
      const raw = typeof window !== "undefined" && window.localStorage.getItem(OPS_TEAM_OKR_EDITOR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(OPS_TEAM_OKR_EDITOR_STORAGE_KEY, JSON.stringify(opsTeamOkrEditors)); }
    catch { /* storage unavailable */ }
  }, [opsTeamOkrEditors]);

  const setTeamOkrEditor = (teamName: string, name: string, isOps: boolean) => {
    const setState = isOps ? setOpsTeamOkrEditorsState : setTeamOkrEditorsState;
    setState(prev => {
      if (!name) { const { [teamName]: _drop, ...rest } = prev; return rest; }
      return { ...prev, [teamName]: name };
    });
  };

  // HOD-editable override for the "Team Members With Insufficient Goals" box label, keyed by the leave
  // supervisor's name (that section groups by leadName, not by any DeptGoal.teamName, since a lead
  // with no team-level OKR set at all can still have a box here) — defaults to a role-derived name
  // until the HOD overrides it. Same localStorage persistence pattern as teamOkrEditors above.
  const TEAM_BOX_NAME_STORAGE_KEY = "compassPulse.teamBoxNames";
  const [teamBoxNames, setTeamBoxNamesState] = useState<Record<string, string>>(() => {
    try {
      const raw = typeof window !== "undefined" && window.localStorage.getItem(TEAM_BOX_NAME_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(TEAM_BOX_NAME_STORAGE_KEY, JSON.stringify(teamBoxNames)); }
    catch { /* storage unavailable */ }
  }, [teamBoxNames]);

  const OPS_TEAM_BOX_NAME_STORAGE_KEY = "compassPulse.opsTeamBoxNames";
  const [opsTeamBoxNames, setOpsTeamBoxNamesState] = useState<Record<string, string>>(() => {
    try {
      const raw = typeof window !== "undefined" && window.localStorage.getItem(OPS_TEAM_BOX_NAME_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(OPS_TEAM_BOX_NAME_STORAGE_KEY, JSON.stringify(opsTeamBoxNames)); }
    catch { /* storage unavailable */ }
  }, [opsTeamBoxNames]);

  const renameTeamBox = (leadName: string, newName: string, isOps: boolean) => {
    const trimmed = newName.trim();
    const setState = isOps ? setOpsTeamBoxNamesState : setTeamBoxNamesState;
    setState(prev => {
      if (!trimmed) { const { [leadName]: _drop, ...rest } = prev; return rest; }
      return { ...prev, [leadName]: trimmed };
    });
  };

  // Always-fresh refs for the team-member arrays, for use inside the interval-based penalty sweep
  // below (which only runs its effect setup once — reading the state variables directly there
  // would see stale, mount-time values, since the effect's deps array is empty).
  const liveTeamMembersRef = useRef(liveTeamMembers);
  useEffect(() => { liveTeamMembersRef.current = liveTeamMembers; }, [liveTeamMembers]);
  const liveOpsTeamMembersRef = useRef(liveOpsTeamMembers);
  useEffect(() => { liveOpsTeamMembersRef.current = liveOpsTeamMembers; }, [liveOpsTeamMembers]);
  const liveDepartmentGoalsRef = useRef(liveDepartmentGoals);
  useEffect(() => { liveDepartmentGoalsRef.current = liveDepartmentGoals; }, [liveDepartmentGoals]);
  const liveOpsDepartmentGoalsRef = useRef(liveOpsDepartmentGoals);
  useEffect(() => { liveOpsDepartmentGoalsRef.current = liveOpsDepartmentGoals; }, [liveOpsDepartmentGoals]);

  const { data, isLoading } = useQuery({
    queryKey: ["appData"],
    queryFn: () => getAppData(),
    staleTime: 0,
    refetchInterval: 5_000, // poll every 5 s for real-time cross-user updates
  });

  useEffect(() => {
    if (data?.currentUser.pointsYTD !== undefined) {
      setPoints(data.currentUser.pointsYTD);
    }
  }, [data?.currentUser.pointsYTD]);

  // Sync staff/admin points from CSV on first successful load only
  useEffect(() => {
    if (!data?.teamMembers) return;
    if (!staffPointsLoaded.current) {
      const m = data.teamMembers.find(m => m.id === "u1");
      if (m !== undefined) { setStaffPoints(m.pointsYTD); staffPointsLoaded.current = true; }
    }
    if (!adminPointsLoaded.current) {
      const m = data.teamMembers.find(m => m.id === "u4");
      if (m !== undefined) { setAdminPoints(m.pointsYTD); adminPointsLoaded.current = true; }
    }
  }, [data?.teamMembers]);

  // Sync from CSV exactly once on first successful load; subsequent refetches do not overwrite
  // local mutations (staff RAG updates, added remarks) made within the session
  useEffect(() => {
    if (data?.teamMembers && !csvLoaded.current) {
      setLiveTeamMembers(data.teamMembers as TeamMember[]);
      csvLoaded.current = true;
    }
  }, [data?.teamMembers]);

  // Sync team member pending skills from server. skillsSynced uses useState (not useRef) so
  // React Strict Mode remounts reset it to false, allowing a fresh sync on each mount.
  const [skillsSynced, setSkillsSynced] = useState(false);
  useEffect(() => {
    if (data?.teamMemberPendingSkills && !skillsSynced) {
      setLiveTeamMemberSkills(data.teamMemberPendingSkills);
      setSkillsSynced(true);
    }
  }, [data?.teamMemberPendingSkills, skillsSynced]);

  // Ops personas' skills are static imports (not CSV-backed), so endorse/reject for u22/u23
  // mutate this local live copy instead of calling the HCWM-only CSV-writing server functions.
  const [liveOpsAllTeamMemberSkills, setLiveOpsAllTeamMemberSkills] = useState(_opsAllTeamMemberSkills);
  const isOpsMemberId = (memberId: string) => memberId === "u22" || memberId === "u23";

  const endorseTeamMemberSkill = async (memberId: string, skill: string) => {
    if (isOpsMemberId(memberId)) {
      setLiveOpsAllTeamMemberSkills(prev => prev.map(m => m.memberId !== memberId ? m : {
        ...m,
        pending: m.pending.filter(s => s !== skill),
        verified: [...m.verified, skill],
      }));
      awardMemberPoints(memberId, 5);
      return;
    }
    setLiveTeamMemberSkills(prev => prev.map(m => {
      if (m.memberId !== memberId) return m;
      return {
        ...m,
        pending: m.pending.filter(s => s !== skill),
        verified: [...m.verified, skill],
      };
    }).filter(m => m.pending.length > 0));
    // Points go to the skill's owner, not whoever is doing the endorsing — this fires for skills
    // approved from any source (completed dev goal, skill catalog, or Development Roadmap), since
    // they all funnel through this same pending → verified pipeline.
    awardMemberPoints(memberId, 5);
    await endorseTeamMemberSkillFn({ data: { memberId, skill } });
    setSkillsSynced(false);
    await queryClient.invalidateQueries({ queryKey: ["appData"] });
  };

  const rejectTeamMemberSkill = async (memberId: string, skill: string) => {
    if (isOpsMemberId(memberId)) {
      setLiveOpsAllTeamMemberSkills(prev => prev.map(m => m.memberId !== memberId ? m : {
        ...m,
        pending: m.pending.filter(s => s !== skill),
      }));
      return;
    }
    setLiveTeamMemberSkills(prev => prev.map(m => {
      if (m.memberId !== memberId) return m;
      return { ...m, pending: m.pending.filter(s => s !== skill) };
    }).filter(m => m.pending.length > 0));
    await rejectPendingSkillFn({ data: { memberId, skill } });
    setSkillsSynced(false);
    await queryClient.invalidateQueries({ queryKey: ["appData"] });
  };

  const addPoints = (n: number) => setPoints(p => p + n);

  const [nudgedGoalIds, setNudgedGoalIds] = useState<Set<string>>(new Set());
  const nudgeGoal = (goalId: string) => setNudgedGoalIds(prev => new Set([...prev, goalId]));

  // Send an encouragement note for a report's just-completed development goal — same
  // staff/admin/team dev-goal bucket resolution as acknowledgeDevGoalRec above, since a report's
  // dev goals can live in any of those depending on which switchable persona they currently are.
  // One-shot per goal (PersonalDevGoal.encouragementSent), +5 points to both people.
  const sendEncouragementNote = (supervisorId: string, memberId: string, goalId: string) => {
    const source = memberId === staffMemberId ? staffDevGoals
      : memberId === adminMemberId ? adminDevGoals
      : (teamDevGoalsById[memberId] ?? []);
    const goal = source.find(g => g.id === goalId);
    if (!goal || goal.encouragementSent) return;
    const updated: PersonalDevGoal = { ...goal, encouragementSent: true };
    if (memberId === staffMemberId) upsertStaffDevGoal(updated);
    else if (memberId === adminMemberId) upsertAdminDevGoal(updated);
    else upsertTeamDevGoal(memberId, updated);
    awardMemberPoints(memberId, 5);
    awardMemberPoints(supervisorId, 5);
  };

  // Focused goal — set from pending-action notification click so MyGoalsSection can scroll to it
  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(null);

  // Focused Objective — set when a performance goal card's "linked objective" or "view all key
  // results" icon is clicked on My Goals, so TeamSection can scroll to (and optionally expand) it.
  // Also switches the active section to Team OKRs, since that's where the target actually lives.
  const [focusedObjectiveId, setFocusedObjectiveId] = useState<string | null>(null);
  const [focusedObjectiveExpandKrs, setFocusedObjectiveExpandKrs] = useState(false);
  const focusObjective = (objectiveId: string, expandKrs: boolean) => {
    setFocusedObjectiveId(objectiveId);
    setFocusedObjectiveExpandKrs(expandKrs);
    setSection("team");
  };
  const clearFocusedObjective = () => setFocusedObjectiveId(null);

  // Live activity catalog — admin can add/edit/delete activities in real time. Persisted to
  // localStorage so an admin's changes (including deletions) survive a page reload or a future
  // code update to the seeded `defaultActivities` — an admin's edits/deletions to an activity they've
  // already seen stay authoritative. But a *newly seeded* default activity (added in a later code
  // update — one whose id this browser has never seen before) always gets merged in, so it doesn't
  // stay silently invisible forever just because this browser has an older cached catalog. This is
  // the same "always live, never overridden by a stale cache" guarantee `liveDepartmentGoals` already
  // has via SEED_VERSION, applied here at the level of individual activity ids instead of a single
  // version stamp (since activities are added/edited/deleted piecemeal, not reseeded wholesale).
  const ACTIVITIES_STORAGE_KEY = "compassPulse.liveActivities";
  const ACTIVITIES_SEEN_IDS_KEY = "compassPulse.liveActivities.seenSeedIds";
  const [liveActivities, setLiveActivities] = useState<Activity[]>(() => {
    try {
      if (typeof window === "undefined") return _defaultActivities;
      const raw = window.localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (!raw) return _defaultActivities;
      const cached = JSON.parse(raw) as Activity[];
      // First run of this merge logic against a pre-existing cache: we don't yet know which seed
      // ids this browser has "seen" before, so treat the cached list's own ids as the baseline —
      // anything in the current seed not already in that cached list is new and gets merged in.
      const seenRaw = window.localStorage.getItem(ACTIVITIES_SEEN_IDS_KEY);
      const seenIds = new Set<string>(seenRaw ? (JSON.parse(seenRaw) as string[]) : cached.map(a => a.id));
      const newlySeeded = _defaultActivities.filter(a => !seenIds.has(a.id));
      return newlySeeded.length > 0 ? [...cached, ...newlySeeded] : cached;
    } catch { /* fall through to the seed */ }
    return _defaultActivities;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(liveActivities));
      window.localStorage.setItem(ACTIVITIES_SEEN_IDS_KEY, JSON.stringify(_defaultActivities.map(a => a.id)));
    } catch { /* storage unavailable (e.g. private browsing) — session-only fallback */ }
  }, [liveActivities]);
  const addActivity = (activity: Omit<Activity, "id">) =>
    setLiveActivities(prev => [...prev, { ...activity, id: `act${Date.now()}` }]);
  const updateActivity = (id: string, changes: Partial<Activity>) =>
    setLiveActivities(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  const deleteActivity = (id: string) =>
    setLiveActivities(prev => prev.filter(a => a.id !== id));
  // Applies a batch of updates (e.g. from an Excel/CSV import) in one state update, so every
  // updated activity becomes live simultaneously rather than one re-render per row.
  const bulkUpsertActivities = (updates: { id: string; changes: Partial<Activity> }[]) =>
    setLiveActivities(prev => {
      const byId = new Map(updates.map(u => [u.id, u.changes]));
      return prev.map(a => byId.has(a.id) ? { ...a, ...byId.get(a.id) } : a);
    });

  // Live rewards catalog — admin can edit each reward's name/points in real time. Same
  // localStorage-persistence pattern as liveActivities above, for the same reason: once a browser
  // has a saved catalog, that saved copy is authoritative and survives reloads/future seed edits.
  const REWARDS_CATALOG_STORAGE_KEY = "compassPulse.liveRewardsCatalog";
  const [liveRewardsCatalog, setLiveRewardsCatalog] = useState<typeof _rewardsCatalog>(() => {
    try {
      if (typeof window === "undefined") return _rewardsCatalog;
      const raw = window.localStorage.getItem(REWARDS_CATALOG_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as typeof _rewardsCatalog;
    } catch { /* fall through to the seed */ }
    return _rewardsCatalog;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(REWARDS_CATALOG_STORAGE_KEY, JSON.stringify(liveRewardsCatalog));
    } catch { /* storage unavailable (e.g. private browsing) — session-only fallback */ }
  }, [liveRewardsCatalog]);
  const updateRewardCatalogItem = (id: string, changes: { name?: string; points?: number }) =>
    setLiveRewardsCatalog(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));

  // Supervisor override — admin can reassign a user's direct leave supervisor live
  const [supervisorOverrides, setSupervisorOverrides] = useState<Record<string, string>>({});
  const updateSupervisor = (userId: string, newSupervisor: string) => {
    setSupervisorOverrides(prev => ({ ...prev, [userId]: newSupervisor }));
    // Update the live team member so directManager is immediately reflected in manager features
    setLiveTeamMembers(prev => prev.map(m =>
      m.id === userId ? { ...m, directManager: newSupervisor } : m
    ));
  };

  const [managerInputs, setManagerInputs] = useState<Record<string, string>>({});
  const saveManagerInput = (memberId: string, goalId: string, text: string) => {
    setManagerInputs(prev => ({ ...prev, [`${memberId}:${goalId}`]: text }));
  };

  const [acknowledgedManagerInputs, setAcknowledgedManagerInputs] = useState<Record<string, boolean>>({});
  const acknowledgeManagerFeedback = (memberId: string, goalId: string) => {
    setAcknowledgedManagerInputs(prev => ({ ...prev, [`${memberId}:${goalId}`]: true }));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["appData"] });

  // Anabelle Tan (u1) = staff-tier demo; Belle Lim (u4) = admin-tier demo (switchable)
  const [staffMemberId, setStaffMemberId] = useState("u1");
  const [adminMemberId, setAdminMemberId] = useState("u4");

  const updateGoalRag = (memberId: string, goalId: string, quarter: "Q1" | "Q2" | "Q3" | "Q4", rag: RAG) => {
    const setter = (memberId === "u22" || memberId === "u23") ? setLiveOpsTeamMembers : setLiveTeamMembers;
    setter(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      const updatedGoals = m.goals.map(g => {
        if (g.id !== goalId) return g;
        const updatedQuarters = g.quarters.some(q => q.q === quarter)
          ? g.quarters.map(q => q.q === quarter ? { q: q.q, rag } : q)
          : [...g.quarters, { q: quarter, rag }];
        return { ...g, quarters: updatedQuarters };
      });
      const allRags = updatedGoals.flatMap(g => g.quarters.map(q => q.rag));
      const memberRag: RAG = allRags.includes("red") ? "red" : allRags.includes("amber") ? "amber" : "green";
      return { ...m, goals: updatedGoals, rag: memberRag };
    }));
  };

  const addGoalRemark = (memberId: string, goalId: string, author: string, text: string) => {
    const setter = (memberId === "u22" || memberId === "u23") ? setLiveOpsTeamMembers : setLiveTeamMembers;
    setter(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        goals: m.goals.map(g => g.id !== goalId ? g : {
          ...g,
          remarks: [...g.remarks, {
            id: `r${Date.now()}`,
            author,
            text,
            date: "Just now",
            pending: true,
          }],
        }),
      };
    }));
  };

  const modifyGoal = (
    memberId: string,
    goalId: string,
    changes: Partial<{ title: string; description: string; metric: string; linkedDept: string; weightage: number }>,
    andApprove: boolean,
  ) => {
    const setter = (memberId === "u22" || memberId === "u23") ? setLiveOpsTeamMembers : setLiveTeamMembers;
    setter(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        goals: m.goals.map(g => g.id !== goalId ? g : {
          ...g,
          ...changes,
          approved: andApprove ? true : g.approved,
          pendingAcknowledgement: andApprove ? false : true,
        }),
      };
    }));
  };

  // Staff self-propose a new performance goal — created unapproved, awaiting manager approval.
  // Remarks can only be added once a goal is approved (via the quarterly RAG update flow),
  // so newly proposed goals always start with no remarks, for every account without exception.
  const proposeGoal = (memberId: string, goal: { title: string; description: string; metric: string; linkedDept: string }) => {
    const setter = (memberId === "u22" || memberId === "u23") ? setLiveOpsTeamMembers : setLiveTeamMembers;
    setter(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        goals: [...m.goals, {
          id: `g${Date.now()}`,
          title: goal.title,
          description: goal.description,
          metric: goal.metric,
          linkedDept: goal.linkedDept,
          quarters: [],
          approved: false,
          submittedDate: new Date().toISOString().slice(0, 10),
          remarks: [],
        }],
      };
    }));
  };

  const approveGoal = (memberId: string, goalId: string) => {
    const setter = (memberId === "u22" || memberId === "u23") ? setLiveOpsTeamMembers : setLiveTeamMembers;
    setter(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        goals: m.goals.map(g => g.id !== goalId ? g : { ...g, approved: true }),
      };
    }));
  };

  const acknowledgeGoal = (memberId: string, goalId: string) => {
    const setter = (memberId === "u22" || memberId === "u23") ? setLiveOpsTeamMembers : setLiveTeamMembers;
    setter(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        goals: m.goals.map(g => g.id !== goalId ? g : { ...g, pendingAcknowledgement: false }),
      };
    }));
  };

  // HOD directly recommends a new performance goal to one or more team members, linked to a
  // specific department goal — lands pre-approved (weightage starts at 0, same "needs weighting"
  // flow as any newly-linked goal) but pendingAcknowledgement, mirroring modifyGoal's ack flow.
  const recommendGoal = (
    memberIds: string[],
    goal: { title: string; description: string; metric: string; linkedDept: string },
    recommendedBy: string,
  ) => {
    const isOpsId = (id: string) => id === "u22" || id === "u23";
    const makeGoal = (): Goal => ({
      id: `g${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      title: goal.title,
      description: goal.description,
      metric: goal.metric,
      quarters: [],
      linkedDept: goal.linkedDept,
      weightage: 0,
      approved: true,
      pendingAcknowledgement: true,
      recommendedDate: new Date().toISOString().slice(0, 10),
      remarks: [{
        id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        author: recommendedBy,
        text: `Recommended this goal for you to contribute to the department objective.`,
        date: "Just now",
        pending: false,
      }],
    });
    setLiveTeamMembers(prev => prev.map(m => (memberIds.includes(m.id) && !isOpsId(m.id)) ? { ...m, goals: [...m.goals, makeGoal()] } : m));
    setLiveOpsTeamMembers(prev => prev.map(m => (memberIds.includes(m.id) && isOpsId(m.id)) ? { ...m, goals: [...m.goals, makeGoal()] } : m));
  };

  // ── Recommended development goals — HOD/direct leave supervisor recommends, team member
  // must acknowledge (publishes to their dev goals) or decline (mandatory reason/counter-suggestion)
  // before it counts as a real development goal.
  const [pendingDevGoalRecs, setPendingDevGoalRecs] = useState<Record<string, DevGoalRecommendation[]>>({});
  const [declinedDevGoalRecs, setDeclinedDevGoalRecs] = useState<Record<string, DeclinedDevGoalRecommendation[]>>({});

  const recommendDevGoal = (memberId: string, rec: { title: string; description: string; dueDate: string; recommendedBy: string }) => {
    const newRec: DevGoalRecommendation = {
      id: `rec${Date.now()}`,
      recommendedDate: new Date().toISOString().slice(0, 10),
      ...rec,
    };
    setPendingDevGoalRecs(prev => ({ ...prev, [memberId]: [...(prev[memberId] ?? []), newRec] }));
  };

  const acknowledgeDevGoalRec = (memberId: string, recId: string) => {
    const rec = (pendingDevGoalRecs[memberId] ?? []).find(r => r.id === recId);
    if (!rec) return;
    const newGoal: PersonalDevGoal = { id: `dg${Date.now()}`, title: rec.title, description: rec.description, dueDate: rec.dueDate, completed: false };
    if (memberId === staffMemberId) upsertStaffDevGoal(newGoal);
    else if (memberId === adminMemberId) upsertAdminDevGoal(newGoal);
    else upsertTeamDevGoal(memberId, newGoal);
    setPendingDevGoalRecs(prev => ({ ...prev, [memberId]: (prev[memberId] ?? []).filter(r => r.id !== recId) }));
  };

  const declineDevGoalRec = (memberId: string, recId: string, reason: string) => {
    const rec = (pendingDevGoalRecs[memberId] ?? []).find(r => r.id === recId);
    if (!rec) return;
    setDeclinedDevGoalRecs(prev => ({ ...prev, [memberId]: [...(prev[memberId] ?? []), { ...rec, declinedDate: new Date().toISOString().slice(0, 10), reason }] }));
    setPendingDevGoalRecs(prev => ({ ...prev, [memberId]: (prev[memberId] ?? []).filter(r => r.id !== recId) }));
  };

  // ── Recommended performance goals — a HOD/direct leave supervisor's suggestion (title,
  // description, due date, optional linkage to an existing department/team Objective or Key Result
  // for context only) that the member must acknowledge or decline, same lifecycle as dev-goal
  // recommendations above. Acknowledging never appoints the member as an owner of whatever it's
  // linked to — it just publishes the recommendation into their own read-only list.
  const [pendingPerfGoalRecs, setPendingPerfGoalRecs] = useState<Record<string, PerfGoalRecommendation[]>>({});
  const [acknowledgedPerfGoalRecs, setAcknowledgedPerfGoalRecs] = useState<Record<string, AcknowledgedPerfGoalRecommendation[]>>({});
  const [declinedPerfGoalRecs, setDeclinedPerfGoalRecs] = useState<Record<string, DeclinedPerfGoalRecommendation[]>>({});

  const recommendPerfGoal = (memberId: string, rec: { title: string; description: string; dueDate: string; linkedTo: string; recommendedBy: string }) => {
    const newRec: PerfGoalRecommendation = {
      id: `prec${Date.now()}`,
      recommendedDate: new Date().toISOString().slice(0, 10),
      ...rec,
    };
    setPendingPerfGoalRecs(prev => ({ ...prev, [memberId]: [...(prev[memberId] ?? []), newRec] }));
  };

  const acknowledgePerfGoalRec = (memberId: string, recId: string) => {
    const rec = (pendingPerfGoalRecs[memberId] ?? []).find(r => r.id === recId);
    if (!rec) return;
    setAcknowledgedPerfGoalRecs(prev => ({ ...prev, [memberId]: [...(prev[memberId] ?? []), { ...rec, acknowledgedDate: new Date().toISOString().slice(0, 10) }] }));
    setPendingPerfGoalRecs(prev => ({ ...prev, [memberId]: (prev[memberId] ?? []).filter(r => r.id !== recId) }));
  };

  const declinePerfGoalRec = (memberId: string, recId: string, reason: string) => {
    const rec = (pendingPerfGoalRecs[memberId] ?? []).find(r => r.id === recId);
    if (!rec) return;
    setDeclinedPerfGoalRecs(prev => ({ ...prev, [memberId]: [...(prev[memberId] ?? []), { ...rec, declinedDate: new Date().toISOString().slice(0, 10), reason }] }));
    setPendingPerfGoalRecs(prev => ({ ...prev, [memberId]: (prev[memberId] ?? []).filter(r => r.id !== recId) }));
  };

  // Deduct points from an arbitrary team member by id — routes to whichever state bucket is that
  // member's actual source of truth (mirrors the memberId routing already used by acknowledgeDevGoalRec).
  const deductMemberPoints = (memberId: string, n: number) => {
    if (memberId === "u0") { setPoints(p => Math.max(0, p - n)); return; }
    if (memberId === staffMemberId) { setStaffPoints(p => Math.max(0, p - n)); return; }
    if (memberId === adminMemberId) { setAdminPoints(p => Math.max(0, p - n)); return; }
    if (isOpsMemberId(memberId)) {
      setLiveOpsTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, pointsYTD: Math.max(0, m.pointsYTD - n) } : m));
      return;
    }
    setLiveTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, pointsYTD: Math.max(0, m.pointsYTD - n) } : m));
  };

  // Award points to an arbitrary team member by id — the add-side mirror of deductMemberPoints,
  // same routing. Needed anywhere points are earned by someone other than whichever persona is
  // currently switched to (e.g. a skill getting approved credits its owner, not the approver).
  const awardMemberPoints = (memberId: string, n: number) => {
    if (memberId === "u0") { setPoints(p => p + n); return; }
    if (memberId === staffMemberId) { setStaffPoints(p => p + n); return; }
    if (memberId === adminMemberId) { setAdminPoints(p => p + n); return; }
    if (isOpsMemberId(memberId)) {
      setLiveOpsTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, pointsYTD: m.pointsYTD + n } : m));
      return;
    }
    setLiveTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, pointsYTD: m.pointsYTD + n } : m));
  };

  // Proposed edits to an existing performance goal, awaiting HOD approval — from either a direct
  // (non-HOD) supervisor editing a report's contributing goal, or a staff member proposing a change
  // to their own goal. The live goal is only mutated once the HOD approves (via modifyGoal).
  const [pendingGoalEditProposals, setPendingGoalEditProposals] = useState<GoalEditProposal[]>([]);
  const proposeGoalEdit = (input: Omit<GoalEditProposal, "id" | "proposedDate" | "penaltyApplied">) => {
    const proposal: GoalEditProposal = {
      ...input,
      id: `gep${Date.now()}`,
      proposedDate: new Date().toISOString().slice(0, 10),
    };
    setPendingGoalEditProposals(prev => [...prev, proposal]);
  };
  const resolveGoalEditProposal = (id: string) =>
    setPendingGoalEditProposals(prev => prev.filter(p => p.id !== id));

  // Development goals added from the Development Roadmap's recommended skills/certifications are
  // created without a due date — flagged here until the user sets one, so the UI can highlight the
  // due-date field and the same 7-working-day penalty sweep below can catch it if left unset.
  const [pendingDueDateGoals, setPendingDueDateGoals] = useState<
    { memberId: string; goalId: string; createdDate: string; penaltyApplied?: boolean }[]
  >([]);
  const flagGoalPendingDueDate = (memberId: string, goalId: string) =>
    setPendingDueDateGoals(prev => [...prev, { memberId, goalId, createdDate: new Date().toISOString().slice(0, 10) }]);
  const clearPendingDueDate = (goalId: string) =>
    setPendingDueDateGoals(prev => prev.filter(p => p.goalId !== goalId));

  // HOD SLA: at least 3 department-level Objectives, each with at least 3 Key Results, by the last
  // working day of January — a one-shot-per-HOD-per-year penalty, tracked here (not on any single
  // Objective/KR) since the rule is about the department's overall counts. Persisted like
  // liveDepartmentGoals above, keyed "<hodId>:<year>".
  const HOD_OKR_SLA_STORAGE_KEY = "compassPulse.hodObjectiveSlaAppliedYears";
  const [hodObjectiveSlaAppliedYears, setHodObjectiveSlaAppliedYears] = useState<Set<string>>(() => {
    try {
      if (typeof window === "undefined") return new Set();
      const raw = window.localStorage.getItem(HOD_OKR_SLA_STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* fall through */ }
    return new Set();
  });
  useEffect(() => {
    try { window.localStorage.setItem(HOD_OKR_SLA_STORAGE_KEY, JSON.stringify([...hodObjectiveSlaAppliedYears])); }
    catch { /* storage unavailable */ }
  }, [hodObjectiveSlaAppliedYears]);

  // Enforce the 7-working-day response SLA on recommended development goals and on development
  // goals awaiting a due date — deducts 5 points exactly once per overdue item. Runs on mount and
  // then every minute; no need for the 5s cadence used for CSV polling since this only needs to
  // catch a day-granularity threshold.
  useEffect(() => {
    const checkOverduePenalties = () => {
      setPendingDevGoalRecs(prev => {
        let changed = false;
        const next: Record<string, DevGoalRecommendation[]> = {};
        for (const [memberId, recs] of Object.entries(prev)) {
          next[memberId] = recs.map(rec => {
            if (rec.penaltyApplied || workingDaysSince(rec.recommendedDate) < 7) return rec;
            changed = true;
            deductMemberPoints(memberId, 5);
            return { ...rec, penaltyApplied: true };
          });
        }
        return changed ? next : prev;
      });
      setPendingDueDateGoals(prev => prev.map(p => {
        if (p.penaltyApplied || workingDaysSince(p.createdDate) < 7) return p;
        deductMemberPoints(p.memberId, 5);
        return { ...p, penaltyApplied: true };
      }));
      setPendingPerfGoalRecs(prev => {
        let changed = false;
        const next: Record<string, PerfGoalRecommendation[]> = {};
        for (const [memberId, recs] of Object.entries(prev)) {
          next[memberId] = recs.map(rec => {
            if (rec.penaltyApplied || workingDaysSince(rec.recommendedDate) < 7) return rec;
            changed = true;
            deductMemberPoints(memberId, 5);
            return { ...rec, penaltyApplied: true };
          });
        }
        return changed ? next : prev;
      });
      // Recommended performance goals awaiting the team member's acknowledgement
      const sweepAckPenalty = (members: TeamMember[]) => members.map(m => {
        let memberChanged = false;
        const goals = m.goals.map(g => {
          if (!g.pendingAcknowledgement || !g.recommendedDate || g.ackPenaltyApplied || workingDaysSince(g.recommendedDate) < 7) return g;
          memberChanged = true;
          deductMemberPoints(m.id, 5);
          return { ...g, ackPenaltyApplied: true };
        });
        return memberChanged ? { ...m, goals } : m;
      });
      setLiveTeamMembers(prev => sweepAckPenalty(prev));
      setLiveOpsTeamMembers(prev => sweepAckPenalty(prev));
      // Self-proposed goal edits awaiting the HOD's review
      setPendingGoalEditProposals(prev => prev.map(p => {
        if (p.source !== "self" || p.penaltyApplied || workingDaysSince(p.proposedDate) < 7) return p;
        deductMemberPoints(p.hodId, 5);
        return { ...p, penaltyApplied: true };
      }));

      // Resolves an Objective/KR "owner" name (or a supervisor name) to a deductMemberPoints-able
      // id — checks the two HOD personas first, then both live team-member arrays by name. Reads
      // via refs (not the state variables directly) since this effect's deps are empty and only
      // runs its setup once; the refs are kept fresh by their own sync effects above.
      const resolveMemberIdByName = (name: string): string | undefined => {
        if (name === _currentUser.name) return "u0";
        if (name === opsCurrentUser.name) return "u21";
        return liveTeamMembersRef.current.find(m => m.name === name)?.id
          ?? liveOpsTeamMembersRef.current.find(m => m.name === name)?.id;
      };
      // An owner field is one-or-more comma-separated names (see utils.ts's ownerNames/isAmongOwners)
      // — resolves every one of them, so a Key Result with multiple owners penalizes/credits all of
      // them, not just whichever name happened to be first.
      const resolveMemberIdsByOwnerField = (ownerField: string): string[] =>
        ownerNames(ownerField).map(resolveMemberIdByName).filter((id): id is string => !!id);

      // Objective/KR acknowledgement SLA — each still-pending owner has 7 working days to accept or
      // counterpropose; only names still in pendingAcknowledgementFor are penalized (a co-owner who
      // already acknowledged isn't charged again just because another owner is late).
      const sweepOkrAck = (goals: DeptGoal[]): DeptGoal[] => goals.map(g => {
        let changed = false;
        let updated = g;
        if (hasPendingAck(g) && !g.ackPenaltyApplied && g.assignedDate && workingDaysSince(g.assignedDate) >= 7) {
          g.pendingAcknowledgementFor!.forEach(name => { const id = resolveMemberIdByName(name); if (id) deductMemberPoints(id, 5); });
          updated = { ...updated, ackPenaltyApplied: true };
          changed = true;
        }
        const krs = (g.keyResults ?? []).map(k => {
          if (hasPendingAck(k) && !k.ackPenaltyApplied && k.assignedDate && workingDaysSince(k.assignedDate) >= 7) {
            k.pendingAcknowledgementFor!.forEach(name => { const id = resolveMemberIdByName(name); if (id) deductMemberPoints(id, 5); });
            changed = true;
            return { ...k, ackPenaltyApplied: true };
          }
          return k;
        });
        if (changed) updated = { ...updated, keyResults: krs };
        return changed ? updated : g;
      });
      setLiveDepartmentGoals(prev => sweepOkrAck(prev));
      setLiveOpsDepartmentGoals(prev => sweepOkrAck(prev));

      // Quarterly KR-scoring SLA — normally the standard getGoalStatusDueDate grace period ("last
      // working day of the first week in the next month after the current quarter"), but a Key
      // Result whose own due date falls before the quarter actually ends is held to that earlier
      // date instead (effectiveKrScoreDueDate in utils.ts) — an owner doesn't get the full grace
      // period on a Key Result that was already due mid-quarter.
      const todayIso = new Date().toISOString().slice(0, 10);
      const sweepKrScore = (goals: DeptGoal[]): DeptGoal[] => goals.map(g => {
        const krs = g.keyResults ?? [];
        let changed = false;
        const updatedKrs = krs.map(k => {
          const dueIso = effectiveKrScoreDueDate(k).toISOString().slice(0, 10);
          if (k.score === undefined && !k.scorePenaltyApplied && todayIso > dueIso) {
            resolveMemberIdsByOwnerField(k.owner).forEach(id => deductMemberPoints(id, 15));
            changed = true;
            return { ...k, scorePenaltyApplied: true };
          }
          return k;
        });
        return changed ? { ...g, keyResults: updatedKrs } : g;
      });
      setLiveDepartmentGoals(prev => sweepKrScore(prev));
      setLiveOpsDepartmentGoals(prev => sweepKrScore(prev));

      // New-joiner performance-goal rule: if a team member hasn't set 3 performance goals within 7
      // working days of their 30-day mark, their *direct supervisor* (not the member) is penalized.
      // "Performance goals" = Key Results they own (across dept + team level, both departments) —
      // the old individually-created Goal objects are no longer how this is counted.
      const ownedKrCount = (memberName: string) =>
        keyResultsOwnedBy(memberName, liveDepartmentGoalsRef.current, liveOpsDepartmentGoalsRef.current).length;
      const sweepNewJoinerPenalty = (members: TeamMember[]): TeamMember[] => members.map(m => {
        if (m.newJoinerPenaltyApplied || ownedKrCount(m.name) >= 3 || !newJoinerGoalDeadlinePassed(m.joinDate)) return m;
        const supervisorId = resolveMemberIdByName(m.directManager);
        if (supervisorId) deductMemberPoints(supervisorId, 15);
        return { ...m, newJoinerPenaltyApplied: true };
      });
      setLiveTeamMembers(prev => sweepNewJoinerPenalty(prev));
      setLiveOpsTeamMembers(prev => sweepNewJoinerPenalty(prev));

      // Monthly RAG-confidence updates are a recommended cadence, not a penalized SLA — per policy
      // (and act18 in the Activity Catalog, which is non-compulsory with no penalty), there is
      // deliberately no point deduction for missing a monthly confidence update. Only the quarterly
      // score (sweepKrScore above) is penalized.

      // HOD SLA — at least 3 department-level Objectives, each with at least 3 Key Results, by the
      // last working day of January. One-shot per HOD per year (hodObjectiveSlaAppliedYears), since
      // this checks the department's overall counts rather than any single Objective/KR.
      const currentYear = new Date().getFullYear();
      const januaryDueIso = getJanuaryDeadline(currentYear).toISOString().slice(0, 10);
      if (todayIso > januaryDueIso) {
        const hodMeetsSla = (goals: DeptGoal[]) => {
          const deptLevel = goals.filter(g => g.level !== "team");
          return deptLevel.length >= 3 && deptLevel.every(g => (g.keyResults ?? []).length >= 3);
        };
        setHodObjectiveSlaAppliedYears(prev => {
          const next = new Set(prev);
          let changed = false;
          const hods: [string, DeptGoal[]][] = [
            ["u0", liveDepartmentGoalsRef.current],
            ["u21", liveOpsDepartmentGoalsRef.current],
          ];
          for (const [hodId, goals] of hods) {
            const key = `${hodId}:${currentYear}`;
            if (next.has(key) || hodMeetsSla(goals)) continue;
            deductMemberPoints(hodId, 10);
            next.add(key);
            changed = true;
          }
          return changed ? next : prev;
        });
      }
    };
    checkOverduePenalties();
    const id = setInterval(checkOverduePenalties, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 1:1 check-ins, Team Pulse, Manager Effectiveness, AI Activity Log — all in-memory only, same
  // "kept independent of the CSV pipeline" pattern as deptGoalSkills just below. Seed data for all
  // four lives in checkInSeedData.ts, imported once here. ──────────────────────────────────────────
  const [checkIns, setCheckIns] = useState<CheckIn[]>(_seedCheckIns);
  const addCheckIn = (checkIn: Omit<CheckIn, "id">) => {
    setCheckIns(prev => [...prev, { ...checkIn, id: `ci${Date.now()}${Math.random().toString(36).slice(2, 5)}` }]);
    setAiActivityLog(prev => [
      { id: `log${Date.now()}p`, date: checkIn.date, kind: "prep_agent", summary: `Prep brief used for ${checkIn.memberName}'s check-in`, targetName: checkIn.memberName, actorName: checkIn.managerName },
      { id: `log${Date.now()}m`, date: checkIn.date, kind: "ai_minutes", summary: `AI minutes generated for ${checkIn.memberName}'s check-in`, targetName: checkIn.memberName, actorName: checkIn.managerName },
      ...prev,
    ]);
  };
  const toggleCheckInActionItem = (checkInId: string, itemId: string) =>
    setCheckIns(prev => prev.map(c => (c.id !== checkInId ? c : {
      ...c, actionItems: c.actionItems.map(a => (a.id === itemId ? { ...a, done: !a.done } : a)),
    })));

  const [pulseResponses, setPulseResponses] = useState<PulseResponse[]>(_seedPulseResponses);
  const submitPulseResponse = (response: Omit<PulseResponse, "id">) =>
    setPulseResponses(prev => [...prev, { ...response, id: `pr${Date.now()}${Math.random().toString(36).slice(2, 5)}` }]);

  const [managerEffectivenessRatings, setManagerEffectivenessRatings] = useState<ManagerEffectivenessRating[]>(_seedManagerRatings);
  const submitManagerEffectivenessRating = (rating: Omit<ManagerEffectivenessRating, "id">) =>
    setManagerEffectivenessRatings(prev => [...prev, { ...rating, id: `mr${Date.now()}${Math.random().toString(36).slice(2, 5)}` }]);

  const [aiActivityLog, setAiActivityLog] = useState<AiActivityLogEntry[]>(_seedAiActivityLog);
  const logAiActivity = (entry: Omit<AiActivityLogEntry, "id">) =>
    setAiActivityLog(prev => [{ ...entry, id: `log${Date.now()}${Math.random().toString(36).slice(2, 5)}` }, ...prev]);

  // HOD-tagged "skills needed" per team/department goal — keyed by goal id (unique across every
  // department's goal set, whether an Objective or one of its Key Results). Kept independent of the
  // CSV-backed department-goals save pipeline. Seeded with a few real tags on HCWM/Credit
  // Risk/Compliance's own Objectives so the Departmental Competency Gap and Director Insights views
  // have real data to show immediately rather than an empty "nothing tagged yet" state.
  const [deptGoalSkills, setDeptGoalSkills] = useState<Record<string, string[]>>({
    d1: ["HR Technology & AI Fluency", "Data-Driven Decision Making"],
    d6: ["People Analytics", "HR Technology & AI Fluency"],
    ad1: ["Credit Risk Assessment", "Financial Analysis"],
    ad2: ["AI/ML in Credit Scoring", "Credit Risk Assessment"],
    ...complianceGoalSkills,
    ...marketingGoalSkills,
  });
  const updateGoalSkills = (goalId: string, skills: string[]) => {
    const previousSkills = deptGoalSkills[goalId] ?? [];
    const newlyAdded = skills.filter(s => !previousSkills.includes(s));
    setDeptGoalSkills(prev => ({ ...prev, [goalId]: skills }));
    if (newlyAdded.length === 0) return;

    // Resolve which department this goal/KR belongs to, its owner(s), and that HOD's name — a
    // goalId is either a top-level Objective id or one of its nested Key Result ids, and the id
    // space is disjoint between HCWM's departmentGoals and Credit Risk Management's opsDepartmentGoals.
    const findOwners = (goals: DeptGoal[]): string[] => {
      for (const g of goals) {
        if (g.id === goalId) return ownerNames(g.owner);
        const kr = (g.keyResults ?? []).find(k => k.id === goalId);
        if (kr) return ownerNames(kr.owner);
      }
      return [];
    };
    const isOps = liveOpsDepartmentGoals.some(g => g.id === goalId || (g.keyResults ?? []).some(k => k.id === goalId));
    const owners = findOwners(isOps ? liveOpsDepartmentGoals : liveDepartmentGoals);
    const hodName = isOps ? opsCurrentUser.name : _currentUser.name;
    const memberSkillsSource = isOps ? liveOpsAllTeamMemberSkills : (d?.allTeamMemberSkills ?? []);

    for (const ownerName of owners) {
      const ownerId = ownerName === _currentUser.name ? "u0"
        : ownerName === opsCurrentUser.name ? "u21"
        : (isOps ? liveOpsTeamMembers : liveTeamMembers).find(m => m.name === ownerName)?.id;
      if (!ownerId) continue;
      const verified = memberSkillsSource.find(m => m.memberId === ownerId)?.verified ?? [];
      for (const skill of newlyAdded) {
        if (verified.includes(skill)) continue;
        recommendDevGoal(ownerId, {
          title: skill,
          description: "Recommended based on a skill tagged on your OKR",
          dueDate: "",
          recommendedBy: hodName,
        });
      }
    }
  };

  // resolveRemark updates liveTeamMembers directly so manager view stays in sync
  // without a CSV refetch that would overwrite staff-side local changes
  const resolveRemark = async (remarkId: string) => {
    setPoints(p => p + 10);
    setLiveTeamMembers(prev => prev.map(m => ({
      ...m,
      goals: m.goals.map(g => ({
        ...g,
        remarks: g.remarks.map(r => r.id === remarkId ? { ...r, pending: false } : r),
      })),
    })));
    await resolveRemarkFn({ data: { remarkId } });
  };

  // Supporting-certificate attachments for pending skills — keyed "memberId:skill". Populated
  // alongside addPendingSkill when a certificate was uploaded; looked up by the reviewing manager's
  // UI to require viewing it before they can approve/reject. Pending skills submitted through paths
  // that don't require an attachment (e.g. the general Skills Catalog search) simply have no entry
  // here and stay ungated, unchanged from before.
  const [skillAttachments, setSkillAttachments] = useState<Record<string, SkillAttachment & { viewed: boolean }>>({});
  const markAttachmentViewed = (memberId: string, skill: string) =>
    setSkillAttachments(prev => {
      const key = `${memberId}:${skill}`;
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], viewed: true } };
    });

  // Ops personas' skills are static-seeded, not CSV-backed, so submissions for u21/u22/u23
  // mutate the local live copy instead of calling the HCWM-only CSV-writing server function —
  // this keeps "my skills profile" and "team skills pending review" on the same source of truth.
  const addPendingSkill = async (skill: string, attachment?: SkillAttachment) => {
    if (tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2") {
      const memberId = tier === "ops_hod" ? "u21" : tier === "ops_mgr1" ? "u22" : "u23";
      setLiveOpsAllTeamMemberSkills(prev => prev.map(m => m.memberId !== memberId ? m : {
        ...m,
        pending: [...m.pending, skill],
      }));
      if (attachment) setSkillAttachments(prev => ({ ...prev, [`${memberId}:${skill}`]: { ...attachment, viewed: false } }));
      return;
    }
    const userId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : "u0";
    if (attachment) setSkillAttachments(prev => ({ ...prev, [`${userId}:${skill}`]: { ...attachment, viewed: false } }));
    await addPendingSkillFn({ data: { userId, skill } });
    await invalidate();
  };

  // Holds a completed development goal's uploaded certificate between "confirm completion" and the
  // separate "submit for manager approval" click (the two are distinct user actions).
  const [devGoalAttachments, setDevGoalAttachments] = useState<Record<string, SkillAttachment>>({});
  const attachDevGoalCertificate = (goalId: string, attachment: SkillAttachment) =>
    setDevGoalAttachments(prev => ({ ...prev, [goalId]: attachment }));

  const redeemReward = async (cost: number, name: string) => {
    // NOTE: RewardsSection.tsx's displayPoints currently reads the shared `points` (u0) bucket for
    // every non-staff/non-admin tier (manager, ops_hod, ops_mgr1, ops_mgr2 all alias to it) — a
    // pre-existing gap predating this fix, out of scope here. Routing the deduction anywhere else
    // (e.g. via currentViewerId()/deductMemberPoints for ops tiers) would desync from what's shown,
    // making things worse, not better — so this intentionally keeps the same "u0" fallback that's
    // at least internally consistent with today's display logic.
    const userId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : "u0";
    if (tier === "staff") setStaffPoints(p => Math.max(0, p - cost));
    else if (tier === "admin") setAdminPoints(p => Math.max(0, p - cost));
    else setPoints(p => Math.max(0, p - cost));
    await redeemRewardFn({ data: { userId, cost, name } });
    await invalidate();
  };

  const toggleActionPlanItem = async (id: string, done: boolean) => {
    if (done) setPoints(p => p + 25);
    await toggleActionPlanFn({ data: { id, done } });
    await invalidate();
  };

  const logCompliment = async (recipient: string) => {
    // Previously hardcoded to always credit "u0" (Sarah Chen) regardless of who was actually
    // sending — matches redeemReward's existing tier-branch pattern for the sender's own bucket
    // (see the note there on the pre-existing ops-tier display gap this doesn't attempt to fix).
    const senderId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : "u0";
    if (tier === "staff") setStaffPoints(p => p + 25);
    else if (tier === "admin") setAdminPoints(p => p + 25);
    else setPoints(p => p + 25);
    // The named recipient is resolved server-side against the full users.csv roster and credited
    // there — see logCompliment in csvData.server.ts for why this (not a client-side lookup) is
    // the correct fix.
    await logComplimentFn({ data: { senderId, recipient } });
    await invalidate();
  };

  const saveDepartmentGoals = async (goals: { id: string; title: string; owner: string; progress: number; weightage: number; dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string }[]) => {
    // Merge the basic fields this editor knows about onto the existing richer OKR state, rather
    // than replacing the array wholesale — a full replace would silently drop keyResults/level/
    // teamName/etc. for every entry, since this payload's shape predates the OKR fields.
    setLiveDepartmentGoals(prev => prev.map(g => {
      const incoming = goals.find(x => x.id === g.id);
      return incoming ? { ...g, ...incoming } : g;
    }));
    await updateDepartmentGoalsFn({ data: { goals } });
  };

  // ── OKR CRUD — Objectives (department- or team-level DeptGoal entries) and their Key Results.
  // `isOps` selects which live array (HCWM's liveDepartmentGoals vs Credit Risk Management's
  // liveOpsDepartmentGoals) a call targets, matching the existing isOps-branch convention used
  // throughout this file for team-member mutations. ──────────────────────────────────────────────

  const deptGoalSetter = (isOps: boolean) => (isOps ? setLiveOpsDepartmentGoals : setLiveDepartmentGoals);

  // Computes which owner names should be (re-)flagged pending acknowledgement for a HOD (or
  // delegated team-OKR editor's) edit — shared by updateObjective/updateKeyResult/
  // resolveOkrCounter's "modify" path. If the edit only adds owner(s) (title/description/dueDate
  // untouched), only the *newly added* names go pending — an existing co-owner isn't re-flagged
  // just because someone else joined as owner. If any other field changed too, every current owner
  // re-acks (the terms they'd have to sign off on changed) — EXCEPT the person who made the edit
  // themselves: a delegated team-OKR editor is very often also an owner of the very KR/Objective
  // they're editing (e.g. a team lead granted edit rights over their own team's set), and asking
  // someone to acknowledge their own change is never correct, regardless of what other role they
  // also hold. `requestedBy` is optional only because a couple of legacy call sites don't have a
  // clear "actor" (e.g. resolving a counter-proposal); pass it whenever the actor is known.
  const computeOwnerEditPendingAck = (
    current: { title: string; owner: string; dueDate?: string; description?: string },
    changes: Partial<{ title: string; owner: string; dueDate?: string; description?: string }>,
    requestedBy?: string,
  ): string[] => {
    const ownerChanged = changes.owner !== undefined && changes.owner !== current.owner;
    const titleChanged = changes.title !== undefined && changes.title !== current.title;
    const dueDateChanged = changes.dueDate !== undefined && changes.dueDate !== (current.dueDate ?? "");
    const descriptionChanged = changes.description !== undefined && changes.description !== (current.description ?? "");
    const finalOwnerField = changes.owner ?? current.owner;
    const excludeActor = (names: string[]) => requestedBy ? names.filter(n => n !== requestedBy) : names;
    if (titleChanged || dueDateChanged || descriptionChanged) return excludeActor(ownerNames(finalOwnerField));
    if (ownerChanged) return excludeActor(ownerNames(finalOwnerField).filter(n => !ownerNames(current.owner).includes(n)));
    return [];
  };

  // Same staffList the returned context exposes (real CSV data with live supervisor reassignments
  // applied), just callable from inside CRUD functions defined before that computation runs — safe
  // because these are closures that only execute later (on a button click), by which point `data`
  // has long since loaded.
  const resolveEffectiveStaffList = (): { name: string; dept: string; supervisor?: string; hod?: boolean }[] =>
    (data?.staffList ?? _staffList).map((s: { supervisor?: string; hod?: boolean; [key: string]: unknown }) =>
      ("id" in s && supervisorOverrides[s.id as string]) ? { ...s, supervisor: supervisorOverrides[s.id as string] } : s
    ) as { name: string; dept: string; supervisor?: string; hod?: boolean }[];

  // Detects whether any of the given (newly appointed) owner names actually belongs to a different
  // department than this Key Result's own — if so, that appointment needs 3-party consent (the
  // appointee, their HOD, and their direct leave supervisor) rather than just the appointee's own
  // acknowledgement. See crossDeptApproval on KeyResult for the full rationale/simplification notes.
  const detectCrossDeptAppointment = (
    newOwnerNames: string[], isOps: boolean, requestedBy: string,
  ): KeyResult["crossDeptApproval"] => {
    const ownDept = isOps ? opsCurrentUser.department : _currentUser.department;
    const roster = resolveEffectiveStaffList();
    for (const name of newOwnerNames) {
      const entry = roster.find(s => s.name === name);
      if (!entry || entry.dept === ownDept) continue;
      const hodName = roster.find(s => s.dept === entry.dept && s.hod)?.name;
      const pendingFrom = [...new Set([hodName, entry.supervisor].filter((n): n is string => !!n && n !== requestedBy))];
      if (pendingFrom.length === 0) continue;
      return { appointee: name, requestedBy, pendingFrom };
    }
    return undefined;
  };

  // New Objectives/KRs always start pending every initial owner's acknowledgement — the
  // 7-working-day ack SLA (in checkOverduePenalties below) keys off `assignedDate`, stamped here.
  const addObjective = (
    objective: Omit<DeptGoal, "id" | "assignedDate" | "pendingAcknowledgementFor" | "keyResults"> & {
      keyResults?: Omit<KeyResult, "id" | "assignedDate" | "pendingAcknowledgementFor">[];
    },
    isOps: boolean,
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    const stampedKrs = (objective.keyResults ?? []).map((kr, i) => ({
      ...kr, id: `kr${Date.now()}${i}${Math.random().toString(36).slice(2, 5)}`,
      assignedDate: today, pendingAcknowledgementFor: ownerNames(kr.owner),
    }));
    // Hard cap, enforced at the data layer (not just CreateObjectivePanel's UI-side check) — a
    // department can have at most 5 department-level Objectives, and likewise at most 5 within any
    // one team-level set. No-ops rather than throwing, since the UI already blocks submission at
    // this point; this is strictly a backstop against ending up with more than 5 by any path.
    const MAX_OBJECTIVES_PER_SET = 5;
    deptGoalSetter(isOps)(prev => {
      const level = objective.level ?? "department";
      const setCount = level === "team"
        ? prev.filter(g => g.level === "team" && g.teamName === objective.teamName).length
        : prev.filter(g => (g.level ?? "department") !== "team").length;
      if (setCount >= MAX_OBJECTIVES_PER_SET) return prev;
      return [
        ...prev,
        { ...objective, keyResults: stampedKrs, id: `dg${Date.now()}`, assignedDate: today, pendingAcknowledgementFor: ownerNames(objective.owner) },
      ];
    });
  };

  // Team-level co-responsibility: once a HOD has delegated a secondary owner for a team-level OKR
  // set (setTeamOkrEditor/teamOkrEditors), that secondary owner is co-responsible for the whole
  // set — but an edit THEY make is finalised by the HOD alone, not by re-flagging whichever regular
  // KR/Objective owner happens to be on the item they touched (who had no part in this specific
  // change). HOD-made edits keep going through the regular owner(s), unchanged (fallback).
  //
  // BUG FIXED: this used to decide "was there a change worth redirecting" by checking whether
  // `fallback` (computeOwnerEditPendingAck's output, called BEFORE this) was non-empty. But that
  // output already has the actor's own name excluded — so when the secondary owner is also the
  // SOLE owner of the item they're editing (the single most common case: a team lead editing their
  // own team's KR), computeOwnerEditPendingAck legitimately returns [] (nothing left to notify
  // among "the owners" once you exclude the actor), fallback.length was 0, and this function bailed
  // out immediately without ever redirecting to the HOD — so the HOD (e.g. Sarah) was never
  // notified, and whatever stale pendingAcknowledgementFor/pendingChangeType the item already had
  // (e.g. Annabelle's own still-open "you've been appointed owner" item) was left untouched,
  // meaning Annabelle kept seeing her OWN old pending item and it looked like she was being asked
  // to acknowledge her own edit. Fix: detect "was there a change" independently, from `current`/
  // `changes` directly, so an empty owner-diff never suppresses the HOD redirect.
  const applyTeamCoResponsibility = (
    current: { title: string; owner: string; dueDate?: string; description?: string },
    changes: Partial<{ title: string; owner: string; dueDate?: string; description?: string }>,
    level: DeptGoal["level"], teamName: string | undefined, isOps: boolean, requestedBy: string | undefined,
    fallback: string[],
  ): string[] => {
    if (level !== "team" || !teamName || !requestedBy) return fallback;
    const secondaryOwner = (isOps ? opsTeamOkrEditors : teamOkrEditors)[teamName];
    if (!secondaryOwner || requestedBy !== secondaryOwner) return fallback;
    const changed = (changes.title !== undefined && changes.title !== current.title)
      || (changes.dueDate !== undefined && changes.dueDate !== (current.dueDate ?? ""))
      || (changes.description !== undefined && changes.description !== (current.description ?? ""))
      || (changes.owner !== undefined && changes.owner !== current.owner);
    if (!changed) return fallback;
    const hodName = isOps ? opsCurrentUser.name : _currentUser.name;
    return [hodName].filter(n => n !== requestedBy);
  };

  // HOD-only (the Team OKRs page's owner-facing controls never call this) — an edit re-opens
  // acknowledgement only for owners whose appointment actually changed (see
  // computeOwnerEditPendingAck above). assignedDate/ackPenaltyApplied are re-stamped whenever
  // anyone newly goes pending — otherwise the 7-working-day ack SLA sweep (sweepOkrAck) would
  // measure against the *original* (possibly months-old) assignedDate and could fire immediately.
  // `actingOnBehalfOfHod` — set only when the requester is a Director editing a department they
  // supervise but don't actually head (see DirectorViewMeta/getRelevantDeptsForViewer). A director
  // has the same editing controls as an HOD, but isn't the department's real owner/executor, so
  // their real HOD must always end up in the pending-acknowledgement list — added on top of
  // whatever computeOwnerEditPendingAck already resolved, not instead of it, since the normal
  // owner-reacknowledgement rules (e.g. a co-owner needing to re-ack a title change) still apply.
  const updateObjective = (objectiveId: string, changes: Partial<DeptGoal>, isOps: boolean, requestedBy?: string, actingOnBehalfOfHod?: string) =>
    deptGoalSetter(isOps)(prev => prev.map(g => {
      if (g.id !== objectiveId) return g;
      let pendingFor = applyTeamCoResponsibility(g, changes, g.level, g.teamName, isOps, requestedBy, computeOwnerEditPendingAck(g, changes, requestedBy));
      if (actingOnBehalfOfHod && !pendingFor.includes(actingOnBehalfOfHod)) pendingFor = [...pendingFor, actingOnBehalfOfHod];
      return {
        ...g, ...changes,
        pendingAcknowledgementFor: pendingFor.length > 0 ? pendingFor : g.pendingAcknowledgementFor,
        pendingChangeType: pendingFor.length > 0 ? "hodEdit" : g.pendingChangeType,
        assignedDate: pendingFor.length > 0 ? new Date().toISOString().slice(0, 10) : g.assignedDate,
        ackPenaltyApplied: pendingFor.length > 0 ? false : g.ackPenaltyApplied,
      };
    }));

  // HOD-only — rename a team-level OKR set's teamName across every DeptGoal that shares it (drives
  // both the Team OKRs page's own set header and the "Team Members With Insufficient Goals" box label for the
  // same leave supervisor, since both read this one field), and re-key that team's secondary-owner
  // delegate (if any) to the new name so the delegation isn't silently dropped.
  const renameTeam = (oldName: string, newName: string, isOps: boolean) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    deptGoalSetter(isOps)(prev => prev.map(g => (g.teamName === oldName ? { ...g, teamName: trimmed } : g)));
    const setEditorState = isOps ? setOpsTeamOkrEditorsState : setTeamOkrEditorsState;
    setEditorState(prev => {
      if (!(oldName in prev)) return prev;
      const { [oldName]: delegate, ...rest } = prev;
      return { ...rest, [trimmed]: delegate };
    });
  };

  const deleteObjective = (objectiveId: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.filter(g => g.id !== objectiveId));

  const addKeyResult = (
    objectiveId: string,
    kr: Omit<KeyResult, "id" | "assignedDate" | "pendingAcknowledgementFor">,
    isOps: boolean,
    requestedBy: string,
    actingOnBehalfOfHod?: string,
  ) => {
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: [
        ...(g.keyResults ?? []),
        {
          ...kr, id: `kr${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
          assignedDate: new Date().toISOString().slice(0, 10),
          // A director adding this KR isn't its department's real owner/executor — their real HOD
          // goes on the pending list alongside the new appointee(s), same reasoning as
          // updateObjective's actingOnBehalfOfHod above.
          pendingAcknowledgementFor: actingOnBehalfOfHod && !ownerNames(kr.owner).includes(actingOnBehalfOfHod)
            ? [...ownerNames(kr.owner), actingOnBehalfOfHod]
            : ownerNames(kr.owner),
          crossDeptApproval: detectCrossDeptAppointment(ownerNames(kr.owner), isOps, requestedBy),
        },
      ],
    })));
  };

  // HOD-only, same re-acknowledgement rationale (and assignedDate/ackPenaltyApplied re-stamp) as
  // updateObjective above — only newly-added owners go pending unless title/dueDate also changed.
  const updateKeyResult = (objectiveId: string, krId: string, changes: Partial<KeyResult>, isOps: boolean, requestedBy: string, actingOnBehalfOfHod?: string) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g, keyResults: (g.keyResults ?? []).map(k => {
        if (k.id !== krId) return k;
        let pendingFor = applyTeamCoResponsibility(k, changes, g.level, g.teamName, isOps, requestedBy, computeOwnerEditPendingAck(k, changes, requestedBy));
        if (actingOnBehalfOfHod && !pendingFor.includes(actingOnBehalfOfHod)) pendingFor = [...pendingFor, actingOnBehalfOfHod];
        // Cross-department detection only cares about names genuinely new to this KR — not
        // "everyone re-acking because the title changed too," which pendingFor also covers.
        const newlyAddedOwners = changes.owner !== undefined
          ? ownerNames(changes.owner).filter(n => !ownerNames(k.owner).includes(n))
          : [];
        const ownerFieldChanged = changes.owner !== undefined && changes.owner !== k.owner;
        const crossDeptApproval = newlyAddedOwners.length > 0
          ? detectCrossDeptAppointment(newlyAddedOwners, isOps, requestedBy)
          // The owner field changed but not to a new cross-department person (e.g. the HOD reappointed
          // a same-department replacement after a rejection) — clear any stale rejection record rather
          // than leaving it to haunt the KR forever. If the owner field wasn't touched at all, leave
          // whatever cross-department state already existed exactly as it was.
          : ownerFieldChanged ? undefined : k.crossDeptApproval;
        return {
          ...k, ...changes,
          pendingAcknowledgementFor: pendingFor.length > 0 ? pendingFor : k.pendingAcknowledgementFor,
          pendingChangeType: pendingFor.length > 0 ? "hodEdit" : k.pendingChangeType,
          assignedDate: pendingFor.length > 0 ? new Date().toISOString().slice(0, 10) : k.assignedDate,
          ackPenaltyApplied: pendingFor.length > 0 ? false : k.ackPenaltyApplied,
          crossDeptApproval,
        };
      }),
    })));

  // The appointee's HOD or direct leave supervisor accepts or rejects a cross-department
  // appointment. Accept just clears this responder from pendingFrom (the appointee's own consent is
  // separate — see acknowledgeOkrItem/pendingAcknowledgementFor). Reject removes the appointee from
  // `owner` outright and records who rejected + why, so the requesting HOD can see it and reappoint.
  const respondToCrossDeptAppointment = (
    objectiveId: string, krId: string, responderName: string,
    decision: "accept" | "reject", reason: string | undefined, isOps: boolean,
  ) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => {
        if (k.id !== krId || !k.crossDeptApproval) return k;
        if (decision === "reject") {
          const appointee = k.crossDeptApproval.appointee;
          return {
            ...k,
            owner: ownerNames(k.owner).filter(n => n !== appointee).join(", "),
            pendingAcknowledgementFor: (k.pendingAcknowledgementFor ?? []).filter(n => n !== appointee),
            crossDeptApproval: {
              ...k.crossDeptApproval, pendingFrom: [],
              rejection: { by: responderName, reason, date: new Date().toISOString().slice(0, 10) },
            },
          };
        }
        const pendingFrom = k.crossDeptApproval.pendingFrom.filter(n => n !== responderName);
        return { ...k, crossDeptApproval: pendingFrom.length > 0 ? { ...k.crossDeptApproval, pendingFrom } : undefined };
      }),
    })));

  const deleteKeyResult = (objectiveId: string, krId: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g, keyResults: (g.keyResults ?? []).filter(k => k.id !== krId),
    })));

  // Owner acknowledges the guidelines (RAG confidence monthly, score by quarter-end) for an
  // Objective (krId === null) or one of its Key Results — clears only viewerName from
  // pendingAcknowledgementFor, so a co-owner who hasn't acted yet stays pending.
  const acknowledgeOkrItem = (objectiveId: string, krId: string | null, viewerName: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => {
      if (g.id !== objectiveId) return g;
      if (krId === null) return {
        ...g,
        pendingAcknowledgementFor: (g.pendingAcknowledgementFor ?? []).filter(n => n !== viewerName),
        lastCounterRejection: undefined,
      };
      return {
        ...g,
        keyResults: (g.keyResults ?? []).map(k => (k.id === krId
          ? { ...k, pendingAcknowledgementFor: (k.pendingAcknowledgementFor ?? []).filter(n => n !== viewerName), lastCounterRejection: undefined }
          : k)),
      };
    }));

  // Owner declines the appointment and suggests an alternative — a text remark (title/description),
  // an alternative due date, or both — held for the assigning HOD to accept/reject/modify via
  // resolveOkrCounter, mirroring the existing GoalEditProposal queue-and-resolve pattern used for
  // individual performance-goal edits.
  const proposeOkrCounter = (
    objectiveId: string, krId: string | null,
    counter: { title?: string; description?: string; dueDate?: string }, isOps: boolean, proposedBy: string,
  ) => {
    const counterProposal = { ...counter, proposedDate: new Date().toISOString().slice(0, 10), proposedBy };
    deptGoalSetter(isOps)(prev => prev.map(g => {
      if (g.id !== objectiveId) return g;
      if (krId === null) return { ...g, counterProposal };
      return { ...g, keyResults: (g.keyResults ?? []).map(k => (k.id === krId ? { ...k, counterProposal } : k)) };
    }));
  };

  const resolveOkrCounter = (
    objectiveId: string, krId: string | null,
    resolution: { type: "accept" } | { type: "reject"; reason?: string } | { type: "modify"; changes: { title?: string; owner?: string; dueDate?: string } },
    isOps: boolean,
    resolvedBy?: string,
  ) => {
    if (resolution.type === "modify") {
      // HOD (or delegated team-OKR editor) directly sets the final title/owner/dueDate instead of
      // accepting the counter verbatim — reuses the same owner-diff pending-ack logic as a normal
      // edit, including excluding `resolvedBy` themselves if they also happen to be an owner, and
      // the same team-co-responsibility redirect to the HOD when `resolvedBy` is the set's
      // secondary owner (see applyTeamCoResponsibility).
      if (krId === null) {
        deptGoalSetter(isOps)(prev => prev.map(g => {
          if (g.id !== objectiveId) return g;
          const pendingFor = applyTeamCoResponsibility(g, resolution.changes, g.level, g.teamName, isOps, resolvedBy, computeOwnerEditPendingAck(g, resolution.changes, resolvedBy));
          return {
            ...g, ...resolution.changes, counterProposal: undefined, lastCounterRejection: undefined,
            pendingAcknowledgementFor: pendingFor.length > 0 ? pendingFor : g.pendingAcknowledgementFor,
            pendingChangeType: pendingFor.length > 0 ? "hodEdit" : g.pendingChangeType,
            assignedDate: pendingFor.length > 0 ? new Date().toISOString().slice(0, 10) : g.assignedDate,
            ackPenaltyApplied: pendingFor.length > 0 ? false : g.ackPenaltyApplied,
          };
        }));
      } else {
        deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
          ...g, keyResults: (g.keyResults ?? []).map(k => {
            if (k.id !== krId) return k;
            const pendingFor = applyTeamCoResponsibility(k, resolution.changes, g.level, g.teamName, isOps, resolvedBy, computeOwnerEditPendingAck(k, resolution.changes, resolvedBy));
            return {
              ...k, ...resolution.changes, counterProposal: undefined, lastCounterRejection: undefined,
              pendingAcknowledgementFor: pendingFor.length > 0 ? pendingFor : k.pendingAcknowledgementFor,
              pendingChangeType: pendingFor.length > 0 ? "hodEdit" : k.pendingChangeType,
              assignedDate: pendingFor.length > 0 ? new Date().toISOString().slice(0, 10) : k.assignedDate,
              ackPenaltyApplied: pendingFor.length > 0 ? false : k.ackPenaltyApplied,
            };
          }),
        })));
      }
      return;
    }
    // Accepting a counter-proposal verbatim doesn't normally need anyone to re-acknowledge (the
    // proposer got exactly what they asked for) — EXCEPT when it's the team's secondary owner doing
    // the accepting on behalf of the set: that's still a decision made by them, not the HOD, so per
    // the same team-co-responsibility rule as a direct edit, the HOD gets routed a review item.
    const acceptPendingFor = (level: DeptGoal["level"], teamName: string | undefined): string[] => {
      if (resolution.type !== "accept" || level !== "team" || !teamName || !resolvedBy) return [];
      const secondaryOwner = (isOps ? opsTeamOkrEditors : teamOkrEditors)[teamName];
      if (!secondaryOwner || resolvedBy !== secondaryOwner) return [];
      const hodName = isOps ? opsCurrentUser.name : _currentUser.name;
      return [hodName].filter(n => n !== resolvedBy);
    };
    deptGoalSetter(isOps)(prev => prev.map(g => {
      if (g.id !== objectiveId) return g;
      if (krId === null) {
        if (!g.counterProposal) return g;
        if (resolution.type === "reject") {
          // Re-open the original appointment's ack for just the owner who actually proposed the
          // counter — not every owner on a multi-owner Objective, most of whom never asked for
          // anything and shouldn't be re-flagged as if they had.
          return {
            ...g, counterProposal: undefined,
            lastCounterRejection: { reason: resolution.reason, date: new Date().toISOString().slice(0, 10) },
            pendingAcknowledgementFor: [g.counterProposal.proposedBy],
          };
        }
        const pendingFor = acceptPendingFor(g.level, g.teamName);
        return {
          ...g,
          title: g.counterProposal.title ?? g.title,
          description: g.counterProposal.description ?? g.description,
          dueDate: g.counterProposal.dueDate ?? g.dueDate,
          counterProposal: undefined, lastCounterRejection: undefined,
          pendingAcknowledgementFor: pendingFor,
          pendingChangeType: pendingFor.length > 0 ? "hodEdit" : g.pendingChangeType,
        };
      }
      return {
        ...g,
        keyResults: (g.keyResults ?? []).map(k => {
          if (k.id !== krId || !k.counterProposal) return k;
          if (resolution.type === "reject") {
            // Same as the Objective-level case above — only the actual proposer gets re-flagged.
            return {
              ...k, counterProposal: undefined,
              lastCounterRejection: { reason: resolution.reason, date: new Date().toISOString().slice(0, 10) },
              pendingAcknowledgementFor: [k.counterProposal.proposedBy],
            };
          }
          const pendingFor = acceptPendingFor(g.level, g.teamName);
          return {
            ...k,
            title: k.counterProposal.title ?? k.title,
            dueDate: k.counterProposal.dueDate ?? k.dueDate,
            counterProposal: undefined, lastCounterRejection: undefined,
            pendingAcknowledgementFor: pendingFor,
            pendingChangeType: pendingFor.length > 0 ? "hodEdit" : k.pendingChangeType,
          };
        }),
      };
    }));
  };

  // KR owner actions: monthly confidence update (soft cadence, no penalty) and the one-time
  // quarterly score submission (hard SLA, see checkOverduePenalties). Single-owner KRs write
  // straight through as before; multi-owner KRs route through a co-owner reconciliation step —
  // the proposing owner's value is held in pendingCoOwnerConfidence/pendingCoOwnerScore until a
  // *different* owner agrees (agreeCoOwnerConfidence/agreeCoOwnerScore) or counters (calling this
  // again as the other owner, which just re-proposes and flips who's highlighted).
  // Everyone who owes a response to a newly-reported red/amber challenge (or a below-0.7 quarterly
  // score): the Objective's own owner(s) plus the department's HOD, plus — for a team-level set
  // with a delegated secondary owner — that secondary owner too, since they're co-responsible for
  // the whole set and not just whichever Objective happens to own this particular KR. Minus the KR
  // owner themselves (no routing feedback to yourself) and de-duplicated (e.g. a HOD who is also
  // the Objective owner only appears once).
  const resolveChallengeRecipients = (
    objectiveOwnerField: string, isOps: boolean, krOwnerName: string,
    level?: DeptGoal["level"], teamName?: string,
  ): string[] => {
    const hodName = isOps ? opsCurrentUser.name : _currentUser.name;
    const secondaryOwner = level === "team" && teamName ? (isOps ? opsTeamOkrEditors : teamOkrEditors)[teamName] : undefined;
    return [...new Set([...ownerNames(objectiveOwnerField), hodName, ...(secondaryOwner ? [secondaryOwner] : [])])].filter(n => n !== krOwnerName);
  };

  const updateKeyResultConfidence = (objectiveId: string, krId: string, ragConfidence: RAG, proposedBy: string, isOps: boolean, challengeText?: string) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => {
        if (k.id !== krId) return k;
        // A recovered green confidence has nothing further to report — close out any open challenge.
        // A red/amber submission with challenge text opens (or replaces) the current challenge cycle;
        // the UI is responsible for requiring non-empty text before calling this at all.
        const challengeFields: Partial<KeyResult> = ragConfidence === "green"
          ? { challengeRemark: undefined, pendingChallengeResponseFor: undefined, challengeResponse: undefined, pendingChallengeAckByOwner: undefined }
          : challengeText
            ? {
                challengeRemark: { text: challengeText, date: new Date().toISOString().slice(0, 10), rag: ragConfidence as "red" | "amber" },
                pendingChallengeResponseFor: resolveChallengeRecipients(g.owner, isOps, proposedBy, g.level, g.teamName),
                challengeResponse: undefined,
                pendingChallengeAckByOwner: false,
              }
            : {};
        if (ownerNames(k.owner).length <= 1) {
          return { ...k, ragConfidence, ragConfidenceUpdatedDate: new Date().toISOString().slice(0, 10), pendingCoOwnerConfidence: undefined, ...challengeFields };
        }
        return { ...k, pendingCoOwnerConfidence: { rag: ragConfidence, proposedBy, proposedDate: new Date().toISOString().slice(0, 10) }, ...challengeFields };
      }),
    })));

  const respondToChallengeRemark = (objectiveId: string, krId: string, responseText: string, respondedBy: string, isOps: boolean, isAI?: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId && k.challengeRemark
        ? {
            ...k,
            challengeResponse: { text: responseText, date: new Date().toISOString().slice(0, 10), respondedBy, isAI },
            pendingChallengeResponseFor: undefined,
            pendingChallengeAckByOwner: true,
          }
        : k)),
    })));

  const acknowledgeChallengeResponse = (objectiveId: string, krId: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId ? { ...k, pendingChallengeAckByOwner: false } : k)),
    })));

  const submitKeyResultScore = (objectiveId: string, krId: string, score: number, proposedBy: string, isOps: boolean, scoreRemarkText?: string) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => {
        if (k.id !== krId) return k;
        // A green score (0.7+) has nothing further to report — close out any open score remark. A
        // below-green submission with remark text opens (or replaces) the current score-remark
        // cycle; the UI is responsible for requiring non-empty text before calling this at all.
        const scoreRemarkFields: Partial<KeyResult> = score >= 0.7
          ? { scoreRemark: undefined, pendingScoreResponseFor: undefined, scoreResponse: undefined, pendingScoreAckByOwner: undefined }
          : scoreRemarkText
            ? {
                scoreRemark: { text: scoreRemarkText, date: new Date().toISOString().slice(0, 10), score },
                pendingScoreResponseFor: resolveChallengeRecipients(g.owner, isOps, proposedBy, g.level, g.teamName),
                scoreResponse: undefined,
                pendingScoreAckByOwner: false,
              }
            : {};
        if (ownerNames(k.owner).length <= 1) {
          return { ...k, score, scoreSubmittedDate: new Date().toISOString().slice(0, 10), pendingCoOwnerScore: undefined, ...scoreRemarkFields };
        }
        return { ...k, pendingCoOwnerScore: { score, proposedBy, proposedDate: new Date().toISOString().slice(0, 10) }, ...scoreRemarkFields };
      }),
    })));

  const respondToScoreRemark = (objectiveId: string, krId: string, responseText: string, respondedBy: string, isOps: boolean, isAI?: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId && k.scoreRemark
        ? {
            ...k,
            scoreResponse: { text: responseText, date: new Date().toISOString().slice(0, 10), respondedBy, isAI },
            pendingScoreResponseFor: undefined,
            pendingScoreAckByOwner: true,
          }
        : k)),
    })));

  const acknowledgeScoreResponse = (objectiveId: string, krId: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId ? { ...k, pendingScoreAckByOwner: false } : k)),
    })));

  // A different co-owner agrees with the proposed value — finalizes it into the live field.
  const agreeCoOwnerConfidence = (objectiveId: string, krId: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId && k.pendingCoOwnerConfidence
        ? { ...k, ragConfidence: k.pendingCoOwnerConfidence.rag, ragConfidenceUpdatedDate: new Date().toISOString().slice(0, 10), pendingCoOwnerConfidence: undefined }
        : k)),
    })));

  const agreeCoOwnerScore = (objectiveId: string, krId: string, isOps: boolean) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId && k.pendingCoOwnerScore
        ? { ...k, score: k.pendingCoOwnerScore.score, scoreSubmittedDate: new Date().toISOString().slice(0, 10), pendingCoOwnerScore: undefined, alignedScoreThisQuarter: true }
        : k)),
    })));

  // HOD-only score override — conspicuously highlighted (via pendingChangeType: "hodScore") on the
  // owner's Team OKRs/My Goals card until they acknowledge it via acknowledgeOkrItem. Re-stamps
  // assignedDate/ackPenaltyApplied for the same reason as updateObjective/updateKeyResult above —
  // affects the whole shared result, so every current owner re-acks (not just newly added ones).
  // Same below-0.7-needs-a-rationale rule as the owner's own submitKeyResultScore — the UI is
  // responsible for requiring non-empty text before calling this at all with a score under 0.7.
  // Stored straight onto scoreRemark (not routed through the challenge/response reconciliation
  // loop that submitKeyResultScore uses) since the direction here is the HOD informing the owner,
  // not the owner reporting upward — the owner sees it right in their acknowledgement banner.
  const overrideKeyResultScore = (objectiveId: string, krId: string, score: number, isOps: boolean, scoreRemarkText?: string) =>
    deptGoalSetter(isOps)(prev => prev.map(g => (g.id !== objectiveId ? g : {
      ...g,
      keyResults: (g.keyResults ?? []).map(k => (k.id === krId
        ? {
            ...k, score, scoreSubmittedDate: new Date().toISOString().slice(0, 10),
            scoreRemark: score >= 0.7 ? undefined : scoreRemarkText ? { text: scoreRemarkText, date: new Date().toISOString().slice(0, 10), score } : k.scoreRemark,
            pendingAcknowledgementFor: ownerNames(k.owner), pendingChangeType: "hodScore", assignedDate: new Date().toISOString().slice(0, 10), ackPenaltyApplied: false,
          }
        : k)),
    })));

  const isOpsTier = tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";

  // Live-state-backed skills lookup (falls back to the static seed if not yet found) — this is
  // the same source mutated by addPendingSkill / endorseTeamMemberSkill / rejectTeamMemberSkill,
  // so "my skills profile" and "team skills pending review" always stay in sync for every persona.
  const opsSkillsFor = (memberId: string, fallback: { verified: string[]; pending: string[] }) =>
    liveOpsAllTeamMemberSkills.find(m => m.memberId === memberId) ?? fallback;

  const opsMeta = useMemo<OpsMeta | null>(() => {
    if (tier === "ops_hod") return {
      personaId: "u21",
      user: { ...opsCurrentUser },
      performanceGoals: [],
      devGoals: opsHodDevGoalsState,
      upsertDevGoal: upsertOpsHodDevGoal,
      deleteDevGoal: deleteOpsHodDevGoal,
      skills: opsSkillsFor("u21", opsHodSkills),
      jobMatches: opsHodJobMatches,
      milestones: opsHodDevMilestones,
      teamMembers: liveOpsTeamMembers,
      departmentGoals: liveOpsDepartmentGoals,
    };
    if (tier === "ops_mgr1") return {
      personaId: "u22",
      user: { ...opsMgr1User },
      performanceGoals: [],
      devGoals: opsMgr1DevGoalsState,
      upsertDevGoal: upsertOpsMgr1DevGoal,
      deleteDevGoal: deleteOpsMgr1DevGoal,
      skills: opsSkillsFor("u22", opsMgr1Skills),
      jobMatches: opsMgr1JobMatches,
      milestones: opsMgr1DevMilestones,
    };
    if (tier === "ops_mgr2") return {
      personaId: "u23",
      user: { ...opsMgr2User },
      performanceGoals: [],
      devGoals: opsMgr2DevGoalsState,
      upsertDevGoal: upsertOpsMgr2DevGoal,
      deleteDevGoal: deleteOpsMgr2DevGoal,
      skills: opsSkillsFor("u23", opsMgr2Skills),
      jobMatches: opsMgr2JobMatches,
      milestones: opsMgr2DevMilestones,
    };
    return null;
  }, [
    tier,
    liveOpsAllTeamMemberSkills,
    opsHodDevGoalsState, opsMgr1DevGoalsState, opsMgr2DevGoalsState,
    upsertOpsHodDevGoal, deleteOpsHodDevGoal,
    upsertOpsMgr1DevGoal, deleteOpsMgr1DevGoal,
    upsertOpsMgr2DevGoal, deleteOpsMgr2DevGoal,
    liveOpsTeamMembers,
  ]);

  // Director identity — real name/department pulled straight from the same staffList row
  // everyone else's identity resolves from (u300/u301), not a bespoke hardcoded object, so a
  // future real-data swap-in (see DIRECTOR_PERSONAS) only ever requires editing users.csv.
  const directorMeta = useMemo<DirectorViewMeta | null>(() => {
    const persona = DIRECTOR_PERSONAS.find(p => p.tier === tier);
    if (!persona) return null;
    const row = (data?.staffList ?? _staffList as unknown as AppData["staffList"]).find(
      (s: { id?: string; [key: string]: unknown }) => s.id === persona.id,
    ) as { name?: string; dept?: string; role?: string } | undefined;
    return {
      personaId: persona.id,
      name: row?.name ?? persona.name,
      department: row?.dept ?? "Executive Office",
      designation: row?.role ?? persona.designation,
      avatar: persona.avatar,
    };
  }, [tier, data]);

  const d = data;

  return (
    <Ctx.Provider value={{
      tier, setTier, section, setSection, isLoading, points, staffPoints, adminPoints, addPoints, awardMemberPoints,
      focusedTeamMemberId, setFocusedTeamMemberId,
      teamMemberDrawerReturnHome, setTeamMemberDrawerReturnHome,
      focusedSkillsMemberId, setFocusedSkillsMemberId,
      teamMemberPendingSkills: liveTeamMemberSkills,
      allTeamMemberSkills: isOpsTier ? liveOpsAllTeamMemberSkills : (d?.allTeamMemberSkills ?? []),
      endorseTeamMemberSkill,
      rejectTeamMemberSkill,
      currentUser: d?.currentUser ?? _currentUser,
      departmentGoals: isOpsTier ? liveOpsDepartmentGoals : liveDepartmentGoals,
      teamMembers: isOpsTier ? liveOpsTeamMembers : liveTeamMembers,
      staffMemberId, setStaffMemberId,
      adminMemberId, setAdminMemberId,
      staffDevGoals,
      adminDevGoals,
      managerDevGoals,
      upsertStaffDevGoal,
      deleteStaffDevGoal,
      upsertAdminDevGoal,
      deleteAdminDevGoal,
      upsertManagerDevGoal,
      deleteManagerDevGoal,
      // Merge in the live ops-persona dev goal state so HOD/leave-supervisor drawer views always
      // see a member's full dev goal list, regardless of which ops persona is currently switched to.
      teamDevGoalsById: { ...teamDevGoalsById, u22: opsMgr1DevGoalsState, u23: opsMgr2DevGoalsState },
      upsertTeamDevGoal,
      deleteTeamDevGoal,
      updateGoalRag,
      addGoalRemark,
      modifyGoal,
      proposeGoal,
      approveGoal,
      acknowledgeGoal,
      recommendGoal,
      pendingGoalEditProposals,
      proposeGoalEdit,
      resolveGoalEditProposal,
      pendingDevGoalRecs,
      declinedDevGoalRecs,
      recommendDevGoal,
      acknowledgeDevGoalRec,
      declineDevGoalRec,
      pendingPerfGoalRecs,
      acknowledgedPerfGoalRecs,
      declinedPerfGoalRecs,
      recommendPerfGoal,
      acknowledgePerfGoalRec,
      declinePerfGoalRec,
      deptGoalSkills,
      updateGoalSkills,
      checkIns,
      addCheckIn,
      toggleCheckInActionItem,
      pulseResponses,
      submitPulseResponse,
      managerEffectivenessRatings,
      submitManagerEffectivenessRating,
      aiActivityLog,
      logAiActivity,
      pendingDueDateGoals,
      flagGoalPendingDueDate,
      clearPendingDueDate,
      opsDepartmentGoals: liveOpsDepartmentGoals,
      opsAllTeamMemberSkills: liveOpsAllTeamMemberSkills,
      opsTeamMembersAll: liveOpsTeamMembers,
      hcwmTeamMembers: liveTeamMembers,
      hcwmDepartmentGoals: liveDepartmentGoals,
      hcwmAllTeamMemberSkills: d?.allTeamMemberSkills ?? [],
      myGoals: (d?.myGoals ?? _myGoals) as unknown as AppData["myGoals"],
      skills: d?.skills ?? _skills,
      jobMatches: d?.jobMatches ?? _jobMatches,
      surveyData: tier === "ops_hod" ? opsHodSurveyData : tier === "ops_mgr1" ? opsMgr1SurveyData : tier === "staff" ? _anabelleSurveyData : (d?.surveyData ?? _surveyData),
      actionPlanItems: d?.actionPlanItems ?? _actionPlanItems,
      rewardsCatalog: liveRewardsCatalog, updateRewardCatalogItem,
      pointsLog: d?.pointsLog ?? _pointsLog,
      corporateValues: d?.corporateValues ?? _corporateValues,
      onboardingMilestones: d?.onboardingMilestones ?? _onboardingMilestones,
      devMilestones: d?.devMilestones ?? _devMilestones,
      staffList: (d?.staffList ?? _staffList).map((s: { id?: string; supervisor?: string; [key: string]: unknown }) =>
        (s.id && supervisorOverrides[s.id]) ? { ...s, supervisor: supervisorOverrides[s.id] } : s
      ) as AppData["staffList"],
      disabledStaffList: d?.disabledStaffList ?? [],
      colleagues: d?.colleagues ?? _colleagues,
      resolveRemark, addPendingSkill, redeemReward, toggleActionPlanItem, logCompliment, saveDepartmentGoals,
      addObjective, updateObjective, renameTeam, deleteObjective, addKeyResult, updateKeyResult, deleteKeyResult,
      respondToCrossDeptAppointment,
      acknowledgeOkrItem, proposeOkrCounter, resolveOkrCounter, updateKeyResultConfidence, submitKeyResultScore,
      agreeCoOwnerConfidence, agreeCoOwnerScore,
      respondToChallengeRemark, acknowledgeChallengeResponse,
      respondToScoreRemark, acknowledgeScoreResponse,
      overrideKeyResultScore,
      teamOkrEditors: isOpsTier ? opsTeamOkrEditors : teamOkrEditors,
      setTeamOkrEditor,
      teamBoxNames: isOpsTier ? opsTeamBoxNames : teamBoxNames,
      renameTeamBox,
      skillAttachments, markAttachmentViewed, devGoalAttachments, attachDevGoalCertificate,
      nudgedGoalIds, nudgeGoal, sendEncouragementNote,
      focusedGoalId, setFocusedGoalId,
      focusedObjectiveId, focusObjective, clearFocusedObjective, focusedObjectiveExpandKrs,
      liveActivities, addActivity, updateActivity, deleteActivity, bulkUpsertActivities,
      updateSupervisor,
      managerInputs, saveManagerInput,
      acknowledgedManagerInputs, acknowledgeManagerFeedback,
      opsMeta,
      directorMeta,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AppProvider missing");
  return c;
}
