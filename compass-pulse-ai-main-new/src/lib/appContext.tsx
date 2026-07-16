import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tier, TeamMember, RAG, PersonalDevGoal, Activity } from "./mockData";
import {
  currentUser as _currentUser,
  departmentGoals as _departmentGoals,
  teamMembers as _teamMembers,
  myGoals as _myGoals,
  staffInitialDevGoals as _staffInitialDevGoals,
  adminInitialDevGoals as _adminInitialDevGoals,
  priyaDevGoals as _priyaDevGoals,
  jamesDevGoals as _jamesDevGoals,
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
  noelDevGoals as _noelDevGoals,
  keeganDevGoals as _keeganDevGoals,
  jingleDevGoals as _jingleDevGoals,
  noelPerformanceGoals,
  noelSkills, keeganSkills, jingleSkills,
  noelJobMatches, keeganJobMatches, jingleJobMatches,
  keeganUser, jingleUser,
  opsAllTeamMemberSkills as _opsAllTeamMemberSkills,
  noelDevMilestones, keeganDevMilestones, jingleDevMilestones,
  noelSurveyData, keeganSurveyData,
} from "./opsData";
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
  departmentGoals?: typeof _opsDepartmentGoals;
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
  focusedTeamMemberId: string | null;
  setFocusedTeamMemberId: (id: string | null) => void;
  focusedSkillsMemberId: string | null;
  setFocusedSkillsMemberId: (id: string | null) => void;
  // data
  teamMemberPendingSkills: { memberId: string; memberName: string; pending: string[]; verified: string[]; notifiedDate?: string }[];
  allTeamMemberSkills: { memberId: string; memberName: string; verified: string[]; pending: string[] }[];
  endorseTeamMemberSkill: (memberId: string, skill: string) => Promise<void>;
  rejectTeamMemberSkill: (memberId: string, skill: string) => Promise<void>;
  currentUser: AppData["currentUser"];
  departmentGoals: AppData["departmentGoals"];
  teamMembers: TeamMember[];
  myGoals: AppData["myGoals"];
  skills: AppData["skills"];
  jobMatches: AppData["jobMatches"];
  surveyData: AppData["surveyData"];
  actionPlanItems: AppData["actionPlanItems"];
  rewardsCatalog: AppData["rewardsCatalog"];
  pointsLog: AppData["pointsLog"];
  corporateValues: AppData["corporateValues"];
  onboardingMilestones: AppData["onboardingMilestones"];
  devMilestones: AppData["devMilestones"];
  staffList: AppData["staffList"];
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
  modifyGoal: (memberId: string, goalId: string, changes: Partial<{ description: string; metric: string; linkedDept: string; weightage: number }>, andApprove: boolean) => void;
  proposeGoal: (memberId: string, goal: { title: string; description: string; metric: string }) => void;
  approveGoal: (memberId: string, goalId: string) => void;
  acknowledgeGoal: (memberId: string, goalId: string) => void;
  // mutations
  resolveRemark: (remarkId: string) => Promise<void>;
  addPendingSkill: (skill: string) => Promise<void>;
  redeemReward: (cost: number, name: string) => Promise<void>;
  toggleActionPlanItem: (id: string, done: boolean) => Promise<void>;
  logCompliment: (recipient: string) => Promise<void>;
  saveDepartmentGoals: (goals: { id: string; title: string; owner: string; progress: number; weightage: number; dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string }[]) => Promise<void>;
  // Manager input on team member dev goals — keyed "memberId:goalId"
  managerInputs: Record<string, string>;
  saveManagerInput: (memberId: string, goalId: string, text: string) => void;
  // Acknowledgement for manager dev-goal feedback
  acknowledgedManagerInputs: Record<string, boolean>;
  acknowledgeManagerFeedback: (memberId: string, goalId: string) => void;
  // Nudge state — goal IDs nudged by staff, so supervisor sees them at top of pending actions
  nudgedGoalIds: Set<string>;
  nudgeGoal: (goalId: string) => void;
  // Focus a specific goal on the My Goals page (e.g., from pending-action notification)
  focusedGoalId: string | null;
  setFocusedGoalId: (id: string | null) => void;
  // Activity catalog — admin-editable list of all point-earning/penalty activities
  liveActivities: Activity[];
  addActivity: (activity: Omit<Activity, "id">) => void;
  updateActivity: (id: string, changes: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  // Supervisor management — admin can update a user's direct leave supervisor
  updateSupervisor: (userId: string, newSupervisor: string) => void;
  // Operations persona overlay — non-null when tier is ops_hod/ops_mgr1/ops_mgr2
  opsMeta: OpsMeta | null;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<Tier>("manager");
  const [section, setSection] = useState("home");
  const [points, setPoints] = useState(_currentUser.pointsYTD);
  const [staffPoints, setStaffPoints] = useState(() => _teamMembers.find(m => m.id === "u1")?.pointsYTD ?? 95);
  const [adminPoints, setAdminPoints] = useState(() => _teamMembers.find(m => m.id === "u4")?.pointsYTD ?? 0);
  const staffPointsLoaded = useRef(false);
  const adminPointsLoaded = useRef(false);
  const [focusedTeamMemberId, setFocusedTeamMemberId] = useState<string | null>(null);
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
  // switchable-persona slots above (e.g. Priya, James) — so HOD/leave-supervisor drawers can
  // always show a member's full dev goal list, not just the currently-switched-to persona.
  const [teamDevGoalsById, setTeamDevGoalsById] = useState<Record<string, PersonalDevGoal[]>>({
    u2: _priyaDevGoals,
    u42: _jamesDevGoals,
  });
  const upsertTeamDevGoal = (memberId: string, goal: PersonalDevGoal) =>
    setTeamDevGoalsById(prev => {
      const existing = prev[memberId] ?? [];
      const next = existing.some(g => g.id === goal.id) ? existing.map(g => g.id === goal.id ? goal : g) : [...existing, goal];
      return { ...prev, [memberId]: next };
    });
  const deleteTeamDevGoal = (memberId: string, id: string) =>
    setTeamDevGoalsById(prev => ({ ...prev, [memberId]: (prev[memberId] ?? []).filter(g => g.id !== id) }));

  // Ops persona dev goals state (one per persona, mutated independently)
  const [noelDevGoalsState, setNoelDevGoals] = useState<PersonalDevGoal[]>(_noelDevGoals);
  const [keeganDevGoalsState, setKeeganDevGoals] = useState<PersonalDevGoal[]>(_keeganDevGoals);
  const [jingleDevGoalsState, setJingleDevGoals] = useState<PersonalDevGoal[]>(_jingleDevGoals);

  // Live Affluent Markets team members (Brandon + Frankie as seen from Eliza's HOD view)
  const [liveOpsTeamMembers, setLiveOpsTeamMembers] = useState<TeamMember[]>(_opsTeamMembers);

  const upsertNoelDevGoal = useCallback((g: PersonalDevGoal) => setNoelDevGoals(prev => prev.some(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]), []);
  const deleteNoelDevGoal = useCallback((id: string) => setNoelDevGoals(prev => prev.filter(g => g.id !== id)), []);
  const upsertKeeganDevGoal = useCallback((g: PersonalDevGoal) => setKeeganDevGoals(prev => prev.some(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]), []);
  const deleteKeeganDevGoal = useCallback((id: string) => setKeeganDevGoals(prev => prev.filter(g => g.id !== id)), []);
  const upsertJingleDevGoal = useCallback((g: PersonalDevGoal) => setJingleDevGoals(prev => prev.some(x => x.id === g.id) ? prev.map(x => x.id === g.id ? g : x) : [...prev, g]), []);
  const deleteJingleDevGoal = useCallback((id: string) => setJingleDevGoals(prev => prev.filter(g => g.id !== id)), []);

  // Live team members state — shared single source of truth for both manager and staff views
  const [liveTeamMembers, setLiveTeamMembers] = useState<TeamMember[]>(_teamMembers);
  const csvLoaded = useRef(false);

  // Live department goals — only synced from server once on first load; local mutations
  // (dueDate, RAG overrides) persist without being reset by 5s polling
  const [liveDepartmentGoals, setLiveDepartmentGoals] = useState(_departmentGoals);
  const deptGoalsLoaded = useRef(false);

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

  // Sync department goals from server exactly once — prevents 5s polling from overwriting HOD changes
  useEffect(() => {
    if (data?.departmentGoals && !deptGoalsLoaded.current) {
      setLiveDepartmentGoals(data.departmentGoals as typeof liveDepartmentGoals);
      deptGoalsLoaded.current = true;
    }
  }, [data?.departmentGoals]);

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
      setPoints(p => p + 5);
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
    setPoints(p => p + 5);
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

  // Focused goal — set from pending-action notification click so MyGoalsSection can scroll to it
  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(null);

  // Live activity catalog — admin can add/edit/delete activities in real time
  const [liveActivities, setLiveActivities] = useState<Activity[]>(_defaultActivities);
  const addActivity = (activity: Omit<Activity, "id">) =>
    setLiveActivities(prev => [...prev, { ...activity, id: `act${Date.now()}` }]);
  const updateActivity = (id: string, changes: Partial<Activity>) =>
    setLiveActivities(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  const deleteActivity = (id: string) =>
    setLiveActivities(prev => prev.filter(a => a.id !== id));

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
    changes: Partial<{ description: string; metric: string; linkedDept: string; weightage: number }>,
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
  const proposeGoal = (memberId: string, goal: { title: string; description: string; metric: string }) => {
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

  // Ops personas' skills are static-seeded, not CSV-backed, so submissions for u21/u22/u23
  // mutate the local live copy instead of calling the HCWM-only CSV-writing server function —
  // this keeps "my skills profile" and "team skills pending review" on the same source of truth.
  const addPendingSkill = async (skill: string) => {
    if (tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2") {
      const memberId = tier === "ops_hod" ? "u21" : tier === "ops_mgr1" ? "u22" : "u23";
      setLiveOpsAllTeamMemberSkills(prev => prev.map(m => m.memberId !== memberId ? m : {
        ...m,
        pending: [...m.pending, skill],
      }));
      return;
    }
    const userId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : "u0";
    await addPendingSkillFn({ data: { userId, skill } });
    await invalidate();
  };

  const redeemReward = async (cost: number, name: string) => {
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
    setPoints(p => p + 25);
    await logComplimentFn({ data: { recipient } });
    await invalidate();
  };

  const saveDepartmentGoals = async (goals: { id: string; title: string; owner: string; progress: number; weightage: number; dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string }[]) => {
    setLiveDepartmentGoals(goals as typeof liveDepartmentGoals);
    await updateDepartmentGoalsFn({ data: { goals } });
  };

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
      performanceGoals: noelPerformanceGoals,
      devGoals: noelDevGoalsState,
      upsertDevGoal: upsertNoelDevGoal,
      deleteDevGoal: deleteNoelDevGoal,
      skills: opsSkillsFor("u21", noelSkills),
      jobMatches: noelJobMatches,
      milestones: noelDevMilestones,
      teamMembers: liveOpsTeamMembers,
      departmentGoals: _opsDepartmentGoals,
    };
    if (tier === "ops_mgr1") return {
      personaId: "u22",
      user: { ...keeganUser },
      performanceGoals: [],
      devGoals: keeganDevGoalsState,
      upsertDevGoal: upsertKeeganDevGoal,
      deleteDevGoal: deleteKeeganDevGoal,
      skills: opsSkillsFor("u22", keeganSkills),
      jobMatches: keeganJobMatches,
      milestones: keeganDevMilestones,
    };
    if (tier === "ops_mgr2") return {
      personaId: "u23",
      user: { ...jingleUser },
      performanceGoals: [],
      devGoals: jingleDevGoalsState,
      upsertDevGoal: upsertJingleDevGoal,
      deleteDevGoal: deleteJingleDevGoal,
      skills: opsSkillsFor("u23", jingleSkills),
      jobMatches: jingleJobMatches,
      milestones: jingleDevMilestones,
    };
    return null;
  }, [
    tier,
    liveOpsAllTeamMemberSkills,
    noelDevGoalsState, keeganDevGoalsState, jingleDevGoalsState,
    upsertNoelDevGoal, deleteNoelDevGoal,
    upsertKeeganDevGoal, deleteKeeganDevGoal,
    upsertJingleDevGoal, deleteJingleDevGoal,
    liveOpsTeamMembers,
  ]);

  const d = data;

  return (
    <Ctx.Provider value={{
      tier, setTier, section, setSection, isLoading, points, staffPoints, adminPoints, addPoints,
      focusedTeamMemberId, setFocusedTeamMemberId,
      focusedSkillsMemberId, setFocusedSkillsMemberId,
      teamMemberPendingSkills: liveTeamMemberSkills,
      allTeamMemberSkills: isOpsTier ? liveOpsAllTeamMemberSkills : (d?.allTeamMemberSkills ?? []),
      endorseTeamMemberSkill,
      rejectTeamMemberSkill,
      currentUser: d?.currentUser ?? _currentUser,
      departmentGoals: (isOpsTier ? _opsDepartmentGoals : liveDepartmentGoals) as AppData["departmentGoals"],
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
      teamDevGoalsById: { ...teamDevGoalsById, u22: keeganDevGoalsState, u23: jingleDevGoalsState },
      upsertTeamDevGoal,
      deleteTeamDevGoal,
      updateGoalRag,
      addGoalRemark,
      modifyGoal,
      proposeGoal,
      approveGoal,
      acknowledgeGoal,
      myGoals: (d?.myGoals ?? _myGoals) as unknown as AppData["myGoals"],
      skills: d?.skills ?? _skills,
      jobMatches: d?.jobMatches ?? _jobMatches,
      surveyData: tier === "ops_hod" ? noelSurveyData : tier === "ops_mgr1" ? keeganSurveyData : tier === "staff" ? _anabelleSurveyData : (d?.surveyData ?? _surveyData),
      actionPlanItems: d?.actionPlanItems ?? _actionPlanItems,
      rewardsCatalog: d?.rewardsCatalog ?? _rewardsCatalog,
      pointsLog: d?.pointsLog ?? _pointsLog,
      corporateValues: d?.corporateValues ?? _corporateValues,
      onboardingMilestones: d?.onboardingMilestones ?? _onboardingMilestones,
      devMilestones: d?.devMilestones ?? _devMilestones,
      staffList: (d?.staffList ?? _staffList).map((s: { id?: string; supervisor?: string; [key: string]: unknown }) =>
        (s.id && supervisorOverrides[s.id]) ? { ...s, supervisor: supervisorOverrides[s.id] } : s
      ) as AppData["staffList"],
      colleagues: d?.colleagues ?? _colleagues,
      resolveRemark, addPendingSkill, redeemReward, toggleActionPlanItem, logCompliment, saveDepartmentGoals,
      nudgedGoalIds, nudgeGoal,
      focusedGoalId, setFocusedGoalId,
      liveActivities, addActivity, updateActivity, deleteActivity,
      updateSupervisor,
      managerInputs, saveManagerInput,
      acknowledgedManagerInputs, acknowledgeManagerFeedback,
      opsMeta,
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
