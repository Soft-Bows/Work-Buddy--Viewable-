import type { DeptGoal, TeamMember } from "./mockData";
import { ownerNames } from "./utils";

// Canonical (staffList/users.csv) names of the two departments with a fully wired OKR/goals data
// set. Shared so every dept-name-keyed lookup (AdminSection's org-wide view, and the HOD/Director-
// scoped views on Team OKRs / Skills Profile) agrees on the exact same strings.
export const HCWM_DEPT_NAME = "Human Capital & Workplace Management";
export const CREDIT_RISK_DEPT_NAME = "Credit Risk Management (F.K.A. Credit Admin)";

// ── Key Staff Challenges — keyword classifier ───────────────────────────────────
// No live LLM call in this app (see AI_REC_RULES in MyGoalsSection.tsx) — every "AI" feature here is
// a curated, ordered keyword-rule classifier. First gate on whether the remark reads as a
// challenge/concern at all, then bucket it into one of the known themes. Shared by AdminSection
// (org-wide, every department) and the HOD/Director-scoped "Key Staff Challenges" section on the
// Team OKRs page (Team Members With Insufficient Goals' sibling) — same logic, different member scope.

export const CHALLENGE_GATE_KEYWORDS = [
  "blocker", "block", "concern", "need help", "could use", "pending", "would value",
  "flag", "stuck", "risk", "gap", "issue", "delay", "could we", "align on",
  "waiting on", "waiting for", "prioriti",
];

export const CHALLENGE_THEME_RULES: Array<{ keywords: string[]; theme: string }> = [
  { keywords: ["stakeholder", "align", "sign-off", "signoff", "decision", "comms plan", "go-live"], theme: "Stakeholder alignment & decision velocity" },
  { keywords: ["resourc", "capacity", "bandwidth", "backfill", "headcount", "volume", "peak"], theme: "Resource & capacity for cross-functional work" },
  { keywords: ["career", "growth", "promot", "mentor", "path"], theme: "Career path clarity for mid-tenure ICs" },
  { keywords: ["tool", "infra", "deploy", "prod", "analytics", "dashboard", "qa", "system", "platform"], theme: "Tooling gaps in analytics & reporting" },
];

export function classifyChallengeTheme(text: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  const isChallenge = CHALLENGE_GATE_KEYWORDS.some(kw => lower.includes(kw));
  if (!isChallenge) return null;
  const match = CHALLENGE_THEME_RULES.find(r => r.keywords.some(kw => lower.includes(kw)));
  return match?.theme ?? CHALLENGE_THEME_RULES[0].theme;
}

// Same theme bucketing as classifyChallengeTheme, but without the "does this even read like a
// challenge" gate — used for Key Result challenge remarks, which are unambiguously real challenges
// by construction (the owner can only submit one alongside a red/amber confidence), so a remark that
// happens not to contain any of the generic gate keywords (e.g. "Client hasn't confirmed contract
// terms yet") shouldn't be silently dropped the way an ungated free-text remark elsewhere would be.
function classifyChallengeThemeUngated(text: string): string {
  const lower = ` ${text.toLowerCase()} `;
  const match = CHALLENGE_THEME_RULES.find(r => r.keywords.some(kw => lower.includes(kw)));
  return match?.theme ?? CHALLENGE_THEME_RULES[0].theme;
}

export interface ChallengeEntry {
  theme: string;
  memberName: string;
  goalTitle: string;
  remarkText: string;
  linkedDeptTitle: string;
  date?: string;
  // Present only for entries sourced from a live Key Result challenge remark (not the legacy goal
  // remark system) — carries the full thread so the UI can show response/acknowledgement status.
  response?: { text: string; date: string; respondedBy: string; isAI?: boolean };
  resolved?: boolean; // true once the KR owner has acknowledged the response
  // Real department this Objective belongs to, and whether the Objective itself is department- or
  // team-level (+ which team) — a staff member can be involved in cross-department OKRs, so this
  // is what lets the UI label the actual source instead of assuming "your own department."
  deptName?: string;
  objectiveLevel?: "department" | "team";
  teamName?: string;
  // The parent Objective's own link up to a 2026 Philly Group OKR (mockData.ts DeptGoal), if any —
  // lets the UI show the group-level objective this challenge ultimately ladders up to, not just its
  // immediate department Objective. Undefined for the legacy goal-remark path (no such field there).
  linkedPhillyGoalId?: string;
  linkedPhillyKrId?: string;
  // Who owes the next action — the HOD (+ any secondary owner) if nobody's responded yet, or the
  // other owner(s) if a response is awaiting the owner's acknowledgement. Mirrors the individual
  // Key Result card's own "Awaiting response from…" label on Team OKRs so both surfaces agree.
  pendingResponseFor?: string[];
}
export interface ChallengeThemeGroup {
  theme: string;
  entries: ChallengeEntry[];
  count: number;
}

