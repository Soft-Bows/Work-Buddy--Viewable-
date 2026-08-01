import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Goal, TeamMember, RAG } from "./mockData";
import { workingDaysSince, formatJobGrade } from "./utils";
import { formatJoinDateAsPassword, isPasswordStrong } from "./passwordPolicy";

const DATA_DIR = join(process.cwd(), "datasrc");

// ── CSV helpers ───────────────────────────────────────────────────────────────

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(f => f.trim());
}

function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

function toCsv(headers: string[], rows: Record<string, string>[]): string {
  const esc = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"` : v;
  return [
    headers.join(","),
    ...rows.map(r => headers.map(h => esc(r[h] ?? "")).join(",")),
  ].join("\n") + "\n";
}

function readCsv(file: string): Record<string, string>[] {
  const p = join(DATA_DIR, file);
  if (!existsSync(p)) return [];
  try { return parseCsv(readFileSync(p, "utf8")); }
  catch { return []; }
}

function writeCsv(file: string, headers: string[], rows: Record<string, string>[]) {
  writeFileSync(join(DATA_DIR, file), toCsv(headers, rows), "utf8");
}

// ── Data assembly ─────────────────────────────────────────────────────────────

export function loadAllData() {
  const users = readCsv("users.csv");
  const deptGoalRows = readCsv("department_goals.csv");
  const goalRows = readCsv("goals.csv");
  const quarterRows = readCsv("goal_quarters.csv");
  const remarkRows = readCsv("goal_remarks.csv");
  const userSkillRows = readCsv("user_skills.csv");
  const skillsCatalogRows = readCsv("skills_catalog.csv");
  const jobMatchRows = readCsv("job_matches.csv");
  const surveyRows = readCsv("survey_data.csv");
  const actionPlanRows = readCsv("action_plan_items.csv");
  const rewardsCatalogRows = readCsv("rewards_catalog.csv");
  const pointsLogRows = readCsv("points_log.csv");
  const corpValueRows = readCsv("corporate_values.csv");
  const milestoneRows = readCsv("milestones.csv");

  // Helper: auto-disable accounts whose last_day_of_service is in the past
  const today = new Date().toISOString().slice(0, 10);
  const isActive = (u: Record<string, string>) => {
    if (u.status === "disabled") return false;
    if (u.last_day_of_service && u.last_day_of_service <= today) return false;
    return true;
  };

  // Helper: compute tenure label from join_date
  const tenureLabel = (joinDate: string): string => {
    if (!joinDate) return "—";
    const ms = Date.now() - new Date(joinDate).getTime();
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 1) return "< 1 month";
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${yrs} yr${yrs !== 1 ? "s" : ""} ${rem} mo` : `${yrs} yr${yrs !== 1 ? "s" : ""}`;
  };

  // Current user (u0)
  const cu = users.find(u => u.id === "u0") ?? users[0];
  const currentUser = {
    name: cu.name,
    email: cu.email,
    department: cu.department,
    designation: cu.designation,
    grade: Number(cu.grade),
    joinDate: cu.join_date,
    tenureYears: Number(cu.tenure_years),
    hod: cu.hod === "true",
    pointsYTD: Number(cu.points_ytd),
    avatar: cu.avatar,
  };

  // Department goals
  const departmentGoals = deptGoalRows.map(g => ({
    id: g.id,
    title: g.title,
    owner: g.owner,
    progress: Number(g.progress),
    weightage: Number(g.weightage ?? 0),
    dueDate: g.due_date || undefined,
    ragQ1: g.rag_q1 || undefined,
    ragQ2: g.rag_q2 || undefined,
    ragQ3: g.rag_q3 || undefined,
    ragQ4: g.rag_q4 || undefined,
  }));

  // Helper: build a Goal from a CSV row
  const buildGoal = (g: Record<string, string>): Goal => ({
    id: g.id,
    title: g.title,
    description: g.description,
    metric: g.metric,
    linkedDept: g.linked_dept || undefined,
    weightage: g.weightage ? Number(g.weightage) : undefined,
    approved: g.approved === "true",
    quarters: quarterRows
      .filter(q => q.goal_id === g.id)
      .map(q => ({ q: q.quarter as "Q1" | "Q2" | "Q3" | "Q4", rag: q.rag as RAG })),
    remarks: remarkRows
      .filter(r => r.goal_id === g.id)
      .map(r => ({
        id: r.id,
        author: r.author,
        text: r.text,
        date: r.date,
        pending: r.pending === "true",
      })),
  });

  // Derive overall RAG for a user from their latest quarter RAGs
  const getMemberRag = (userId: string): RAG => {
    const userGoals = goalRows.filter(g => g.user_id === userId && g.goal_type === "team");
    const rags = userGoals.flatMap(g =>
      quarterRows.filter(q => q.goal_id === g.id).map(q => q.rag)
    );
    if (rags.includes("red")) return "red";
    if (rags.includes("amber")) return "amber";
    return "green";
  };

  // Team members — all staff in the same department as the current user
  const teamMembers: TeamMember[] = users
    .filter(u => (u.role_type === "staff" || u.role_type === "manager") && u.department === cu.department && u.id !== "u0")
    .map(u => ({
      id: u.id,
      name: u.name,
      role: u.designation,
      avatar: u.avatar,
      rag: getMemberRag(u.id),
      directManager: u.supervisor || "—",
      pointsYTD: Number(u.points_ytd) || 0,
      joinDate: u.join_date,
      goals: goalRows
        .filter(g => g.user_id === u.id && g.goal_type === "team")
        .map(buildGoal),
    }));

  // My goals (u0)
  const myGoals = {
    performance: goalRows
      .filter(g => g.user_id === "u0" && g.goal_type === "performance")
      .map(g => {
        const qRags = quarterRows.filter(q => q.goal_id === g.id);
        const latestRag = qRags.length > 0 ? (qRags[qRags.length - 1].rag as RAG) : ("green" as RAG);
        return {
          id: g.id,
          title: g.title,
          description: g.description,
          metric: g.metric,
          rag: latestRag,
          linkedDept: g.linked_dept || undefined,
        };
      }),
    development: goalRows
      .filter(g => g.user_id === "u0" && g.goal_type.trim() === "development")
      .map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        target: g.metric || "TBD",
      })),
  };

  // Skills
  const u0Skills = userSkillRows.filter(s => s.user_id === "u0");
  const skills = {
    verified: u0Skills.filter(s => s.status === "verified").map(s => s.skill),
    pending: u0Skills.filter(s => s.status === "pending").map(s => s.skill),
    catalog: skillsCatalogRows.map(s => s.name),
  };

  // Job matches
  const jobMatches = jobMatchRows.map(j => ({
    id: j.id,
    title: j.title,
    dept: j.department,
    match: Number(j.match_pct),
    url: j.url || "",
  }));

  // Team member pending skills — only direct reports (supervisor === current user's name)
  const directReportIds = new Set(
    users.filter(u => u.supervisor === cu.name).map(u => u.id)
  );
  const teamMemberPendingSkills = teamMembers
    .filter(m => directReportIds.has(m.id))
    .map(m => ({
      memberId: m.id,
      memberName: m.name,
      pending: userSkillRows.filter(s => s.user_id === m.id && s.status === "pending").map(s => s.skill),
      verified: userSkillRows.filter(s => s.user_id === m.id && s.status === "verified").map(s => s.skill),
      notifiedDate: "2026-06-10",
    }))
    .filter(m => m.pending.length > 0);

  // Full skills for every P&C team member (used by staff/admin tier views)
  const allTeamMemberSkills = teamMembers.map(m => ({
    memberId: m.id,
    memberName: m.name,
    verified: userSkillRows.filter(s => s.user_id === m.id && s.status === "verified").map(s => s.skill),
    pending: userSkillRows.filter(s => s.user_id === m.id && s.status === "pending").map(s => s.skill),
  }));

  // Survey data
  const surveyData = surveyRows.map(s => ({
    competency: s.competency,
    benchmark: Number(s.benchmark),
    you: Number(s.score),
  }));

  // Action plan items
  const actionPlanItems = actionPlanRows.map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    desc: a.description,
    done: a.done === "true",
    deadline: a.deadline,
    postedDate: a.posted_date,
  }));

  // Rewards catalog
  const rewardsCatalog = rewardsCatalogRows.map(r => ({
    id: r.id,
    name: r.name,
    points: Number(r.points),
    icon: r.icon,
    brands: r.brands ? r.brands.split(",").map(b => b.trim()) : [],
  }));

  // Points log — sort newest-first so Recent Activity always shows latest actions at the top
  const pointsLog = [...pointsLogRows]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .map(p => ({
      id: p.id,
      userId: p.user_id,
      text: p.description,
      pts: Number(p.points),
      date: timeAgo(p.date),
      rawDate: p.date,
    }));

  // Corporate values
  const corporateValues = corpValueRows.map(v => ({
    id: v.id,
    name: v.name,
    icon: v.icon,
  }));

  // Milestones
  const u0Milestones = milestoneRows.filter(m => m.user_id === "u0");
  const onboardingMilestones = u0Milestones
    .filter(m => m.type === "onboarding")
    .map(m => ({ id: m.id, name: m.name, date: m.date_target, complete: m.complete === "true" }));
  const devMilestones = u0Milestones
    .filter(m => m.type !== "onboarding")
    .map(m => ({ id: m.id, name: m.name, date: m.date_target, complete: m.complete === "true", type: m.type }));

  // Staff list — all active accounts (no hardcoded +247 offset)
  const staffList = users
    .filter(u => isActive(u))
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      dept: u.department,
      jobFamily: u.job_family || "—",
      role: u.designation,
      grade: Number(u.grade),
      gradeLabel: formatJobGrade(Number(u.grade)),
      tenure: tenureLabel(u.join_date),
      join: Number(u.tenure_years) < 1 ? "< 1 year ago" : `${u.tenure_years} year${Number(u.tenure_years) !== 1 ? "s" : ""} ago`,
      supervisor: u.supervisor || "—",
      hod: u.hod === "true",
      pointsYTD: Number(u.points_ytd) || 0,
      status: u.status || "active",
      lastDayOfService: u.last_day_of_service || "",
    }));

  // Disabled staff — the inverse of staffList. Populated by the sync script when a previously-
  // active person's latest Staff Listing row shows a Last Day of Service: kept (not dropped) with
  // status=disabled and a one-time disabled_detected_date stamp, which Admin's Disabled Accounts
  // panel uses for the 30-working-day Enable/Export window.
  const disabledStaffList = users
    .filter(u => !isActive(u))
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      dept: u.department,
      role: u.designation,
      supervisor: u.supervisor || "—",
      lastDayOfService: u.last_day_of_service || "",
      disabledDetectedDate: u.disabled_detected_date || "",
    }));

  // Colleagues list
  const colleagues = users.filter(u => u.id !== "u0").map(u => u.name);

  return {
    currentUser,
    departmentGoals,
    teamMembers,
    myGoals,
    skills,
    jobMatches,
    teamMemberPendingSkills,
    allTeamMemberSkills,
    surveyData,
    actionPlanItems,
    rewardsCatalog,
    pointsLog,
    corporateValues,
    onboardingMilestones,
    devMilestones,
    staffList,
    disabledStaffList,
    colleagues,
  };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const past = new Date(isoDate).getTime();
  if (isNaN(past)) return isoDate; // non-ISO strings pass through unchanged
  const secs = Math.floor((Date.now() - past) / 1000);
  if (secs < 60) return "Just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 86400 * 7) {
    const d = Math.floor(secs / 86400);
    return `${d} day${d !== 1 ? "s" : ""} ago`;
  }
  const w = Math.floor(secs / (86400 * 7));
  return `${w} week${w !== 1 ? "s" : ""} ago`;
}

// ── Shared write helpers ──────────────────────────────────────────────────────

const USER_HEADERS = [
  "id", "name", "email", "department", "designation", "grade",
  "join_date", "tenure_years", "hod", "points_ytd", "avatar", "supervisor", "role_type", "job_family",
];
// Every users.csv write must use this full header list, not the base USER_HEADERS above — writeCsv
// only ever writes the columns it's given, so using the narrower list here would silently strip
// status/last_day_of_service/disabled_detected_date off *every* row on the very next points update.
const DISABLED_LIFECYCLE_HEADERS = USER_HEADERS.concat(["last_day_of_service", "status", "disabled_detected_date"]);

function updateUserPoints(userId: string, delta: number) {
  const users = readCsv("users.csv");
  const updated = users.map(u =>
    u.id === userId ? { ...u, points_ytd: String(Number(u.points_ytd) + delta) } : u
  );
  writeCsv("users.csv", DISABLED_LIFECYCLE_HEADERS, updated);
}

function appendPointsLog(userId: string, description: string, points: number) {
  const log = readCsv("points_log.csv");
  const entry: Record<string, string> = {
    id: `pl${Date.now()}`,
    user_id: userId,
    description,
    points: String(points),
    date: new Date().toISOString(),
  };
  writeCsv("points_log.csv", ["id", "user_id", "description", "points", "date"], [entry, ...log]);
}

// ── Mutation functions ────────────────────────────────────────────────────────

export function resolveRemark(remarkId: string) {
  const rows = readCsv("goal_remarks.csv");
  const updated = rows.map(r => r.id === remarkId ? { ...r, pending: "false" } : r);
  writeCsv("goal_remarks.csv", ["id", "goal_id", "author", "text", "date", "pending"], updated);
  updateUserPoints("u0", 10);
  appendPointsLog("u0", "Responded to team remark", 10);
}

export function addPendingSkill(userId: string, skill: string) {
  const rows = readCsv("user_skills.csv");
  if (rows.some(r => r.user_id === userId && r.skill === skill)) return;
  rows.push({ user_id: userId, skill, status: "pending" });
  writeCsv("user_skills.csv", ["user_id", "skill", "status"], rows);
}

export function redeemReward(userId: string, cost: number, name: string) {
  updateUserPoints(userId, -cost);
  appendPointsLog(userId, `Redeemed: ${name}`, -cost);
  // Also persist to dedicated redeemed_rewards.csv for admin export
  const users = readCsv("users.csv");
  const staffName = users.find(u => u.id === userId)?.name ?? userId;
  const RDMPT_HEADERS = ["id", "staff_name", "user_id", "reward_name", "points_cost", "redeemed_at"];
  const existing = readCsv("redeemed_rewards.csv");
  existing.push({
    id: `rr${Date.now()}`,
    staff_name: staffName,
    user_id: userId,
    reward_name: name,
    points_cost: String(cost),
    redeemed_at: new Date().toISOString(),
  });
  writeCsv("redeemed_rewards.csv", RDMPT_HEADERS, existing);
}

export function toggleActionPlanItem(id: string, done: boolean) {
  const rows = readCsv("action_plan_items.csv");
  const updated = rows.map(r => r.id === id ? { ...r, done: String(done) } : r);
  writeCsv("action_plan_items.csv", ["id", "type", "title", "description", "done", "deadline"], updated);
  if (done) {
    updateUserPoints("u0", 25);
    appendPointsLog("u0", "Completed action plan item", 25);
  }
}

// Credits the actual sender (previously hardcoded to "u0" — Sarah Chen — regardless of who was
// really logged in) and, now, the named recipient too (previously never credited or notified at
// all). The recipient is resolved by name against the full users.csv roster (not just the hand-
// seeded team-member arrays), so this works for any of the ~300 real staff, and — since pointsLog
// is polled by every client every 5s — the recipient sees it land in their own dashboard shortly
// after, with no additional plumbing needed.
export function logCompliment(senderId: string, recipient: string) {
  updateUserPoints(senderId, 25);
  appendPointsLog(senderId, `Sent compliment to ${recipient}`, 25);
  const users = readCsv("users.csv");
  const recipientUser = users.find(u => u.name === recipient);
  if (recipientUser && recipientUser.id !== senderId) {
    updateUserPoints(recipientUser.id, 25);
    appendPointsLog(recipientUser.id, "Received a compliment", 25);
  }
}

export function endorseTeamMemberSkill(memberId: string, skill: string) {
  const rows = readCsv("user_skills.csv");
  const updated = rows.map(r =>
    r.user_id === memberId && r.skill === skill ? { ...r, status: "verified" } : r
  );
  writeCsv("user_skills.csv", ["user_id", "skill", "status"], updated);
  updateUserPoints("u0", 5);
  appendPointsLog("u0", `Endorsed skill: ${skill}`, 5);
}

export function rejectPendingSkill(memberId: string, skill: string) {
  const rows = readCsv("user_skills.csv");
  const updated = rows.filter(
    r => !(r.user_id === memberId && r.skill === skill && r.status === "pending")
  );
  writeCsv("user_skills.csv", ["user_id", "skill", "status"], updated);
}

export function getRedeemedRewards() {
  const users = readCsv("users.csv");
  // Read from dedicated CSV; fall back to scanning points_log for legacy entries
  const rows = readCsv("redeemed_rewards.csv");
  if (rows.length > 0) {
    return rows.map(r => ({
      id: r.id,
      staff_name: r.staff_name,
      email: users.find(u => u.id === r.user_id)?.email ?? r.user_id,
      reward_name: r.reward_name,
      points_cost: r.points_cost,
      redeemed_at: r.redeemed_at,
    }));
  }
  // Fallback: derive from points_log for older redemptions
  const log = readCsv("points_log.csv");
  return log
    .filter(r => r.description.startsWith("Redeemed:"))
    .map(r => ({
      id: r.id,
      staff_name: users.find(u => u.id === r.user_id)?.name ?? r.user_id,
      email: users.find(u => u.id === r.user_id)?.email ?? r.user_id,
      reward_name: r.description.replace(/^Redeemed:\s*/, ""),
      points_cost: String(Math.abs(Number(r.points))),
      redeemed_at: r.date,
    }));
}

export function updateDepartmentGoals(
  goals: { id: string; title: string; owner: string; progress: number; weightage: number; dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string }[]
) {
  const HEADERS = ["id", "title", "owner", "progress", "weightage", "due_date", "rag_q1", "rag_q2", "rag_q3", "rag_q4"];
  const rows = goals.map(g => ({
    id: g.id,
    title: g.title,
    owner: g.owner,
    progress: String(g.progress),
    weightage: String(g.weightage),
    due_date: g.dueDate ?? "",
    rag_q1: g.ragQ1 ?? "",
    rag_q2: g.ragQ2 ?? "",
    rag_q3: g.ragQ3 ?? "",
    rag_q4: g.ragQ4 ?? "",
  }));
  writeCsv("department_goals.csv", HEADERS, rows);
}

export function disableStaffAccount(userId: string) {
  const users = readCsv("users.csv");
  const updated = users.map(u => u.id === userId ? { ...u, status: "disabled" } : u);
  writeCsv("users.csv", DISABLED_LIFECYCLE_HEADERS, updated);
}

// Admin override — clears the LDOS/detected-date lifecycle too, so the record is a clean active
// row again (if the upstream Staff Listing still shows an LDOS for this person, the next sync run
// will simply re-detect and re-disable them with a fresh detected date).
export function enableStaffAccount(userId: string) {
  const users = readCsv("users.csv");
  const updated = users.map(u => u.id === userId ? { ...u, status: "active", last_day_of_service: "", disabled_detected_date: "" } : u);
  writeCsv("users.csv", DISABLED_LIFECYCLE_HEADERS, updated);
}

export function getStaffPointsLog(userId: string) {
  const rows = readCsv("points_log.csv");
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return rows
    .filter(r => r.user_id === userId && r.date.startsWith(currentYM))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(r => ({ text: r.description, pts: Number(r.points), date: r.date }));
}

export function getOrgNetPoints(yearMonth?: string) {
  const rows = readCsv("points_log.csv");
  const now = new Date();
  const targetYM = yearMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetYear = targetYM.slice(0, 4);
  const byUser: Record<string, { ytd: number; month: number }> = {};
  rows.forEach(r => {
    const dateStr = (r.date ?? "").slice(0, 10);
    const pts = Number(r.points) || 0;
    if (!byUser[r.user_id]) byUser[r.user_id] = { ytd: 0, month: 0 };
    if (dateStr.startsWith(targetYear)) byUser[r.user_id].ytd += pts;
    if (dateStr.startsWith(targetYM)) byUser[r.user_id].month += pts;
  });
  return byUser;
}

// ── Work Buddy login portal ─────────────────────────────────────────────────
// Every users.csv account gets a default username (their email) and password (their join_date
// as dd-mm-yy). The first successful login starts a 7-working-day clock to set a real password
// (see setNewPassword/applyPasswordResetPenalty below); auth_credentials.csv is the one CSV file
// this app writes that isn't itself part of the dashboard's business data — it exists purely so
// both preview links (8080 and the portal) see the same login/reset state, since they're separate
// processes that only share state via the files on disk.
const AUTH_HEADERS = ["user_id", "custom_password", "first_login_date", "password_reset_done", "penalty_applied"];

// Only these 6 personas have a fully wired dashboard (goals, skills, team data); everyone else in
// users.csv gets real credentials and the reset/penalty flow, but lands on a simple profile view.
export const WIRED_PERSONA_TIERS: Record<string, string> = {
  u0: "manager",
  u1: "staff",
  u4: "admin",
  u21: "ops_hod",
  u22: "ops_mgr1",
  u23: "ops_mgr2",
};

function getAuthRow(userId: string): Record<string, string> | undefined {
  return readCsv("auth_credentials.csv").find(r => r.user_id === userId);
}

function upsertAuthRow(userId: string, changes: Record<string, string>) {
  const rows = readCsv("auth_credentials.csv");
  const existing = rows.find(r => r.user_id === userId);
  const base: Record<string, string> = existing ?? {
    user_id: userId,
    custom_password: "",
    first_login_date: "",
    password_reset_done: "false",
    penalty_applied: "false",
  };
  const updated = { ...base, ...changes };
  const next = existing ? rows.map(r => (r.user_id === userId ? updated : r)) : [...rows, updated];
  writeCsv("auth_credentials.csv", AUTH_HEADERS, next);
  return updated;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  userId?: string;
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  grade?: number;
  avatar?: string;
  pointsYTD?: number;
  isWiredPersona?: boolean;
  tier?: string;
  requiresPasswordReset?: boolean;
  firstLoginDate?: string;
}

function buildProfile(u: Record<string, string>, authRow: Record<string, string> | undefined): LoginResult {
  return {
    ok: true,
    userId: u.id,
    name: u.name,
    email: u.email,
    department: u.department,
    designation: u.designation,
    grade: Number(u.grade),
    avatar: u.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    pointsYTD: Number(u.points_ytd) || 0,
    isWiredPersona: u.id in WIRED_PERSONA_TIERS,
    tier: WIRED_PERSONA_TIERS[u.id],
    requiresPasswordReset: authRow?.password_reset_done !== "true",
    firstLoginDate: authRow?.first_login_date,
  };
}

export function loginUser(email: string, password: string): LoginResult {
  const users = readCsv("users.csv");
  const u = users.find(
    r => r.email.toLowerCase() === email.trim().toLowerCase() && r.status !== "disabled",
  );
  if (!u) return { ok: false, error: "Invalid email or password." };

  const authRow = getAuthRow(u.id);
  const expectedPassword = authRow?.custom_password || formatJoinDateAsPassword(u.join_date);
  if (password !== expectedPassword) return { ok: false, error: "Invalid email or password." };

  const stamped = authRow?.first_login_date
    ? authRow
    : upsertAuthRow(u.id, { first_login_date: new Date().toISOString().slice(0, 10) });

  return buildProfile(u, stamped);
}

// Re-hydrates a profile for an already-established browser session (see portalSession.ts) — no
// password involved, since the login itself was already verified by loginUser above.
export function getUserProfile(userId: string): LoginResult {
  const u = readCsv("users.csv").find(r => r.id === userId && r.status !== "disabled");
  if (!u) return { ok: false, error: "Account not found." };
  return buildProfile(u, getAuthRow(u.id));
}

export function setNewPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): { ok: boolean; error?: string } {
  const u = readCsv("users.csv").find(r => r.id === userId);
  if (!u) return { ok: false, error: "Account not found." };

  const authRow = getAuthRow(userId);
  const expectedPassword = authRow?.custom_password || formatJoinDateAsPassword(u.join_date);
  if (currentPassword !== expectedPassword) return { ok: false, error: "Current password is incorrect." };

  if (!isPasswordStrong(newPassword)) {
    return { ok: false, error: "Password does not meet the required strength policy." };
  }
  upsertAuthRow(userId, { custom_password: newPassword, password_reset_done: "true" });
  return { ok: true };
}

export function getAuthStatus(userId: string) {
  const row = getAuthRow(userId);
  const firstLoginDate = row?.first_login_date ?? "";
  return {
    firstLoginDate,
    passwordResetDone: row?.password_reset_done === "true",
    penaltyApplied: row?.penalty_applied === "true",
    workingDaysElapsed: firstLoginDate ? workingDaysSince(firstLoginDate) : 0,
  };
}

// Idempotent — deducts 5 points exactly once, the same 7-working-day-SLA pattern used everywhere
// else in the app (see appContext.tsx's checkOverduePenalties), just persisted server-side here so
// it applies once regardless of which preview link (or how many open tabs) triggers the check.
export function applyPasswordResetPenalty(userId: string): { applied: boolean } {
  const row = getAuthRow(userId);
  if (!row || !row.first_login_date) return { applied: false };
  if (row.password_reset_done === "true" || row.penalty_applied === "true") return { applied: false };
  if (workingDaysSince(row.first_login_date) < 7) return { applied: false };

  updateUserPoints(userId, -5);
  appendPointsLog(userId, "Missed 7-working-day password reset deadline", -5);
  upsertAuthRow(userId, { penalty_applied: "true" });
  return { applied: true };
}
