import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import type { Goal, TeamMember, RAG } from "./mockData";

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

  // Helper: map grade number to PC job grade label including grade number
  const pcGradeLabel = (grade: number): string => {
    if (grade >= 6) return `Director / Managing Director ${grade}`;
    if (grade >= 4) return `Assistant Vice President ${grade}`;
    if (grade >= 2) return `Assistant Manager ${grade}`;
    return `Senior Executive ${grade}`;
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
      role: u.designation,
      grade: Number(u.grade),
      gradeLabel: pcGradeLabel(Number(u.grade)),
      tenure: tenureLabel(u.join_date),
      join: Number(u.tenure_years) < 1 ? "< 1 year ago" : `${u.tenure_years} year${Number(u.tenure_years) !== 1 ? "s" : ""} ago`,
      supervisor: u.supervisor || "—",
      hod: u.hod === "true",
      pointsYTD: Number(u.points_ytd) || 0,
      status: u.status || "active",
      lastDayOfService: u.last_day_of_service || "",
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
  "join_date", "tenure_years", "hod", "points_ytd", "avatar", "supervisor", "role_type",
];

function updateUserPoints(userId: string, delta: number) {
  const users = readCsv("users.csv");
  const updated = users.map(u =>
    u.id === userId ? { ...u, points_ytd: String(Number(u.points_ytd) + delta) } : u
  );
  writeCsv("users.csv", USER_HEADERS, updated);
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

export function logCompliment(recipient: string) {
  updateUserPoints("u0", 25);
  appendPointsLog("u0", `Sent compliment to ${recipient}`, 25);
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
  writeCsv("users.csv", USER_HEADERS.concat(["last_day_of_service", "status"]), updated);
}

export function enableStaffAccount(userId: string) {
  const users = readCsv("users.csv");
  const updated = users.map(u => u.id === userId ? { ...u, status: "active" } : u);
  writeCsv("users.csv", USER_HEADERS.concat(["last_day_of_service", "status"]), updated);
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