// Computes challenge themes for a given set of members — pass every department's members (admin,
// org-wide) or just the department(s) a HOD/Director should see (scoped). deptGoalLists is keyed by
// real department name (not a bare array) so each entry can be labelled with its actual source
// department — a staff member's Key Result can live under a department they don't otherwise appear
// in this view for (cross-department OKRs), which the UI needs to be able to say plainly.
export function computeChallengeThemes(
  members: TeamMember[],
  deptGoalLists: Record<string, DeptGoal[]>,
): ChallengeThemeGroup[] {
  const allLists = Object.values(deptGoalLists);
  const resolveDeptGoalTitle = (linkedDept?: string): string => {
    if (!linkedDept) return "—";
    for (const list of allLists) {
      const found = list.find(g => g.id === linkedDept);
      if (found) return found.title;
    }
    return "—";
  };
  const entries: ChallengeEntry[] = [];
  for (const member of members) {
    for (const goal of member.goals) {
      for (const remark of goal.remarks) {
        if (remark.author !== member.name) continue; // only the goal owner's own remarks count
        const theme = classifyChallengeTheme(remark.text);
        if (!theme) continue;
        entries.push({
          theme, memberName: member.name, goalTitle: goal.title,
          remarkText: remark.text, linkedDeptTitle: resolveDeptGoalTitle(goal.linkedDept),
        });
      }
    }
  }
  // Live Key Result challenge remarks — scoped to the same `members` roster as the legacy remarks
  // above, so a non-HOD leave supervisor passing just their own direct reports sees only their own
  // team's challenges, while a HOD/Director passing the full department roster sees everything.
  const memberNames = new Set(members.map(m => m.name));
  for (const [deptName, list] of Object.entries(deptGoalLists)) {
    for (const objective of list) {
      for (const kr of objective.keyResults ?? []) {
        if (!kr.challengeRemark) continue;
        if (!ownerNames(kr.owner).some(n => memberNames.has(n))) continue;
        entries.push({
          theme: classifyChallengeThemeUngated(kr.challengeRemark.text),
          memberName: kr.owner,
          goalTitle: kr.title,
          remarkText: kr.challengeRemark.text,
          linkedDeptTitle: objective.title,
          date: kr.challengeRemark.date,
          response: kr.challengeResponse,
          resolved: !!kr.challengeResponse && !kr.pendingChallengeAckByOwner,
          deptName,
          objectiveLevel: objective.level === "team" ? "team" : "department",
          teamName: objective.teamName,
          linkedPhillyGoalId: objective.linkedPhillyGoalId,
          linkedPhillyKrId: objective.linkedPhillyKrId,
          pendingResponseFor: kr.pendingChallengeResponseFor?.length
            ? kr.pendingChallengeResponseFor
            : kr.pendingChallengeAckByOwner
            ? ownerNames(kr.owner)
            : undefined,
        });
      }
    }
  }
  const map = new Map<string, ChallengeEntry[]>();
  entries.forEach(e => {
    if (!map.has(e.theme)) map.set(e.theme, []);
    map.get(e.theme)!.push(e);
  });
  return [...map.entries()]
    .map(([theme, es]) => ({ theme, entries: es, count: es.length }))
    .sort((a, b) => b.count - a.count);
}

// ── Competency Gaps — required (HOD-tagged) skills vs. verified skills ─────────────────────────

export interface CompetencyGapRow {
  name: string;
  requiredSkills: string[];
  missing: string[];
  gapPct: number | null;
}

