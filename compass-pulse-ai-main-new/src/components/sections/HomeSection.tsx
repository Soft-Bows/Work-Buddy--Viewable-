import { useState, useEffect } from "react";
import { Card, SectionTitle, RagPill } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { CheckCircle2, Circle, Clock, X, Pencil, Trash2, Plus, Gift, Laptop, Flag, Target, ExternalLink, AlertCircle } from "lucide-react";
import { TeamDrawer } from "@/components/sections/TeamSection";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TeamMember, RAG } from "@/lib/mockData";
import { getDefaultSkillsForRole, getRegulatorExamsForRole, classifySkill, getIBFJobFunctionUrl, isHCWMDept, getIHRPBadgesForRole } from "@/lib/skillsCatalog";

// Returns true if dueDate ("YYYY-MM") falls in this or next calendar month
function isDueWithinOneMonth(dueDate: string): boolean {
  if (!dueDate) return false;
  const now = new Date();
  const curYM = now.getFullYear() * 12 + now.getMonth();
  const [y, m] = dueDate.split("-").map(Number);
  const dueYM = y * 12 + (m - 1);
  return dueYM >= curYM && dueYM <= curYM + 1;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDueDate(dueDate: string): string {
  if (!dueDate) return "";
  const [y, m] = dueDate.split("-");
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

// ── 30-day goal-setting rule ──────────────────────────────────────────────────
// Performance goals: min 3, max 5. Development goals: min 1, max 10. +10 pts per goal set.
// On day 31 from join date, −30 pts is deducted per still-incomplete section (perf and/or dev).
const PERF_GOAL_MIN = 3;
const PERF_GOAL_MAX = 5;
const DEV_GOAL_MIN = 1;
const DEV_GOAL_MAX = 10;
const GOAL_WINDOW_DAYS = 30;

function daysSinceJoin(joinDate?: string): number {
  if (!joinDate) return Infinity;
  const start = new Date(joinDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Singapore public holidays 2026 ───────────────────────────────────────────

const SG_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-02-17", "2026-02-18", "2026-03-20",
  "2026-04-03", "2026-05-01", "2026-05-21", "2026-05-27",
  "2026-08-09", "2026-10-20", "2026-12-25",
]);

function getRedemptionDate(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const targetMonth = month <= 6 ? 6 : 12;
  const d = new Date(year, targetMonth, 0);
  while (true) {
    const dow = d.getDay();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dow !== 0 && dow !== 6 && !SG_HOLIDAYS_2026.has(iso)) break;
    d.setDate(d.getDate() - 1);
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DeptGoal = { id: string; title: string; owner: string; progress: number; weightage: number; dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string };

// Get the current quarter key
function currentQuarterKey(): "Q1" | "Q2" | "Q3" | "Q4" {
  const m = new Date().getMonth();
  if (m <= 2) return "Q1";
  if (m <= 5) return "Q2";
  if (m <= 8) return "Q3";
  return "Q4";
}

// Compute the effective RAG for a dept goal for the current quarter
function computeDeptRag(
  deptGoal: DeptGoal,
  teamMembers: TeamMember[],
): { rag: RAG | null; isConfirmed: boolean; isMixed: boolean } {
  const qKey = currentQuarterKey();
  const storedRag = deptGoal[`rag${qKey}` as keyof DeptGoal] as string | undefined;

  if (storedRag && ["red", "amber", "green"].includes(storedRag)) {
    return { rag: storedRag as RAG, isConfirmed: true, isMixed: false };
  }

  // Compute from contributors' linked goal RAG for current quarter
  const ownerNames = deptGoal.owner ? deptGoal.owner.split(",").map(s => s.trim()) : [];
  const rags = teamMembers
    .filter(m => !ownerNames.includes(m.name))
    .flatMap(m =>
      m.goals
        .filter(g => g.linkedDept === deptGoal.id && (g.weightage ?? 0) >= 1)
        .map(g => g.quarters.find(q => q.q === qKey)?.rag)
    )
    .filter(Boolean) as RAG[];

  if (rags.length === 0) return { rag: null, isConfirmed: false, isMixed: false };
  const unique = [...new Set(rags)];
  if (unique.length === 1) return { rag: unique[0], isConfirmed: false, isMixed: false };
  return { rag: null, isConfirmed: false, isMixed: true };
}

// ── Multi-owner picker (supports selecting multiple names, stored as comma-separated string) ──

function MultiOwnerPicker({ value, onChange, staffNames }: { value: string; onChange: (n: string) => void; staffNames: string[] }) {
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const available = staffNames.filter(n =>
    !selected.includes(n) && (!query.trim() || n.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 6);

  const addOwner = (name: string) => {
    onChange([...selected, name].join(", "));
    setQuery("");
    setOpen(false);
  };

  const removeOwner = (name: string) => {
    onChange(selected.filter(n => n !== name).join(", "));
  };

  return (
    <div className="flex-1 min-w-0">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
              {name}
              <button type="button" onMouseDown={() => removeOwner(name)} className="hover:text-red-500 transition-colors">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Type a name to add owner…" : "Add another owner…"}
          className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {open && available.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {available.map(name => (
              <button
                key={name}
                type="button"
                onMouseDown={() => addOwner(name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Goal Editor Modal (HOD only) ─────────────────────────────────────────────

function GoalEditorModal({
  initialGoals,
  onSave,
  onClose,
}: {
  initialGoals: DeptGoal[];
  onSave: (goals: DeptGoal[]) => Promise<void>;
  onClose: () => void;
}) {
  const { staffList, currentUser } = useApp();
  // Include HOD (currentUser) as a selectable owner alongside team members
  const staffNames = [currentUser.name, ...staffList.map(s => s.name)];

  const [draft, setDraft] = useState<DeptGoal[]>(initialGoals.map(g => ({ ...g })));
  const [saving, setSaving] = useState(false);

  const errors: string[] = [];
  if (draft.length < 3) errors.push(`Minimum 3 goals required — currently ${draft.length}`);
  if (draft.length > 5) errors.push("Maximum 5 goals allowed");
  const isValid = errors.length === 0;

  const qKey = currentQuarterKey();
  const ragKey = `rag${qKey}` as keyof DeptGoal;

  const update = (id: string, field: keyof DeptGoal, value: string | number) =>
    setDraft(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));

  const remove = (id: string) => {
    if (draft.length <= 3) {
      toast.error("Cannot delete — minimum 3 department goals must be maintained.");
      return;
    }
    setDraft(prev => prev.filter(g => g.id !== id));
  };

  const addGoal = () => {
    if (draft.length >= 5) return;
    setDraft(prev => [...prev, { id: `d${Date.now()}`, title: "New Department Goal", owner: "", progress: 0, weightage: 0, dueDate: "" }]);
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      toast.success("Department goals finalised.");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-background border border-border rounded-2xl shadow-2xl w-[600px] max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <div className="font-display text-xl">Edit Department Goals</div>
            <div className="text-xs text-muted-foreground mt-0.5">Min 3 · Max 5 goals</div>
          </div>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        {/* Goal list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {draft.map((goal, idx) => (
            <div key={goal.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-sm font-medium text-muted-foreground mt-2 w-5 shrink-0">{idx + 1}</div>

              <div className="flex-1 space-y-2 min-w-0">
                {/* Title */}
                <input
                  value={goal.title}
                  onChange={e => update(goal.id, "title", e.target.value)}
                  placeholder="Goal title"
                  className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {/* Owner picker — supports multiple owners */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground shrink-0 mt-2">Owner</span>
                  <MultiOwnerPicker
                    value={goal.owner}
                    onChange={name => update(goal.id, "owner", name)}
                    staffNames={staffNames}
                  />
                </div>
                {/* Due date — month picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Due</span>
                  <input
                    type="month"
                    value={goal.dueDate ?? ""}
                    onChange={e => update(goal.id, "dueDate", e.target.value)}
                    className="text-xs rounded-lg border border-input bg-background px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {goal.dueDate && (
                    <button
                      onClick={() => update(goal.id, "dueDate", "")}
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      title="Clear due date"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* RAG for current quarter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground shrink-0">{qKey} Status</span>
                  <div className="flex gap-1.5">
                    {(["green", "amber", "red"] as const).map(r => {
                      const isActive = (goal[ragKey] as string) === r;
                      const label = r === "green" ? "Green" : r === "amber" ? "Amber" : "Red";
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => update(goal.id, ragKey, isActive ? "" : r)}
                          className={cn(
                            "text-xs px-3 py-1 rounded-full border-2 font-semibold transition-all",
                            isActive
                              ? r === "green"
                                ? "bg-rag-green border-rag-green text-white shadow-sm shadow-rag-green/40"
                                : r === "amber"
                                ? "bg-rag-amber border-rag-amber text-white shadow-sm shadow-rag-amber/40"
                                : "bg-rag-red border-rag-red text-white shadow-sm shadow-rag-red/40"
                              : r === "green"
                                ? "border-rag-green/50 text-rag-green hover:bg-rag-green/10"
                                : r === "amber"
                                ? "border-rag-amber/50 text-amber-foreground hover:bg-rag-amber/10"
                                : "border-rag-red/50 text-rag-red hover:bg-rag-red/10"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {(goal[ragKey] as string) && (
                    <span className={cn(
                      "text-[10px] font-medium",
                      (goal[ragKey] as string) === "green" ? "text-rag-green" :
                      (goal[ragKey] as string) === "amber" ? "text-amber-foreground" : "text-rag-red"
                    )}>✓ confirmed</span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => remove(goal.id)}
                disabled={draft.length <= 3}
                title={draft.length <= 3 ? "Cannot delete — minimum 3 goals required" : "Delete goal"}
                className="mt-1 size-8 rounded-full hover:bg-red-50 grid place-items-center text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {/* Add goal */}
          {draft.length < 5 && (
            <button
              onClick={addGoal}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/20 text-sm text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <Plus className="size-4" />
              Add Department Goal
            </button>
          )}
        </div>

        {/* Validation footer */}
        <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
          {/* Error messages */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 space-y-0.5">
              {errors.map((e, i) => (
                <div key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>{e}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                isValid && !saving
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? "Saving…" : "Finalise Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kawaii SVG decorations ────────────────────────────────────────────────────

function StrawberrySVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M15 7 Q11 3 9 7 Q13 5 15 9 Q17 5 21 7 Q19 3 15 7Z" fill="#4ADE80"/>
      <path d="M9 9 Q7 15 9 21 Q11 27 15 28 Q19 27 21 21 Q23 15 21 9 Q18 7 15 8 Q12 7 9 9Z" fill="#F472B6"/>
      <circle cx="12" cy="15" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="17.5" cy="15" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="14.5" cy="20" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="13" cy="11" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <circle cx="18" cy="11" r="0.9" fill="#EC4899" fillOpacity="0.80"/>
      <ellipse cx="12" cy="14" rx="2.5" ry="3.5" fill="white" fillOpacity="0.40"/>
    </svg>
  );
}

function LemonSVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M15 5 Q21 3 23 9 Q17 7 15 5Z" fill="#4ADE80"/>
      <path d="M15 5 Q9 4 11 11 Q13 7 15 5Z" fill="#22C55E"/>
      <ellipse cx="15" cy="18" rx="10" ry="8" fill="#FDE047"/>
      <ellipse cx="5.5" cy="18" rx="2" ry="3" fill="#FDE047"/>
      <ellipse cx="24.5" cy="18" rx="2" ry="3" fill="#FDE047"/>
      <ellipse cx="11" cy="15" rx="4" ry="2.5" fill="white" fillOpacity="0.50"/>
      <path d="M9 18 Q15 14 21 18" stroke="#EAB308" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function LaptopLightbulbSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="28" height="17" rx="3" fill="#3B82F6"/>
      <rect x="4" y="10" width="24" height="13" rx="2" fill="#EFF6FF"/>
      <circle cx="11" cy="16" r="1.5" fill="#3B82F6"/>
      <circle cx="21" cy="16" r="1.5" fill="#3B82F6"/>
      <path d="M10 20 Q16 23 22 20" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M0 25 L3 29 L29 29 L32 25Z" fill="#93C5FD"/>
      <circle cx="38" cy="11" r="7" fill="#FCD34D"/>
      <circle cx="36" cy="9" r="2" fill="white" fillOpacity="0.55"/>
      <rect x="35" y="18" width="6" height="3" rx="1" fill="#FCD34D"/>
      <rect x="34.5" y="20.5" width="7" height="1.5" rx="0.5" fill="#22D3EE"/>
      <line x1="44" y1="5" x2="46" y2="3" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="11" x2="48" y2="10" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
      <line x1="44" y1="17" x2="46" y2="19" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function HomeSection() {
  const {
    tier, departmentGoals, teamMembers, onboardingMilestones, devMilestones,
    currentUser, points, setSection, saveDepartmentGoals, setFocusedTeamMemberId,
    staffMemberId, adminMemberId,
    staffDevGoals, adminDevGoals, teamMemberPendingSkills, setFocusedSkillsMemberId,
    allTeamMemberSkills, managerInputs, acknowledgedManagerInputs, opsMeta, teamDevGoalsById,
    nudgedGoalIds, setFocusedGoalId,
  } = useApp();

  const isOpsTier = tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";
  const isManager = tier === "manager" || tier === "ops_hod";
  const currentStaffMemberId = (opsMeta && tier !== "ops_hod") ? opsMeta.personaId : (tier === "admin" ? adminMemberId : staffMemberId);
  const currentStaffDevGoals = (opsMeta && tier !== "ops_hod") ? opsMeta.devGoals : (tier === "admin" ? adminDevGoals : staffDevGoals);
  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const isNewHire = opsMeta ? false : currentUser.tenureYears < 1;
  const milestones = isNewHire ? onboardingMilestones : (opsMeta ? opsMeta.milestones : devMilestones);
  const effectiveName = opsMeta ? opsMeta.user.name : currentUser.name;
  const effectiveDept = opsMeta ? opsMeta.user.department : currentUser.department;
  const displayPoints = opsMeta ? opsMeta.user.pointsYTD : points;

  const [pendingOpen, setPendingOpen] = useState(false);
  const [staffPendingOpen, setStaffPendingOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  // Draft goals kept in sync with server state between saves
  const [draftGoals, setDraftGoals] = useState<DeptGoal[]>(
    departmentGoals.map(g => ({ ...g, weightage: g.weightage ?? 0 }))
  );
  useEffect(() => {
    setDraftGoals(departmentGoals.map(g => ({ ...g, weightage: g.weightage ?? 0 })));
  }, [departmentGoals]);

  const redemptionDate = getRedemptionDate();

  // Notification items are scoped to direct reports only — skip-level members route
  // their feedback to their own direct manager (e.g. Priya handles James & Liu Wei)
  const directReportIds = new Set(
    teamMembers.filter(m => m.directManager === effectiveName).map(m => m.id)
  );

  // Resolve a team member's development goal count regardless of which switchable persona
  // (staff/admin/ops) is currently active, so leave-supervisor notifications stay accurate.
  const devGoalCountFor = (memberId: string): number => {
    if (memberId === staffMemberId) return staffDevGoals.length;
    if (memberId === adminMemberId) return adminDevGoals.length;
    return teamDevGoalsById[memberId]?.length ?? 0;
  };

  // 30-day goal-setting rule: separate notifications for missing performance vs development
  // goals. Within the window, framed as a points-earning opportunity; past day 30, framed as
  // a deduction that has already applied.
  const goalStatusNotifsFor = (m: TeamMember, goTo: () => void) => {
    const perfCount = m.goals.length;
    const devCount = devGoalCountFor(m.id);
    const daysIn = daysSinceJoin(m.joinDate);
    const withinWindow = daysIn <= GOAL_WINDOW_DAYS;
    const items: { icon: string; title: string; sub: string; time: string; action: () => void }[] = [];
    if (perfCount < PERF_GOAL_MIN) {
      items.push(withinWindow ? {
        icon: "⏰",
        title: `${m.name} needs ${PERF_GOAL_MIN - perfCount} more performance goal${PERF_GOAL_MIN - perfCount > 1 ? "s" : ""}`,
        sub: `${perfCount}/${PERF_GOAL_MIN} minimum set (max ${PERF_GOAL_MAX}) · Day ${daysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set`,
        time: "30-Day Rule", action: goTo,
      } : {
        icon: "🔴",
        title: `${m.name} has not set minimum performance goals`,
        sub: `${perfCount}/${PERF_GOAL_MIN} minimum set · 30-day window passed · −30 pts deducted`,
        time: "Overdue", action: goTo,
      });
    }
    if (devCount < DEV_GOAL_MIN) {
      items.push(withinWindow ? {
        icon: "⏰",
        title: `${m.name} needs ${DEV_GOAL_MIN - devCount} development goal${DEV_GOAL_MIN - devCount > 1 ? "s" : ""}`,
        sub: `${devCount}/${DEV_GOAL_MIN} minimum set (max ${DEV_GOAL_MAX}) · Day ${daysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set`,
        time: "30-Day Rule", action: goTo,
      } : {
        icon: "🔴",
        title: `${m.name} has not set minimum development goals`,
        sub: `${devCount}/${DEV_GOAL_MIN} minimum set · 30-day window passed · −30 pts deducted`,
        time: "Overdue", action: goTo,
      });
    }
    return items;
  };

  const pendingByMember = teamMembers
    .filter(m => directReportIds.has(m.id))
    .map(m => ({
      member: m,
      count: m.goals.reduce((acc, g) => acc + g.remarks.filter(r => r.pending).length, 0),
      goalTitles: m.goals.filter(g => g.remarks.some(r => r.pending)).map(g => g.title),
    }))
    .filter(x => x.count > 0);

  const pendingApprovalByMember = teamMembers
    .filter(m => directReportIds.has(m.id))
    .map(m => ({
      member: m,
      goals: m.goals.filter(g => !g.approved),
    }))
    .filter(x => x.goals.length > 0);

  const redMembers = teamMembers.filter(m => directReportIds.has(m.id) && m.rag === "red");

  // Type B: approved goals where staff submitted a RAG status awaiting manager acknowledgment
  const pendingRagApprovalByMember = teamMembers
    .filter(m => directReportIds.has(m.id))
    .flatMap(m =>
      m.goals
        .filter(g => g.approved && g.ragPendingApproval)
        .map(g => ({ member: m, goal: g }))
    );

  // Goals overdue for approval (submitted > 7 working days ago — incur -10 pts each)
  function workingDaysSince(dateStr?: string): number {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const today = new Date();
    let days = 0;
    const cur = new Date(start);
    while (cur < today) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }
  const overdueApprovalByMember = pendingApprovalByMember
    .map(({ member, goals }) => ({
      member,
      goals: goals.filter(g => workingDaysSince(g.submittedDate) > 7),
    }))
    .filter(x => x.goals.length > 0);

  // Mixed dept goal RAGs that need HOD confirmation
  const mixedRagGoals = isHod ? draftGoals.filter(g => {
    const { isMixed, isConfirmed } = computeDeptRag(g, teamMembers);
    return isMixed && !isConfirmed;
  }) : [];

  // Nudged goals — direct reports who clicked "Nudge Supervisor" — shown first
  const nudgedNotifItems = teamMembers
    .filter(m => directReportIds.has(m.id))
    .flatMap(m =>
      m.goals
        .filter(g => !g.approved && nudgedGoalIds.has(g.id))
        .map(g => ({
          icon: "🔔",
          title: `${m.name} nudged you — "${g.title}" awaiting approval`,
          sub: `Your team member flagged this as overdue for review — click to open their goals`,
          time: "Nudged",
          action: () => { setPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); },
        }))
    );

  const allNotifItems = [
    ...nudgedNotifItems,
    ...mixedRagGoals.map(g => ({
      icon: "🔀",
      title: `${g.title} — ${currentQuarterKey()} progress status needs confirmation`,
      sub: "Team members have differing statuses — please confirm the overall quarterly progress status",
      time: "Action Required",
      action: () => { setPendingOpen(false); setShowGoalEditor(true); },
    })),
    ...teamMembers
      .filter(m => directReportIds.has(m.id))
      .flatMap(m => goalStatusNotifsFor(m, () => { setPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); })),
    // Type A: goals pending manager approval (+10 pts per review, +5 with feedback)
    ...pendingApprovalByMember.map(({ member, goals }) => ({
      icon: "📋",
      title: `${member.name} — ${goals.length} goal${goals.length > 1 ? "s" : ""} pending your approval`,
      sub: `Review within 7 working days: +${goals.length * 10} pts (+5 per goal with feedback). ${goals.slice(0, 1).map(g => g.title).join("")}${goals.length > 1 ? ` +${goals.length - 1} more` : ""}`,
      time: "Pending Approval",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    // Type B: approved goals with RAG status submitted, pending manager acknowledgment
    ...pendingRagApprovalByMember.map(({ member, goal }) => ({
      icon: "📊",
      title: `${member.name} — ${goal.ragPendingApproval} status update pending your review`,
      sub: `"${goal.title}" · Review the ${goal.ragPendingApproval} progress status to earn +10 pts; overdue reviews incur −10 pts`,
      time: "Status Pending",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    // Overdue approvals: -10 pts automatically deducted per goal after 7 working days
    ...overdueApprovalByMember.map(({ member, goals }) => ({
      icon: "🔴",
      title: `⚠️ Overdue: ${member.name}'s ${goals.length} goal${goals.length > 1 ? "s" : ""} unreviewed past 7 working days`,
      sub: `Point deduction applied: −${goals.length * 10} pts. Review now to stop further deductions.`,
      time: "Overdue",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
    })),
    ...pendingByMember.map(({ member, count, goalTitles }) => ({
      icon: "⏳",
      title: `${member.name} — ${count} pending remark${count > 1 ? "s" : ""}`,
      sub: goalTitles.join(" · ") || member.role,
      time: "Today",
      action: () => { setPendingOpen(false); setActiveMember(member); },
    })),
    {
      icon: "🎁",
      title: `Redemption closes ${redemptionDate}`,
      sub: `Exchange your ${points} pts for Giftano vouchers before the deadline`,
      time: "Reminder",
      action: () => { setPendingOpen(false); setSection("rewards"); },
    },
    ...redMembers.map(m => ({
      icon: "🔴",
      title: `Goal at risk — ${m.name}`,
      sub: `${m.name}'s goals have moved to RED — click to review`,
      time: "Alert",
      action: () => { setPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); },
    })),
    ...allTeamMemberSkills
      .filter(m => directReportIds.has(m.memberId) && m.pending.length > 0)
      .map(m => ({
        icon: "🎓",
        title: `${m.memberName} — ${m.pending.length} skill${m.pending.length > 1 ? "s" : ""} pending your endorsement`,
        sub: `Endorse within 7 working days: +10 pts per skill. Overdue endorsements incur −10 pts each. ${m.pending.join(", ")}`,
        time: "Endorse",
        action: () => {
          setPendingOpen(false);
          setFocusedSkillsMemberId(m.memberId);
          setSection("skills");
        },
      })),
    // Overdue skill endorsements: −10 pts per skill after 7 working days
    ...teamMemberPendingSkills
      .filter(m => directReportIds.has(m.memberId) && workingDaysSince(m.notifiedDate) > 7)
      .map(m => ({
        icon: "🔴",
        title: `⚠️ Overdue: ${m.memberName}'s ${m.pending.length} skill${m.pending.length > 1 ? "s" : ""} unendorsed past 7 working days`,
        sub: `Point deduction applied: −${m.pending.length * 10} pts. Endorse now to stop further deductions.`,
        time: "Overdue",
        action: () => {
          setPendingOpen(false);
          setFocusedSkillsMemberId(m.memberId);
          setSection("skills");
        },
      })),
  ];

  const handleSaveGoals = async (goals: DeptGoal[]) => {
    await saveDepartmentGoals(goals);
    setDraftGoals(goals);
  };

  return (
    <div className="space-y-8">
      {isManager && (
        <>
          {/* ── Metric cards ── */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 55%, #1D4ED8 100%)" }}
              onClick={() => setPendingOpen(true)}
            >
              <Laptop
                className="absolute -right-3 -bottom-3 text-white/20 pointer-events-none"
                style={{ width: 100, height: 100 }}
                strokeWidth={1.2}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-white/70">Pending Actions</div>
                <div className="font-display text-4xl mt-2 text-white">{allNotifItems.length}</div>
                <div className="text-xs text-white/80 mt-1">items need your attention</div>
              </div>
            </div>

            {/* Points YTD — vibrant amber with gift graphic */}
            <div
              className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              style={{ background: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0891B2 100%)" }}
              onClick={() => setSection("rewards")}
            >
              {/* Decorative gift icon */}
              <Gift
                className="absolute -right-4 -bottom-4 text-white/20 pointer-events-none"
                style={{ width: 110, height: 110 }}
                strokeWidth={1.2}
              />
              {/* Ribbon detail */}
              <div className="absolute right-8 bottom-8 w-0.5 h-16 bg-white/15 rounded-full pointer-events-none" />
              <div className="absolute right-2 bottom-12 w-16 h-0.5 bg-white/15 rounded-full pointer-events-none" />

              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-white/70">Points YTD</div>
                <div className="font-display text-4xl mt-2 text-white">{displayPoints}</div>
                <div className="text-xs text-white/80 mt-1">earned through dashboard</div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Gift className="size-3 text-white/60" />
                  <span className="text-[10px] text-white/60 leading-snug">
                    Redeem by {redemptionDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Department Goals ── */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <LaptopLightbulbSVG />
                  <h2 className="font-display text-2xl">Team Goals</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1">2026 Objectives for {effectiveDept}</p>
              </div>
              {isHod && (
                <button
                  onClick={() => setShowGoalEditor(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                  Edit Goals
                </button>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3">
              {draftGoals.map(g => {
                const { rag, isConfirmed, isMixed } = computeDeptRag(g, teamMembers);
                return (
                  <Card
                    key={g.id}
                    className={cn("p-4 group", isHod && "cursor-pointer hover:border-primary/30 hover:shadow-md transition-all")}
                    onClick={isHod ? () => setShowGoalEditor(true) : undefined}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{g.owner}</div>
                    <div className="font-medium text-sm mt-2 leading-snug">{g.title}</div>
                    <div className="mt-4 space-y-1.5">
                      {isMixed && !isConfirmed ? (
                        <div className="flex items-center gap-1 text-[10px] text-amber-foreground bg-rag-amber/10 border border-rag-amber/30 rounded-md px-2 py-1">
                          <AlertCircle className="size-3 shrink-0" />
                          <span>Confirm progress status</span>
                        </div>
                      ) : rag ? (
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "size-3 rounded-full shrink-0",
                            rag === "green" ? "bg-rag-green" : rag === "amber" ? "bg-rag-amber" : "bg-rag-red"
                          )} />
                          <span className={cn(
                            "text-xs font-semibold",
                            rag === "green" ? "text-rag-green" : rag === "amber" ? "text-amber-foreground" : "text-rag-red"
                          )}>
                            {rag.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground/60">No {currentQuarterKey()} data yet</div>
                      )}
                    </div>
                    {g.dueDate && (
                      <div className="mt-2 text-[10px] text-muted-foreground/70">
                        Due {new Date(g.dueDate + "-01").toLocaleDateString("en-SG", { month: "short", year: "numeric" })}
                      </div>
                    )}
                    {isHod && (
                      <div className="mt-2 text-[10px] text-transparent group-hover:text-primary/50 transition-colors flex items-center gap-1">
                        <Pencil className="size-2.5" />Click to edit
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ── Team At A Glance + Roadmap ── */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <div className="mb-5">
                <div className="flex items-center gap-2.5">
                  <StrawberrySVG />
                  <h2 className="font-display text-2xl">Team At A Glance</h2>
                </div>
              </div>
              <div className="space-y-1">
                {[...teamMembers]
                  .filter(m => m.directManager === effectiveName)
                  .sort((a, b) => ({ red: 0, amber: 1, green: 2 }[a.rag] ?? 3) - ({ red: 0, amber: 1, green: 2 }[b.rag] ?? 3))
                  .map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setFocusedTeamMemberId(m.id); setSection("team"); }}
                    className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0 w-full text-left hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors group"
                  >
                    <div className="size-9 rounded-full bg-secondary text-primary grid place-items-center font-medium text-sm shrink-0">{m.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-primary transition-colors">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.role}</div>
                    </div>
                    {m.goals.length === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-red/10 text-rag-red border border-rag-red/30 shrink-0">
                        <Flag className="size-3" /> No Goals Set
                      </span>
                    ) : m.goals.length < 3 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-amber/15 text-amber-foreground border border-rag-amber/40 shrink-0">
                        <Flag className="size-3" /> Incomplete ({m.goals.length}/3)
                      </span>
                    ) : (
                      <>
                        <RagPill rag={m.rag} />
                        <div className="text-xs text-muted-foreground shrink-0">{m.goals.length} goals</div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-5">
                <div className="flex items-center gap-2.5">
                  <LemonSVG />
                  <h2 className="font-display text-2xl">Development Roadmap</h2>
                </div>
                {isNewHire && <p className="text-sm text-muted-foreground mt-1">Your onboarding path.</p>}
              </div>
              {isNewHire ? <Roadmap items={milestones as any} /> : <DevelopmentRoadmap />}
            </Card>
          </div>
        </>
      )}

      {!isManager && (() => {
        const staffMember = teamMembers.find(m => m.id === currentStaffMemberId);
        const staffPoints = staffMember?.pointsYTD ?? 0;
        const pendingApprovalGoals = staffMember?.goals.filter(g => !g.approved) ?? [];
        const pendingAckGoals = staffMember?.goals.filter(g => g.pendingAcknowledgement) ?? [];
        const devGoalsDueSoon = currentStaffDevGoals.filter(g => !g.completed && isDueWithinOneMonth(g.dueDate));

        // Detect if the viewed staff member (Priya) manages others — show team features if so
        const staffMemberHasTeam = staffMember
          ? teamMembers.some(m => m.directManager === staffMember.name)
          : false;
        const staffTeamDirectReportIds = staffMemberHasTeam
          ? new Set(teamMembers.filter(m => m.directManager === staffMember!.name).map(m => m.id))
          : new Set<string>();
        const staffTeamPendingApprovalByMember = staffMemberHasTeam
          ? teamMembers
              .filter(m => staffTeamDirectReportIds.has(m.id))
              .map(m => ({ member: m, goals: m.goals.filter(g => !g.approved) }))
              .filter(x => x.goals.length > 0)
          : [];
        const staffTeamPendingByMember = staffMemberHasTeam
          ? teamMembers
              .filter(m => staffTeamDirectReportIds.has(m.id))
              .map(m => ({
                member: m,
                count: m.goals.reduce((acc, g) => acc + g.remarks.filter(r => r.pending).length, 0),
                goalTitles: m.goals.filter(g => g.remarks.some(r => r.pending)).map(g => g.title),
              }))
              .filter(x => x.count > 0)
          : [];
        const staffTeamRedMembers = staffMemberHasTeam
          ? teamMembers.filter(m => staffTeamDirectReportIds.has(m.id) && m.rag === "red")
          : [];
        const staffTeamPendingSkills = staffMemberHasTeam
          ? allTeamMemberSkills.filter(m => staffTeamDirectReportIds.has(m.memberId) && m.pending.length > 0)
          : [];

        const staffDevGoalCount = currentStaffDevGoals.length;
        const staffPerfGoalCount = staffMember?.goals.length ?? 0;
        const staffRagPendingGoals = staffMember?.goals.filter(g => g.approved && g.ragPendingApproval) ?? [];
        const staffDaysIn = daysSinceJoin(opsMeta ? opsMeta.user.joinDate : staffMember?.joinDate);
        const staffWithinWindow = staffDaysIn <= GOAL_WINDOW_DAYS;

        const staffNotifItems = [
          // Goal minimums — 30-day rule: 3–5 performance goals, 1–10 development goals required
          ...(staffDevGoalCount < DEV_GOAL_MIN ? [staffWithinWindow ? {
            icon: "⏰",
            title: `${DEV_GOAL_MIN - staffDevGoalCount} more development goal${DEV_GOAL_MIN - staffDevGoalCount > 1 ? "s" : ""} needed`,
            sub: `You have ${staffDevGoalCount}/${DEV_GOAL_MIN} minimum (max ${DEV_GOAL_MAX}). Day ${staffDaysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set.`,
            time: "30-Day Rule",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          } : {
            icon: "🔴",
            title: "Development goals minimum not met",
            sub: `You have ${staffDevGoalCount}/${DEV_GOAL_MIN} minimum. 30-day window passed — −30 pts deducted.`,
            time: "Overdue",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          }] : []),
          ...(staffPerfGoalCount < PERF_GOAL_MIN ? [staffWithinWindow ? {
            icon: "⏰",
            title: `${PERF_GOAL_MIN - staffPerfGoalCount} more performance goal${PERF_GOAL_MIN - staffPerfGoalCount > 1 ? "s" : ""} needed`,
            sub: `You have ${staffPerfGoalCount}/${PERF_GOAL_MIN} minimum (max ${PERF_GOAL_MAX}). Day ${staffDaysIn}/${GOAL_WINDOW_DAYS} · +10 pts per goal set.`,
            time: "30-Day Rule",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          } : {
            icon: "🔴",
            title: "Performance goals minimum not met",
            sub: `You have ${staffPerfGoalCount}/${PERF_GOAL_MIN} minimum. 30-day window passed — −30 pts deducted.`,
            time: "Overdue",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          }] : []),
          // Type A: own performance goals pending manager approval
          ...(pendingApprovalGoals.length > 0 ? [{
            icon: "📋",
            title: `${pendingApprovalGoals.length} performance goal${pendingApprovalGoals.length > 1 ? "s" : ""} pending manager approval`,
            sub: `No goal status will be shown until approved. ${pendingApprovalGoals.slice(0, 1).map(g => g.title).join("")}${pendingApprovalGoals.length > 1 ? ` +${pendingApprovalGoals.length - 1} more` : ""}`,
            time: "Pending Approval",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          }] : []),
          // Type B: approved goals where submitted RAG status is pending manager acknowledgment
          ...staffRagPendingGoals.map(g => ({
            icon: "📊",
            title: `${g.ragPendingApproval} status update pending manager review`,
            sub: `"${g.title}" · Awaiting your manager's acknowledgment before status is confirmed`,
            time: "Status Pending",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          })),
          ...pendingAckGoals.map(g => ({
            icon: "✏️",
            title: `Goal modified by your manager: "${g.title}"`,
            sub: "Review the updated goal description, metric, or linkage and acknowledge the change",
            time: "Acknowledge",
            action: () => { setStaffPendingOpen(false); setFocusedGoalId(g.id); setSection("mygoals"); },
          })),
          ...devGoalsDueSoon.map(g => ({
            icon: "🎯",
            title: `Dev goal due soon: ${g.title}`,
            sub: `Due: ${formatDueDate(g.dueDate)} — mark complete or update your progress`,
            time: "Due",
            action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
          })),
          ...currentStaffDevGoals
            .filter(g => managerInputs[`${currentStaffMemberId}:${g.id}`] && !acknowledgedManagerInputs[`${currentStaffMemberId}:${g.id}`])
            .map(g => ({
              icon: "💬",
              title: `Manager feedback: ${g.title}`,
              sub: "Your manager has shared feedback & recommendations on this development goal",
              time: "Acknowledge",
              action: () => { setStaffPendingOpen(false); setSection("mygoals"); },
            })),
          // Team notifications — only surfaced when the viewed staff member manages direct reports
          ...(staffMemberHasTeam ? teamMembers
            .filter(m => staffTeamDirectReportIds.has(m.id))
            .flatMap(m => goalStatusNotifsFor(m, () => { setStaffPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); })) : []),
          ...staffTeamPendingApprovalByMember.map(({ member, goals }) => ({
            icon: "📋",
            title: `${member.name} — ${goals.length} goal${goals.length > 1 ? "s" : ""} pending your approval`,
            sub: `Review within 7 working days: +${goals.length * 10} pts (+5 per goal with feedback). ${goals.slice(0, 1).map(g => g.title).join("")}${goals.length > 1 ? ` +${goals.length - 1} more` : ""}`,
            time: "Pending Approval",
            action: () => { setStaffPendingOpen(false); setFocusedTeamMemberId(member.id); setSection("team"); },
          })),
          ...staffTeamPendingByMember.map(({ member, count, goalTitles }) => ({
            icon: "⏳",
            title: `${member.name} — ${count} pending remark${count > 1 ? "s" : ""}`,
            sub: goalTitles.join(" · ") || member.role,
            time: "Today",
            action: () => { setStaffPendingOpen(false); setActiveMember(member); },
          })),
          ...staffTeamRedMembers.map(m => ({
            icon: "🔴",
            title: `Goal at risk — ${m.name}`,
            sub: `${m.name}'s goals have moved to RED — click to review`,
            time: "Alert",
            action: () => { setStaffPendingOpen(false); setFocusedTeamMemberId(m.id); setSection("team"); },
          })),
          ...staffTeamPendingSkills.map(m => ({
            icon: "🎓",
            title: `${m.memberName} — ${m.pending.length} skill${m.pending.length > 1 ? "s" : ""} pending your endorsement`,
            sub: m.pending.join(", "),
            time: "Endorse",
            action: () => { setStaffPendingOpen(false); setFocusedSkillsMemberId(m.memberId); setSection("skills"); },
          })),
          {
            icon: "🎁",
            title: `Redemption closes ${redemptionDate}`,
            sub: `Exchange your ${staffPoints} pts for Giftano vouchers before the deadline`,
            time: "Reminder",
            action: () => { setStaffPendingOpen(false); setSection("rewards"); },
          },
        ];

        return (
          <>
            {/* ── Staff metric cards (same as manager, no Team at a Glance) ── */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
                style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 55%, #1D4ED8 100%)" }}
                onClick={() => setStaffPendingOpen(true)}
              >
                <Target
                  className="absolute -right-3 -bottom-3 text-white/20 pointer-events-none"
                  style={{ width: 100, height: 100 }}
                  strokeWidth={1.2}
                />
                <div className="relative">
                  <div className="text-xs uppercase tracking-widest text-white/70">Pending Actions</div>
                  <div className="font-display text-4xl mt-2 text-white">{staffNotifItems.length}</div>
                  <div className="text-xs text-white/80 mt-1">items need your attention</div>
                </div>
              </div>

              <div
                className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
                style={{ background: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0891B2 100%)" }}
                onClick={() => setSection("rewards")}
              >
                <Gift
                  className="absolute -right-4 -bottom-4 text-white/20 pointer-events-none"
                  style={{ width: 110, height: 110 }}
                  strokeWidth={1.2}
                />
                <div className="absolute right-8 bottom-8 w-0.5 h-16 bg-white/15 rounded-full pointer-events-none" />
                <div className="absolute right-2 bottom-12 w-16 h-0.5 bg-white/15 rounded-full pointer-events-none" />
                <div className="relative">
                  <div className="text-xs uppercase tracking-widest text-white/70">Points YTD</div>
                  <div className="font-display text-4xl mt-2 text-white">{staffPoints}</div>
                  <div className="text-xs text-white/80 mt-1">earned through dashboard</div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Gift className="size-3 text-white/60" />
                    <span className="text-[10px] text-white/60 leading-snug">Redeem by {redemptionDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Department Goals (read-only) ── */}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <LaptopLightbulbSVG />
                <h2 className="font-display text-2xl">Team Goals</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-5">2026 Objectives for {effectiveDept}</p>
              <div className="grid grid-cols-5 gap-3">
                {draftGoals.map(g => {
                  const { rag, isMixed, isConfirmed } = computeDeptRag(g, teamMembers);
                  return (
                    <Card key={g.id} className="p-4">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{g.owner}</div>
                      <div className="font-medium text-sm mt-2 leading-snug">{g.title}</div>
                      <div className="mt-4 space-y-1.5">
                        {isMixed && !isConfirmed ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-foreground bg-rag-amber/10 border border-rag-amber/30 rounded-md px-2 py-1">
                            <AlertCircle className="size-3 shrink-0" />
                            <span>Pending confirmation</span>
                          </div>
                        ) : rag ? (
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "size-3 rounded-full shrink-0",
                              rag === "green" ? "bg-rag-green" : rag === "amber" ? "bg-rag-amber" : "bg-rag-red"
                            )} />
                            <span className={cn(
                              "text-xs font-semibold",
                              rag === "green" ? "text-rag-green" : rag === "amber" ? "text-amber-foreground" : "text-rag-red"
                            )}>
                              {rag.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground/60">No {currentQuarterKey()} data yet</div>
                        )}
                      </div>
                      {g.dueDate && (
                        <div className="mt-2 text-[10px] text-muted-foreground/70">
                          Due {new Date(g.dueDate + "-01").toLocaleDateString("en-SG", { month: "short", year: "numeric" })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* ── Team At A Glance + Roadmap (side by side when staff manages a team) ── */}
            {staffMemberHasTeam ? (
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5">
                      <StrawberrySVG />
                      <h2 className="font-display text-2xl">Team At A Glance</h2>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {teamMembers
                      .filter(m => m.directManager === staffMember!.name)
                      .sort((a, b) => ({ red: 0, amber: 1, green: 2 }[a.rag] ?? 3) - ({ red: 0, amber: 1, green: 2 }[b.rag] ?? 3))
                      .map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setFocusedTeamMemberId(m.id); setSection("team"); }}
                          className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0 w-full text-left hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors group"
                        >
                          <div className="size-9 rounded-full bg-secondary text-primary grid place-items-center font-medium text-sm shrink-0">{m.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium group-hover:text-primary transition-colors">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.role}</div>
                          </div>
                          {m.goals.length === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-red/10 text-rag-red border border-rag-red/30 shrink-0">
                              <Flag className="size-3" /> No Goals Set
                            </span>
                          ) : m.goals.length < 3 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-amber/15 text-amber-foreground border border-rag-amber/40 shrink-0">
                              <Flag className="size-3" /> Incomplete ({m.goals.length}/3)
                            </span>
                          ) : (
                            <>
                              <RagPill rag={m.rag} />
                              <div className="text-xs text-muted-foreground shrink-0">{m.goals.length} goals</div>
                            </>
                          )}
                        </button>
                      ))}
                  </div>
                </Card>
                <Card>
                  <div className="mb-5">
                    <div className="flex items-center gap-2.5">
                      <LemonSVG />
                      <h2 className="font-display text-2xl">Development Roadmap</h2>
                    </div>
                    {isNewHire && <p className="text-sm text-muted-foreground mt-1">Your onboarding path.</p>}
                  </div>
                  {isNewHire ? <Roadmap items={milestones as any} /> : <DevelopmentRoadmap />}
                </Card>
              </div>
            ) : (
              <Card>
                <div className="mb-5">
                  <div className="flex items-center gap-2.5">
                    <LemonSVG />
                    <h2 className="font-display text-2xl">Development Roadmap</h2>
                  </div>
                  {isNewHire && <p className="text-sm text-muted-foreground mt-1">Your onboarding path.</p>}
                </div>
                {isNewHire ? <Roadmap items={milestones as any} /> : <DevelopmentRoadmap />}
              </Card>
            )}

            {/* Staff pending actions popup */}
            {staffPendingOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setStaffPendingOpen(false)}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div
                  className="relative bg-background border border-border rounded-2xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                      <div className="font-display text-xl">What Needs Your Attention</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{staffNotifItems.length} items</div>
                    </div>
                    <button onClick={() => setStaffPendingOpen(false)} className="size-8 rounded-full hover:bg-muted grid place-items-center">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-border/50 overflow-y-auto max-h-[480px]">
                    {staffNotifItems.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
                    ) : (
                      staffNotifItems.map((item, i) => (
                        <button
                          key={i}
                          onClick={item.action}
                          className="w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium leading-snug">{item.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{item.sub}</div>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap bg-muted px-1.5 py-0.5 rounded-full">{item.time}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-5 py-2.5 border-t border-border bg-muted/20 shrink-0">
                    <button onClick={() => setStaffPendingOpen(false)} className="text-xs text-primary hover:underline">Dismiss</button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Pending Actions popup — notification-style, mirrors former bell dropdown */}
      {pendingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPendingOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-background border border-border rounded-2xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <div className="font-display text-xl">What Needs Your Attention</div>
                <div className="text-xs text-muted-foreground mt-0.5">{allNotifItems.length} items</div>
              </div>
              <button onClick={() => setPendingOpen(false)} className="size-8 rounded-full hover:bg-muted grid place-items-center">
                <X className="size-4" />
              </button>
            </div>

            {/* Notification list */}
            <div className="divide-y divide-border/50 overflow-y-auto max-h-[480px]">
              {allNotifItems.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
              ) : (
                allNotifItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className={cn(
                      "w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors",
                      item.time === "Nudged" && "bg-amber-50/50 dark:bg-rag-amber/5 border-l-2 border-rag-amber/60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{item.sub}</div>
                      </div>
                      <span className={cn(
                        "text-[10px] shrink-0 mt-0.5 whitespace-nowrap px-1.5 py-0.5 rounded-full",
                        item.time === "Nudged"
                          ? "bg-rag-amber/15 text-amber-foreground border border-rag-amber/30"
                          : "bg-muted text-muted-foreground"
                      )}>{item.time}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-border bg-muted/20 shrink-0">
              <button onClick={() => setPendingOpen(false)} className="text-xs text-primary hover:underline">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team drawer from pending actions */}
      {activeMember && <TeamDrawer member={activeMember} onClose={() => setActiveMember(null)} />}

      {/* HOD goal editor modal */}
      {showGoalEditor && isHod && (
        <GoalEditorModal
          initialGoals={draftGoals}
          onSave={handleSaveGoals}
          onClose={() => setShowGoalEditor(false)}
        />
      )}
    </div>
  );
}

// ── Roadmap (onboarding — new hires only) ─────────────────────────────────────

function Roadmap({ items }: { items: { id: string; name: string; date: string; complete: boolean }[] }) {
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
      {items.map(m => (
        <div key={m.id} className="relative">
          <div className="absolute -left-[18px] top-0.5">
            {m.complete ? (
              <CheckCircle2 className="size-4 text-rag-green bg-card" />
            ) : (
              <Circle className="size-4 text-muted-foreground bg-card" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className={m.complete ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>{m.name}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />{m.date}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


function DevelopmentRoadmap() {
  const { tier, skills, allTeamMemberSkills, staffMemberId, adminMemberId, currentUser, teamMembers, staffList, addPendingSkill, opsMeta } = useApp();
  const isOpsTier = tier === "ops_hod" || tier === "ops_mgr1" || tier === "ops_mgr2";

  // Resolve the viewed user's role/dept/grade for IBF-matched skill recommendations
  const viewedMemberId = tier === "admin" ? adminMemberId : tier === "staff" ? staffMemberId : null;
  const viewedMember = viewedMemberId ? teamMembers.find(m => m.id === viewedMemberId) : null;
  const designation = isOpsTier ? (opsMeta?.user.designation ?? currentUser.designation) : (viewedMember?.role ?? currentUser.designation);
  const dept = isOpsTier ? (opsMeta?.user.department ?? currentUser.department) : (viewedMember?.dept ?? currentUser.department);
  const grade = isOpsTier ? (opsMeta?.user.grade ?? currentUser.grade) : ((viewedMember ? staffList.find(s => s.name === viewedMember.name)?.grade : null) ?? currentUser.grade);

  // Verified and pending skills for this user — same source as Skills Profile tab
  const memberSkills = isOpsTier
    ? (opsMeta?.skills ?? null)
    : (viewedMemberId ? allTeamMemberSkills.find(m => m.memberId === viewedMemberId) : null);
  const verifiedSkills: string[] = memberSkills ? memberSkills.verified : (skills as { verified: string[] }).verified ?? [];
  const pendingSkills: string[] = memberSkills ? memberSkills.pending : (skills as { pending: string[] }).pending ?? [];

  // Route to IHRP for HCWM staff, IBF for all others
  const isHCWM = isHCWMDept(dept);
  const ihrpBadges = isHCWM ? getIHRPBadgesForRole(designation, grade) : null;
  const roadmapUrl = isHCWM
    ? "https://ihrp.sg/skill-badges-overview/"
    : getIBFJobFunctionUrl(designation, dept).url;
  const roadmapTrack = isHCWM
    ? "HR Professionals"
    : getIBFJobFunctionUrl(designation, dept).track;

  const grouped: [string, string[], string][] = [];

  if (isHCWM && ihrpBadges) {
    const unverifiedFunctional = ihrpBadges.functional.filter(s => !verifiedSkills.includes(s));
    const unverifiedBehavioural = ihrpBadges.behavioural.filter(s => !verifiedSkills.includes(s));
    const unverifiedCerts = ihrpBadges.certifications.filter(e => !verifiedSkills.includes(e));
    const funcItems = unverifiedFunctional.slice(0, 3);
    const behavItems = unverifiedBehavioural.slice(0, 2);
    const certItems = unverifiedCerts.slice(0, Math.max(1, 6 - funcItems.length - behavItems.length));
    if (funcItems.length > 0) grouped.push(["IHRP Functional Competency", funcItems, "bg-blue-400"]);
    if (behavItems.length > 0) grouped.push(["IHRP Mindsets & Behaviours", behavItems, "bg-violet-400"]);
    if (certItems.length > 0) grouped.push(["IHRP Certification", certItems, "bg-orange-400"]);
  } else {
    const recommended = getDefaultSkillsForRole(designation, dept, grade);
    const regulatoryExams = getRegulatorExamsForRole(designation, dept);
    const unverifiedSkills = recommended.filter(skill => !verifiedSkills.includes(skill));
    const unverifiedExams = regulatoryExams.filter(e => !verifiedSkills.includes(e));
    const tscSkills = unverifiedSkills.filter(s => classifySkill(s) === "Technical Skills & Competencies").slice(0, 3);
    const ccsSkills = unverifiedSkills.filter(s => classifySkill(s) === "Critical Core Skills").slice(0, 2);
    const examItems = unverifiedExams.slice(0, Math.max(1, 6 - tscSkills.length - ccsSkills.length));
    if (tscSkills.length > 0) grouped.push(["Technical Skills & Competencies", tscSkills, "bg-blue-400"]);
    if (ccsSkills.length > 0) grouped.push(["Critical Core Skills", ccsSkills, "bg-violet-400"]);
    if (examItems.length > 0) grouped.push(["Regulatory Examinations", examItems, "bg-orange-400"]);
  }

  const handleSubmit = (skill: string) => {
    if (pendingSkills.includes(skill)) return;
    void addPendingSkill(skill);
    toast.success(`"${skill}" submitted for approval · your manager will be notified`);
  };

  const totalItems = grouped.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div className="space-y-4">
      {totalItems === 0 ? (
        <p className="text-sm text-muted-foreground">All recommended skills have been verified. Check your Skills Profile.</p>
      ) : (
        grouped.map(([cat, skillList, dotColor]) => (
          <div key={cat}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{cat}</div>
            </div>
            <div className="space-y-2 pl-3 border-l border-border/60">
              {skillList.map(skill => {
                const isPending = pendingSkills.includes(skill);
                return (
                  <div key={skill} className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleSubmit(skill)}
                      disabled={isPending}
                      className="shrink-0 disabled:cursor-default"
                      title={isPending ? "Pending manager approval" : "Click to submit for approval"}
                    >
                      {isPending ? (
                        <Clock className="size-3.5 text-amber-foreground" />
                      ) : (
                        <Circle className="size-3.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
                      )}
                    </button>
                    <span className={cn("text-sm flex-1", isPending && "text-amber-foreground/80")}>
                      {skill}
                    </span>
                    {isPending && (
                      <span className="text-[10px] text-amber-foreground/60 shrink-0">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      <div className="pt-1 space-y-1.5 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Showing up to 6 recommended skills &amp; certifications for your role, excluding verified skills.
        </p>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          Click to submit acquired skills or certifications for manager approval.
        </p>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          <a
            href={roadmapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            {isHCWM
              ? "Click here to view IHRP Skills Badges for HR Professionals"
              : `Click here to view the full IBF Skills Framework for ${roadmapTrack}`
            }
          </a>
        </p>
      </div>
    </div>
  );
}