// A group's required skills come from every department any of its members belong to; possessed
// skills stay scoped to just that group's own members. Shared by AdminSection's org-wide
// department/job-family breakdown and the HOD/Director-scoped "Departmental Competency Gap" view on
// the Skills Profile page.
export function computeCompetencyGapRow(
  name: string,
  staff: { id: string; dept: string }[],
  goalsByDept: Record<string, { id: string }[]>,
  deptGoalSkills: Record<string, string[]>,
  allMemberSkills: { memberId: string; verified: string[] }[],
): CompetencyGapRow {
  const depts = [...new Set(staff.map(s => s.dept))];
  const requiredSkills = [...new Set(depts.flatMap(dept => (goalsByDept[dept] ?? []).flatMap(g => deptGoalSkills[g.id] ?? [])))];
  const staffIds = new Set(staff.map(s => s.id));
  const possessedSkills = new Set(
    allMemberSkills.filter(m => staffIds.has(m.memberId)).flatMap(m => m.verified)
  );
  const missing = requiredSkills.filter(s => !possessedSkills.has(s));
  const gapPct = requiredSkills.length === 0 ? null : Math.round((missing.length / requiredSkills.length) * 100);
  return { name, requiredSkills, missing, gapPct };
}

// ── HOD vs. Director scoping ────────────────────────────────────────────────────────────────────
// A HOD sees insights for their own department only. A "Director" — anyone with at least one
// HOD-flagged direct report per users.csv's supervisor/hod fields — sees an aggregate across every
// department those HOD reports themselves head. Resolved generically from staffList (the full,
// real org roster) rather than hardcoded to today's two wired personas, so it's correct for any
// future HOD/Director without further code changes.
// "Compliance" (an early synthetic seed department that never matched any real Staff Listing 2
// roster) and "Group Compliance" (the real department, per Staff Listing 2) are both out of scope
// for this dashboard — excluded here defensively so a director whose real HOD reports happen to
// include either can never have it surface in their oversight view, even though today's two wired
// director personas don't actually hit this case (their real reports are in other departments).
const EXCLUDED_DEPT_NAMES = new Set(["Compliance", "Group Compliance"]);

export function getRelevantDeptsForViewer(
  viewerName: string,
  ownDept: string,
  staffList: { name: string; dept: string; supervisor?: string; hod?: boolean }[],
): { depts: string[]; isDirector: boolean } {
  const hodReports = staffList.filter(s => s.supervisor === viewerName && s.hod && !EXCLUDED_DEPT_NAMES.has(s.dept));
  if (hodReports.length === 0) return { depts: [ownDept], isDirector: false };
  return { depts: [...new Set(hodReports.map(s => s.dept))], isDirector: true };
}

// The exact "which scope does this viewer see" decision TeamSection.tsx's Key Staff Challenges
// section has always made (HOD/Director -> getRelevantDeptsForViewer's department(s); a non-HOD
// leave supervisor -> just their own direct reports), pulled out here so Feedback Corner's
// consolidated card and TeamSection's slim summary can both call the same logic instead of two
// copies silently drifting apart.
export function resolveOwnScopeChallenges(params: {
  viewerName: string;
  isHod: boolean;
  hasDirectorMeta: boolean;
  isTeamLead: boolean;
  canonicalOwnDept: string;
  staffList: { name: string; dept: string; supervisor?: string; hod?: boolean }[];
  membersByDept: Record<string, TeamMember[]>;
  goalsByDept: Record<string, DeptGoal[]>;
  visibleMembers: TeamMember[];
  ownDeptGoals: DeptGoal[];
}): { themes: ChallengeThemeGroup[]; canView: boolean; isDirector: boolean } {
  const { viewerName, isHod, hasDirectorMeta, isTeamLead, canonicalOwnDept, staffList, membersByDept, goalsByDept, visibleMembers, ownDeptGoals } = params;
  const isLeaveSupervisorViewer = !isHod && !hasDirectorMeta && isTeamLead;
  const canView = isHod || isLeaveSupervisorViewer || hasDirectorMeta;
  if (!canView) return { themes: [], canView: false, isDirector: false };
  const { depts: relevantDepts, isDirector } = isHod || hasDirectorMeta
    ? getRelevantDeptsForViewer(viewerName, canonicalOwnDept, staffList)
    : { depts: [] as string[], isDirector: false };
  const themes = isHod || hasDirectorMeta
    ? computeChallengeThemes(
        relevantDepts.flatMap(d => membersByDept[d] ?? []),
        Object.fromEntries(relevantDepts.map(d => [d, goalsByDept[d] ?? []])),
      )
    : computeChallengeThemes(visibleMembers.filter(m => m.directManager === viewerName), { [HCWM_DEPT_NAME]: ownDeptGoals });
  return { themes, canView, isDirector };
}
