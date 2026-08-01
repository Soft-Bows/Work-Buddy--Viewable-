import { useState, useMemo, useEffect, useRef } from "react";
import { Card, SectionTitle } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { BarChart3, AlertTriangle, Download, Upload, Search, ChevronDown, ChevronUp, ChevronRight, X, UserX, UserCheck, Laptop, Loader2, Calendar, Pencil, Plus, Trash2, Settings2, Save, CheckCircle2, XCircle } from "lucide-react";
import { cn, stripLeadingZero, pilotTestActivity, recognizeTrigger, workingDaysSince } from "@/lib/utils";
import { toast } from "sonner";
import type { Activity, DeptGoal } from "@/lib/mockData";
import { CATEGORY_LABELS, AUDIENCE_LABELS } from "@/lib/mockData";
import { getRedeemedRewardsFn, disableStaffFn, enableStaffFn, getStaffPointsLogFn, getOrgNetPointsFn } from "@/lib/api/data.functions";
import { exportActivitiesToExcel, parseActivityImportFile, validateImportRows, type ImportValidationResult } from "@/lib/activityImportExport";
import { computeChallengeThemes, computeCompetencyGapRow, getRelevantDeptsForViewer, HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { COMPLIANCE_DEPT_NAME, complianceTeamMembers, complianceDepartmentGoals } from "@/lib/complianceData";
import { MARKETING_DEPT_NAME, marketingTeamMembers, marketingDepartmentGoals } from "@/lib/marketingData";
import { AiGovernancePanel } from "@/components/sections/AiGovernancePanel";

// ── PhillipCapital department list ────────────────────────────────────────────
// Matches the 9 real department values found in Staff Listing 2 — keep this in sync
// with scripts/sync-users-from-staff-listing.mjs's source data, otherwise imported
// staff in an unlisted department silently disappear from these grouped views.
const PC_DEPARTMENTS = [
  "Human Capital & Workplace Management",
  "Affluent Markets",
  "Operations - Equities",
  "Operations - Unit Trust",
  "Partnership",
  "CFD Market Making",
  "Group Compliance",
  "Credit Risk Management (F.K.A. Credit Admin)",
  "Accounts Processing Unit",
  "Compliance",
  "Marketing Communications",
];

// ── Mock action plan data per manager ─────────────────────────────────────────
const MANAGER_ACTION_PLANS: {
  id: string; name: string; dept: string;
  items: { title: string; done: boolean }[];
}[] = [
  { id: "u0", name: "Sarah Chen", dept: "Human Capital & Workplace Management",
    items: [
      { title: "Internal: Mentoring Playbook 2026", done: false },
      { title: "Internal: Pair with a Mentor Network buddy", done: true },
      { title: "Coursera: The Manager's Toolkit", done: false },
      { title: "Book: The Coaching Habit (Bungay Stanier)", done: false },
    ],
  },
  { id: "u1", name: "Anabelle Tan", dept: "Human Capital & Workplace Management",
    items: [
      { title: "Internal: Mentoring Playbook 2026", done: true },
      { title: "Coursera: The Manager's Toolkit", done: false },
      { title: "Book: The Coaching Habit (Bungay Stanier)", done: false },
    ],
  },
  { id: "u21", name: "Nadia Yong", dept: "Credit Risk Management (F.K.A. Credit Admin)",
    items: [
      { title: "MAS Credit Risk Regulatory Update Briefing", done: true },
      { title: "Q2 Portfolio Credit Quality Review with Group Risk", done: true },
      { title: "AI Credit Scoring Model Readiness Check", done: false },
      { title: "Credit Risk Leadership Workshop", done: false },
    ],
  },
  { id: "u22", name: "Victor Lai", dept: "Credit Risk Management (F.K.A. Credit Admin)",
    items: [
      { title: "MAS Credit Risk Regulatory Update Briefing", done: true },
      { title: "Q2 Credit Approval Turnaround Review", done: false },
      { title: "Advanced Credit Risk Modelling Enrolment", done: false },
    ],
  },
];

function getCompletion(items: { done: boolean }[]) {
  if (!items.length) return 0;
  return Math.round((items.filter(i => i.done).length / items.length) * 100);
}

// ── SVGs ─────────────────────────────────────────────────────────────────────

function ClipboardCheckSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 40" fill="none">
      <rect x="4" y="6" width="28" height="32" rx="3" fill="#93C5FD"/>
      <rect x="11" y="2" width="14" height="8" rx="3" fill="#3B82F6"/>
      <rect x="13" y="4" width="10" height="4" rx="2" fill="#DBEAFE"/>
      <line x1="8" y1="17" x2="22" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <line x1="8" y1="23" x2="20" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <line x1="8" y1="29" x2="16" y2="29" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.75"/>
      <circle cx="26" cy="28" r="7" fill="#FCD34D"/>
      <path d="M22 28 L25 31 L30 24" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function GearSparkSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
      <path d="M14 3 L17 1 L20 3 L23 2 L24 5 L27 6 L27 9 L30 11 L29 14 L31 17 L29 20 L30 23 L27 24 L27 27 L24 28 L23 31 L20 30 L17 32 L14 30 L11 31 L10 28 L7 27 L7 24 L4 23 L5 20 L3 17 L5 14 L4 11 L7 9 L7 6 L10 5 L11 2Z" fill="#93C5FD" opacity="0.6"/>
      <circle cx="17" cy="17" r="6" fill="#3B82F6"/>
      <circle cx="17" cy="16" r="2.5" fill="white" fillOpacity="0.4"/>
      <circle cx="27" cy="7" r="1.5" fill="#FCD34D"/>
      <circle cx="7" cy="27" r="1" fill="#A5F3FC"/>
    </svg>
  );
}

function TrophySVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect x="12" y="28" width="12" height="4" rx="2" fill="#D97706"/>
      <rect x="9" y="30" width="18" height="3" rx="2" fill="#F59E0B"/>
      <path d="M8 6 L28 6 L26 20 Q24 26 18 26 Q12 26 10 20 Z" fill="#FCD34D"/>
      <path d="M8 6 L4 6 Q2 8 2 12 Q2 18 8 18 L10 18 Z" fill="#FCD34D" opacity="0.7"/>
      <path d="M28 6 L32 6 Q34 8 34 12 Q34 18 28 18 L26 18 Z" fill="#FCD34D" opacity="0.7"/>
      <path d="M8 6 L8 18 Q6 18 4.5 14 Q3 10 4 7 Q5 6 8 6Z" fill="#F59E0B"/>
      <path d="M28 6 L28 18 Q30 18 31.5 14 Q33 10 32 7 Q31 6 28 6Z" fill="#F59E0B"/>
      <circle cx="18" cy="14" r="4" fill="#F59E0B"/>
      <path d="M18 10 L19 13 L22 13 L20 15 L21 18 L18 16 L15 18 L16 15 L14 13 L17 13 Z" fill="#FEF3C7"/>
    </svg>
  );
}

const MEDAL_COLORS = [
  { bg: "from-amber-400 to-orange-400", rank: "🥇" },
  { bg: "from-slate-300 to-slate-400", rank: "🥈" },
  { bg: "from-orange-300 to-amber-500", rank: "🥉" },
  { bg: "from-teal-400 to-cyan-400", rank: "4" },
  { bg: "from-violet-400 to-purple-500", rank: "5" },
];
const BAR_COLORS = [
  "bg-gradient-to-r from-amber-400 to-orange-400",
  "bg-gradient-to-r from-slate-300 to-slate-400",
  "bg-gradient-to-r from-orange-300 to-amber-500",
  "bg-gradient-to-r from-teal-400 to-cyan-400",
  "bg-gradient-to-r from-violet-400 to-purple-500",
];

// ── Action Plan Popup ─────────────────────────────────────────────────────────

function ActionPlanPopup({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"overview" | "dept" | "manager">("overview");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMgr, setSelectedMgr] = useState<typeof MANAGER_ACTION_PLANS[0] | null>(null);

  const deptGroups = useMemo(() => {
    const map = new Map<string, typeof MANAGER_ACTION_PLANS>();
    MANAGER_ACTION_PLANS.forEach(m => {
      if (!map.has(m.dept)) map.set(m.dept, []);
      map.get(m.dept)!.push(m);
    });
    return [...map.entries()]
      .map(([dept, mgrs]) => {
        const avg = Math.round(mgrs.reduce((a, m) => a + getCompletion(m.items), 0) / mgrs.length);
        return { dept, mgrs, avg, nonCompletion: 100 - avg };
      })
      .sort((a, b) => b.nonCompletion - a.nonCompletion);
  }, []);

  const pendingManagers = MANAGER_ACTION_PLANS
    .map(m => ({ ...m, completion: getCompletion(m.items) }))
    .filter(m => m.completion < 100)
    .sort((a, b) => a.completion - b.completion);

  const overallAvg = Math.round(
    MANAGER_ACTION_PLANS.reduce((a, m) => a + getCompletion(m.items), 0) / MANAGER_ACTION_PLANS.length
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-violet-500/10">
          <div>
            <h3 className="font-display text-lg">Average Manager Action Plan Completion Rate</h3>
            <p className="text-xs text-muted-foreground">Overall: <span className="font-semibold text-foreground">{overallAvg}%</span> across {MANAGER_ACTION_PLANS.length} managers</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          {(["overview", "dept"] as const).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setSelectedDept(null); setSelectedMgr(null); }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                view === v || (view === "manager" && v === "dept")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {v === "overview" ? "Pending Managers" : "By Department"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {view === "overview" && !selectedMgr && (
            <>
              <p className="text-xs text-muted-foreground mb-3">Managers who have not fully completed their action plans — ordered by lowest completion first.</p>
              {pendingManagers.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMgr(m); setView("manager"); }}
                  className="w-full text-left rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 p-4 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.dept}</div>
                    </div>
                    <div className={cn("text-sm font-bold", m.completion < 40 ? "text-rag-red" : m.completion < 75 ? "text-amber-foreground" : "text-rag-green")}>
                      {m.completion}%
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", m.completion < 40 ? "bg-rag-red" : m.completion < 75 ? "bg-amber" : "bg-rag-green")} style={{ width: `${m.completion}%` }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{m.items.filter(i => !i.done).length} items remaining</div>
                </button>
              ))}
              {pendingManagers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">All managers have completed their action plans.</p>
              )}
            </>
          )}

          {view === "manager" && selectedMgr && (
            <>
              <button onClick={() => { setView("overview"); setSelectedMgr(null); }} className="flex items-center gap-1 text-xs text-primary hover:underline mb-2">← Back</button>
              <div className="mb-4">
                <div className="font-semibold">{selectedMgr.name}</div>
                <div className="text-xs text-muted-foreground">{selectedMgr.dept} · {getCompletion(selectedMgr.items)}% complete</div>
              </div>
              <div className="space-y-2">
                {selectedMgr.items.map((item, i) => (
                  <div key={i} className={cn("flex items-center gap-3 p-3 rounded-lg border", item.done ? "bg-rag-green/5 border-rag-green/20" : "bg-muted/40 border-border")}>
                    <div className={cn("size-5 rounded-full flex items-center justify-center shrink-0", item.done ? "bg-rag-green text-white" : "border-2 border-muted-foreground/30")}>
                      {item.done && <span className="text-[10px]">✓</span>}
                    </div>
                    <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>{item.title}</span>
                    <span className={cn("text-[10px] font-medium shrink-0", item.done ? "text-rag-green" : "text-amber-foreground")}>{item.done ? "Done" : "Pending"}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "dept" && !selectedDept && (
            <>
              <p className="text-xs text-muted-foreground mb-3">Departments sorted by highest non-completion rate first.</p>
              {deptGroups.map(d => (
                <button
                  key={d.dept}
                  onClick={() => setSelectedDept(d.dept)}
                  className="w-full text-left rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 p-4 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{d.dept}</div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{d.mgrs.length} manager{d.mgrs.length !== 1 ? "s" : ""}</span>
                      <span className={cn("font-bold", d.nonCompletion > 60 ? "text-rag-red" : d.nonCompletion > 30 ? "text-amber-foreground" : "text-rag-green")}>
                        {d.nonCompletion}% incomplete
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", d.nonCompletion > 60 ? "bg-rag-red" : d.nonCompletion > 30 ? "bg-amber" : "bg-rag-green")} style={{ width: `${d.nonCompletion}%` }} />
                  </div>
                </button>
              ))}
            </>
          )}

          {view === "dept" && selectedDept && (() => {
            const grp = deptGroups.find(d => d.dept === selectedDept)!;
            const sorted = [...grp.mgrs]
              .map(m => ({ ...m, completion: getCompletion(m.items) }))
              .sort((a, b) => a.completion - b.completion);
            return (
              <>
                <button onClick={() => setSelectedDept(null)} className="flex items-center gap-1 text-xs text-primary hover:underline mb-2">← Back</button>
                <div className="text-sm font-semibold mb-4">{selectedDept}</div>
                <div className="space-y-3">
                  {sorted.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMgr(m); setView("manager"); }}
                      className="w-full text-left rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-medium text-sm">{m.name}</div>
                        <div className={cn("text-sm font-bold", m.completion < 40 ? "text-rag-red" : m.completion < 75 ? "text-amber-foreground" : "text-rag-green")}>
                          {m.completion}%
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", m.completion < 40 ? "bg-rag-red" : m.completion < 75 ? "bg-amber" : "bg-rag-green")} style={{ width: `${m.completion}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Staff Profile Popup ───────────────────────────────────────────────────────

function StaffProfilePopup({
  staff,
  allStaff,
  onClose,
  onDisable,
  onSupervisorChange,
}: {
  staff: ReturnType<typeof useApp>["staffList"][0] & { status: "active" | "disabled" };
  allStaff: ReturnType<typeof useApp>["staffList"];
  onClose: () => void;
  onDisable: () => void;
  onSupervisorChange: (userId: string, newSupervisor: string) => void;
}) {
  const [rawActivities, setRawActivities] = useState<{ text: string; pts: number; date: string }[]>([]);
  const [loadingActs, setLoadingActs] = useState(true);
  const [editingSupervisor, setEditingSupervisor] = useState(false);
  const [supervisorDraft, setSupervisorDraft] = useState(staff.supervisor ?? "");

  useEffect(() => {
    setLoadingActs(true);
    getStaffPointsLogFn({ data: { userId: staff.id } })
      .then(rows => { setRawActivities(rows); setLoadingActs(false); })
      .catch(() => setLoadingActs(false));
  }, [staff.id]);

  const saveSupervisor = () => {
    if (supervisorDraft === staff.supervisor) { setEditingSupervisor(false); return; }
    onSupervisorChange(staff.id, supervisorDraft);
    toast.success(`Supervisor updated — ${staff.name} is now under ${supervisorDraft || "no supervisor"}`);
    setEditingSupervisor(false);
  };

  // Eligible supervisors = all HODs or anyone at a grade higher than the current staff member
  const eligibleSupervisors = allStaff
    .filter(s => s.id !== staff.id && (s.hod || (s.grade ?? 0) > (staff.grade ?? 0)))
    .map(s => s.name)
    .sort();

  // Group activities by type (text before ":"), sum points, sort by frequency
  const groupedActivities = useMemo(() => {
    const map = new Map<string, { label: string; totalPts: number; count: number }>();
    rawActivities.forEach(a => {
      const key = a.text.includes(":") ? a.text.split(":")[0].trim() : a.text;
      const entry = map.get(key) ?? { label: key, totalPts: 0, count: 0 };
      entry.totalPts += a.pts;
      entry.count++;
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [rawActivities]);

  const initials = staff.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-border">
        <div className="relative flex items-center gap-4 px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)" }}>
          <div className="size-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-white">{staff.name}</div>
            <div className="text-sm text-white/80">{staff.role}</div>
          </div>
          <button onClick={onClose} className="size-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center shrink-0">
            <X className="size-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: "Name", value: staff.name },
              { label: "Designation", value: staff.role },
              { label: "Department", value: staff.dept },
              { label: "Job Grade", value: staff.gradeLabel },
              { label: "Tenure", value: staff.tenure },
              { label: "Points YTD", value: `${staff.pointsYTD} pts`, highlight: true },
              { label: "Status", value: staff.status === "active" ? "Active" : "Disabled", accent: staff.status !== "active" },
            ].map(({ label, value, highlight, accent }) => (
              <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</div>
                <div className={cn("font-medium text-sm", highlight && "text-amber-foreground", accent && "text-rag-red")}>{value}</div>
              </div>
            ))}
            {/* Leave Supervisor — editable */}
            <div className="col-span-2 rounded-lg bg-muted/40 px-3 py-2.5 border border-border/60">
              <div className="flex items-center justify-between mb-0.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Leave Supervisor</div>
                {!editingSupervisor && (
                  <button onClick={() => setEditingSupervisor(true)} className="flex items-center gap-1 text-[10px] text-primary hover:opacity-70 transition-opacity">
                    <Pencil className="size-3" /> Edit
                  </button>
                )}
              </div>
              {editingSupervisor ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={supervisorDraft}
                    onChange={e => setSupervisorDraft(e.target.value)}
                    className="flex-1 text-sm rounded-md border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— No supervisor —</option>
                    {eligibleSupervisors.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <button onClick={saveSupervisor} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                    <Save className="size-3" /> Save
                  </button>
                  <button onClick={() => { setEditingSupervisor(false); setSupervisorDraft(staff.supervisor ?? ""); }} className="text-xs px-2 py-1.5 rounded-md border border-border hover:bg-muted">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="font-medium text-sm">{staff.supervisor || "—"}</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Top Activities (this month)</div>
            {loadingActs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3"><Loader2 className="size-4 animate-spin" />Loading…</div>
            ) : groupedActivities.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">No activities recorded this month.</div>
            ) : (
              <div className="space-y-1.5">
                {groupedActivities.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/40 text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 border border-border/60">{a.count}×</span>
                      <div className="text-foreground/80 truncate">{a.label}</div>
                    </div>
                    <div className={cn("text-xs font-semibold shrink-0 ml-2", a.totalPts > 0 ? "text-amber-foreground" : a.totalPts < 0 ? "text-rag-red/70" : "text-muted-foreground")}>
                      {a.totalPts > 0 ? `+${a.totalPts}` : a.totalPts < 0 ? String(a.totalPts) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {staff.status === "active" ? (
            <button
              onClick={onDisable}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-rag-red/30 bg-rag-red/5 text-rag-red text-sm hover:bg-rag-red/10 transition-colors"
            >
              <UserX className="size-4" /> Disable Account
            </button>
          ) : (
            <button
              onClick={onDisable}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-rag-green/30 bg-rag-green/5 text-rag-green text-sm hover:bg-rag-green/10 transition-colors"
            >
              <UserCheck className="size-4" /> Re-enable Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity Management Panel ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Activity["category"], string> = {
  goal: "bg-primary/10 text-primary border-primary/20",
  recognition: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-700/30",
  skill: "bg-teal/10 text-teal border-teal/20",
  engagement: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/30",
  penalty: "bg-rag-red/10 text-rag-red border-rag-red/20",
};

const mkBlankDraft = (audience: Activity["audience"] = "all"): Omit<Activity, "id"> => ({
  name: "", points: 10, isCompulsory: false, audience, category: "goal", live: true,
  timelineDays: undefined, timelineTrigger: "", penaltyPoints: undefined,
});

// ── Audience section config ────────────────────────────────────────────────────

const AUDIENCE_SECTIONS: { key: Activity["audience"]; label: string; desc: string; borderClass: string; headerClass: string }[] = [
  {
    key: "all",
    label: "All Staff",
    desc: "Applies to every user regardless of role",
    borderClass: "border-primary/20",
    headerClass: "bg-primary/5 border-b border-primary/15",
  },
  {
    key: "manager",
    label: "Managers & HODs",
    desc: "Applies to users who manage direct reports",
    borderClass: "border-violet-300/50 dark:border-violet-500/30",
    headerClass: "bg-violet-50/60 border-b border-violet-200/60 dark:bg-violet-900/10 dark:border-violet-700/30",
  },
  {
    key: "hod",
    label: "HODs Only",
    desc: "Applies exclusively to Heads of Department",
    borderClass: "border-amber-300/60 dark:border-amber-500/30",
    headerClass: "bg-amber-50/60 border-b border-amber-200/60 dark:bg-amber-900/10 dark:border-amber-700/30",
  },
];

// ── Inline ActivityForm ────────────────────────────────────────────────────────

function ActivityForm({
  draft, setDraft, onSave, onCancel, saveLabel, liveActivityNames, mode, allActivityNames, currentName,
}: {
  draft: Partial<Omit<Activity, "id">>;
  setDraft: (fn: (prev: typeof draft) => typeof draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  liveActivityNames: string[];
  // "add" keeps the existing dropdown + custom-text behavior. "edit" is dropdown-only — every
  // activity that actually does something in this dashboard is wired to a specific point-awarding
  // call site elsewhere, so renaming an existing activity must reuse another known catalog entry's
  // name (live or draft), never free text.
  mode: "add" | "edit";
  allActivityNames?: string[];
  currentName?: string;
}) {
  const [pilotErrors, setPilotErrors] = useState<string[]>([]);
  const [triggerAcknowledged, setTriggerAcknowledged] = useState(false);
  const showCustomInput = mode === "add" && (!draft.name || (!liveActivityNames.includes(draft.name) && draft.name !== ""));
  const editNameOptions = mode === "edit"
    ? Array.from(new Set([currentName, ...(allActivityNames ?? [])].filter((n): n is string => !!n)))
    : [];

  // "Pilot test" for the trigger text itself: does the dashboard actually recognize this as
  // something it can act on? Unlike pilotTestActivity's hard checks, this is a soft heuristic — an
  // unrecognized trigger might describe a real process that just isn't wired up yet, so it can't be
  // authoritatively rejected, only flagged for the admin to confirm they understand the limitation.
  const triggerResolution = draft.timelineTrigger?.trim() ? recognizeTrigger(draft.timelineTrigger) : null;
  const triggerNeedsAck = !!draft.timelineTrigger?.trim() && !triggerResolution;

  const handleSave = () => {
    const errors = pilotTestActivity(draft);
    if (errors.length > 0) { setPilotErrors(errors); return; }
    if (triggerNeedsAck && !triggerAcknowledged) { setPilotErrors(["Confirm you understand the \"Starting from when?\" trigger below before saving."]); return; }
    setPilotErrors([]);
    onSave();
  };

  return (
    <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4 animate-in slide-in-from-top-1 duration-150">

      {/* Activity name */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Activity Name</label>
        {mode === "edit" ? (
          <>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 mb-1.5">
              Editing can only reassign this activity to another known activity in the dashboard's catalog (live or draft) — custom text isn't supported here, since undefined activities have no real tracking behind them.
            </p>
            <select
              value={editNameOptions.includes(draft.name ?? "") ? draft.name : ""}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {editNameOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 mb-1.5">
              Choose an existing live activity to re-use its name, or type a custom one. Only activities that are set to <em>Live</em> appear in this list.
            </p>
            <select
              value={liveActivityNames.includes(draft.name ?? "") ? draft.name : ""}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select a live activity or type custom below —</option>
              {liveActivityNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input
              type="text"
              placeholder="Custom activity name…"
              value={showCustomInput ? (draft.name ?? "") : ""}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </>
        )}
      </div>

      {/* Points + Category + Audience row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Points Awarded</label>
          <input
            type="number"
            value={draft.points ?? 0}
            onChange={e => setDraft(p => ({ ...p, points: Number(stripLeadingZero(e.target.value)) }))}
            className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="text-[10px] text-muted-foreground mt-1">Use a negative number for a penalty activity</div>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Category</label>
          <select
            value={draft.category ?? "goal"}
            onChange={e => setDraft(p => ({ ...p, category: e.target.value as Activity["category"] }))}
            className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.keys(CATEGORY_LABELS) as Activity["category"][]).map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Audience</label>
          <select
            value={draft.audience ?? "all"}
            onChange={e => setDraft(p => ({ ...p, audience: e.target.value as Activity["audience"] }))}
            className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(Object.keys(AUDIENCE_LABELS) as Activity["audience"][]).map(a => (
              <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-border/60 bg-background p-3 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Completion Timeline</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Complete within (days)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 7"
              value={draft.timelineDays ?? ""}
              onChange={e => setDraft(p => ({ ...p, timelineDays: e.target.value ? Number(stripLeadingZero(e.target.value)) : undefined }))}
              className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Starting from when?</label>
            <input
              type="text"
              placeholder="e.g. team member submits a goal"
              value={draft.timelineTrigger ?? ""}
              onChange={e => setDraft(p => ({ ...p, timelineTrigger: e.target.value }))}
              className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/70">Leave blank if this activity has no fixed deadline.</p>

        {/* Trigger recognition — "pilot tests" whether the dashboard can actually act on this text */}
        {draft.timelineTrigger?.trim() && (
          triggerResolution ? (
            <div className="flex items-start gap-2 rounded-lg border border-rag-green/30 bg-rag-green/5 px-2.5 py-2">
              <CheckCircle2 className="size-3.5 text-rag-green shrink-0 mt-0.5" />
              <div className="text-[10px] text-rag-green/90">Recognized — will pull from {triggerResolution}.</div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 px-2.5 py-2 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-800 dark:text-amber-300">
                  Not recognized — the dashboard has no live mechanism wired to this trigger description, so it won't automatically enforce a deadline for it.
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer pl-0.5">
                <input
                  type="checkbox"
                  checked={triggerAcknowledged}
                  onChange={e => setTriggerAcknowledged(e.target.checked)}
                  className="rounded mt-0.5 shrink-0"
                />
                <span className="text-[10px] text-amber-800 dark:text-amber-300">I understand this trigger isn't recognized and won't be automatically enforced.</span>
              </label>
            </div>
          )
        )}
      </div>

      {/* Compulsory + Live checkboxes with explanations */}
      <div className="space-y-2.5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-700/30 px-3 py-2.5">
          <input
            type="checkbox"
            id="form-compulsory"
            checked={draft.isCompulsory ?? false}
            onChange={e => setDraft(p => ({ ...p, isCompulsory: e.target.checked }))}
            className="rounded mt-0.5 shrink-0"
          />
          <label htmlFor="form-compulsory" className="cursor-pointer">
            <div className="text-sm font-medium">Compulsory</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              This activity is <strong>mandatory</strong> for the target audience. Users who fail to complete it within the set timeline will incur an automatic penalty deduction from their points balance. Set the penalty amount below.
            </div>
          </label>
        </div>

        {(draft.isCompulsory) && (
          <div className="ml-6 rounded-lg border border-rag-red/25 bg-rag-red/5 px-3 py-2.5 animate-in slide-in-from-top-1 duration-150">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-rag-red/80">Penalty for Non-Completion (pts deducted)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 10"
              value={draft.penaltyPoints ?? ""}
              onChange={e => setDraft(p => ({ ...p, penaltyPoints: e.target.value ? Number(stripLeadingZero(e.target.value)) : undefined }))}
              className="w-full mt-1.5 text-sm rounded-lg border border-rag-red/30 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1">Enter a positive number — it will be applied as a deduction (e.g. 10 → −10 pts).</p>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <input
            type="checkbox"
            id="form-live"
            checked={draft.live ?? true}
            onChange={e => setDraft(p => ({ ...p, live: e.target.checked }))}
            className="rounded mt-0.5 shrink-0"
          />
          <label htmlFor="form-live" className="cursor-pointer">
            <div className="text-sm font-medium">Live — Visible to All Users</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              When checked, this activity appears in every user's <strong>Activity Catalog</strong> on their Rewards page, and points are actively tracked for it across the dashboard. Unchecking hides the activity from users (admin draft mode) — points will not be awarded or penalised for it until it is set live again.
            </div>
          </label>
        </div>
      </div>

      {/* Pilot-test errors — blocks Save until the timeline configuration is coherent */}
      {pilotErrors.length > 0 && (
        <div className="rounded-lg border border-rag-red/30 bg-rag-red/5 px-3 py-2.5 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rag-red">
            <XCircle className="size-3.5" /> Pilot test failed — fix before this can go live
          </div>
          <ul className="mt-1.5 space-y-1 list-disc list-inside">
            {pilotErrors.map((e, i) => <li key={i} className="text-[11px] text-rag-red/90">{e}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
          <Save className="size-3" /> {saveLabel}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── Activity row (read mode) ───────────────────────────────────────────────────

function ActivityRow({
  activity: a,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 transition-colors",
      a.live ? "bg-card border-border" : "bg-muted/20 border-border/40 opacity-55"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{a.name}</span>
            {a.isCompulsory && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30 shrink-0 font-medium">Required</span>
            )}
            {!a.live && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">Draft</span>
            )}
          </div>
          {/* Category tag */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", CATEGORY_COLORS[a.category])}>{CATEGORY_LABELS[a.category]}</span>
            {/* Timeline */}
            {a.timelineDays && a.timelineTrigger && (
              <span className="text-[10px] text-muted-foreground">
                Due within <strong>{a.timelineDays}d</strong> of {a.timelineTrigger}
              </span>
            )}
          </div>
          {/* Penalty row — only for compulsory with a penalty set */}
          {a.isCompulsory && a.penaltyPoints != null && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-rag-red/80">Penalty if overdue: <strong>−{a.penaltyPoints} pts</strong></span>
            </div>
          )}
        </div>

        {/* Points badge + actions */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <div className={cn("text-sm font-bold", a.points > 0 ? "text-teal" : a.points < 0 ? "text-rag-red" : "text-muted-foreground")}>
            {a.points > 0 ? `+${a.points}` : a.points} pts
          </div>
          <button onClick={onEdit} className="size-7 rounded-lg border border-border hover:bg-muted grid place-items-center transition-colors" title="Edit">
            <Pencil className="size-3 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="size-7 rounded-lg border border-rag-red/30 hover:bg-rag-red/10 grid place-items-center transition-colors" title="Delete">
            <Trash2 className="size-3 text-rag-red/70" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ActivityManagementPanel ────────────────────────────────────────────────────

function ImportResultsDialog({ result, onClose }: { result: ImportValidationResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Upload className="size-5 text-primary" />
          <div className="font-semibold text-sm">Import Results</div>
        </div>

        {result.valid.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-rag-green/30 bg-rag-green/5 px-3 py-2.5">
            <CheckCircle2 className="size-4 text-rag-green shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong>{result.valid.length}</strong> activit{result.valid.length === 1 ? "y" : "ies"} updated and live immediately.
            </div>
          </div>
        )}

        {result.errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rag-red">
              <XCircle className="size-3.5" /> {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped — action required
            </div>
            {result.errors.map((err, i) => (
              <div key={i} className="rounded-lg border border-rag-red/25 bg-rag-red/5 px-3 py-2.5">
                <div className="text-xs font-medium">{err.name} <span className="text-[10px] text-muted-foreground">({err.id})</span></div>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  {err.reasons.map((r, j) => <li key={j} className="text-[11px] text-rag-red/90">{r}</li>)}
                </ul>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Fix these rows in the source file (or re-export and re-edit) and upload again.</p>
          </div>
        )}

        {result.warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3.5" /> {result.warnings.length} row{result.warnings.length === 1 ? "" : "s"} applied with a warning
            </div>
            {result.warnings.map((w, i) => (
              <div key={i} className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 px-3 py-2.5">
                <div className="text-xs font-medium">{w.name} <span className="text-[10px] text-muted-foreground">({w.id})</span></div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">{w.message}</p>
              </div>
            ))}
          </div>
        )}

        {result.valid.length === 0 && result.errors.length === 0 && result.warnings.length === 0 && (
          <p className="text-xs text-muted-foreground">No recognizable rows were found in this file.</p>
        )}

        <button onClick={onClose} className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
          Close
        </button>
      </div>
    </div>
  );
}

function ActivityManagementPanel({
  activities,
  onAdd,
  onUpdate,
  onDelete,
  onBulkUpsert,
}: {
  activities: Activity[];
  onAdd: (a: Omit<Activity, "id">) => void;
  onUpdate: (id: string, changes: Partial<Activity>) => void;
  onDelete: (id: string) => void;
  onBulkUpsert: (updates: { id: string; changes: Partial<Activity> }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Activity>>({});
  const [editingOriginalName, setEditingOriginalName] = useState<string | undefined>(undefined);
  // Which audience section is showing the "Add Activity" form
  const [addingForAudience, setAddingForAudience] = useState<Activity["audience"] | null>(null);
  const [newDraft, setNewDraft] = useState<Omit<Activity, "id">>(mkBlankDraft());
  // Sections start collapsed — "only unfold upon clicking"
  const [expandedSections, setExpandedSections] = useState<Set<Activity["audience"]>>(new Set());
  const [importResult, setImportResult] = useState<ImportValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: Activity["audience"]) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  // Live activity names for the Add-mode dropdown (excludes the activity currently being edited)
  const liveActivityNames = activities.filter(a => a.live && a.id !== editingId).map(a => a.name);
  // All distinct activity names (live + draft) for the Edit-mode dropdown, excluding the one being edited
  const allActivityNames = Array.from(new Set(activities.filter(a => a.id !== editingId).map(a => a.name)));

  const startEdit = (a: Activity) => {
    setEditingId(a.id);
    setEditDraft({ ...a });
    setEditingOriginalName(a.name);
    setAddingForAudience(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); setEditingOriginalName(undefined); };

  const saveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, editDraft);
    toast.success("Activity updated — changes are live immediately");
    cancelEdit();
  };

  const startAdd = (audience: Activity["audience"]) => {
    cancelEdit();
    setAddingForAudience(audience);
    setNewDraft(mkBlankDraft(audience));
  };
  const cancelAdd = () => { setAddingForAudience(null); setNewDraft(mkBlankDraft()); };

  const saveNew = () => {
    if (!newDraft.name.trim()) { toast.error("Activity name is required"); return; }
    onAdd(newDraft);
    toast.success(`"${newDraft.name}" added to the activity catalog`);
    cancelAdd();
  };

  const confirmDelete = (a: Activity) => {
    if (!window.confirm(`Remove "${a.name}" from the activity catalog? This cannot be undone.`)) return;
    onDelete(a.id);
    toast.success(`"${a.name}" removed`);
  };

  const handleExport = () => {
    exportActivitiesToExcel(activities);
    toast.success("Activity catalog exported — Staff / Manager / HOD sheets");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      const rows = await parseActivityImportFile(file);
      const result = validateImportRows(rows, activities);
      if (result.valid.length > 0) onBulkUpsert(result.valid);
      setImportResult(result);
    } catch {
      toast.error("Couldn't read that file — make sure it's a .xlsx or .csv export from this dashboard.");
    }
  };

  // Group activities by category within each audience section
  const byCategoryWithin = (aud: Activity["audience"]) => {
    const relevant = activities.filter(a => a.audience === aud);
    const catMap = new Map<Activity["category"], Activity[]>();
    relevant.forEach(a => {
      if (!catMap.has(a.category)) catMap.set(a.category, []);
      catMap.get(a.category)!.push(a);
    });
    return catMap;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings2 className="size-5 text-primary" />
          <div className="text-left">
            <div className="font-semibold text-sm">Activity Management</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {activities.length} activities · {activities.filter(a => a.live).length} live · edit points, timelines &amp; penalties in real time
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="bg-card border-t border-border p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground max-w-md">
              Changes apply immediately across all user dashboards. Click a section below to expand it.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                <Download className="size-3.5" /> Export to Excel
              </button>
              <button
                onClick={handleImportClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                <Upload className="size-3.5" /> Import Updates
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileSelected} />
            </div>
          </div>

          {AUDIENCE_SECTIONS.map(section => {
            const catMap = byCategoryWithin(section.key);
            const totalInSection = activities.filter(a => a.audience === section.key).length;
            const isExpanded = expandedSections.has(section.key);
            return (
              <div key={section.key} className={cn("rounded-xl border overflow-hidden", section.borderClass)}>
                {/* Section header — click to expand/collapse */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className={cn("w-full px-4 py-3 flex items-center justify-between text-left", section.headerClass)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
                    <div>
                      <div className="text-sm font-semibold">{section.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{section.desc} · {totalInSection} activit{totalInSection === 1 ? "y" : "ies"}</div>
                    </div>
                  </div>
                  {isExpanded && addingForAudience !== section.key && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); startAdd(section.key); }}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); startAdd(section.key); } }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                    >
                      <Plus className="size-3" /> Add
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* "Add" form injected at top of the correct section */}
                    {addingForAudience === section.key && (
                      <ActivityForm
                        mode="add"
                        draft={newDraft}
                        setDraft={fn => setNewDraft(prev => fn(prev) as Omit<Activity, "id">)}
                        onSave={saveNew}
                        onCancel={cancelAdd}
                        saveLabel="Add Activity"
                        liveActivityNames={liveActivityNames}
                      />
                    )}

                    {/* Category sub-groups */}
                    {catMap.size === 0 && addingForAudience !== section.key && (
                      <p className="text-xs text-muted-foreground text-center py-2">No activities yet. Click Add to create one.</p>
                    )}
                    {(Object.keys(CATEGORY_LABELS) as Activity["category"][])
                      .filter(cat => catMap.has(cat))
                      .map(cat => {
                        const items = catMap.get(cat)!;
                        return (
                          <div key={cat}>
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                              <span className={cn("px-1.5 py-0.5 rounded-full border", CATEGORY_COLORS[cat])}>{CATEGORY_LABELS[cat]}</span>
                              <span className="text-muted-foreground/50">—</span>
                              <span>{items.length} activit{items.length === 1 ? "y" : "ies"}</span>
                            </div>
                            <div className="space-y-2">
                              {items.map(a => (
                                <div key={a.id}>
                                  {editingId === a.id ? (
                                    <ActivityForm
                                      mode="edit"
                                      draft={editDraft}
                                      setDraft={fn => setEditDraft(prev => fn(prev))}
                                      onSave={saveEdit}
                                      onCancel={cancelEdit}
                                      saveLabel="Save Changes"
                                      liveActivityNames={liveActivityNames}
                                      allActivityNames={allActivityNames}
                                      currentName={editingOriginalName}
                                    />
                                  ) : (
                                    <ActivityRow
                                      activity={a}
                                      onEdit={() => startEdit(a)}
                                      onDelete={() => confirmDelete(a)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {importResult && <ImportResultsDialog result={importResult} onClose={() => setImportResult(null)} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminSection() {
  const {
    directorMeta,
    staffList, liveActivities, addActivity, updateActivity, deleteActivity, bulkUpsertActivities, updateSupervisor,
    departmentGoals, opsDepartmentGoals, allTeamMemberSkills, opsAllTeamMemberSkills, deptGoalSkills,
    teamMembers, opsTeamMembersAll, disabledStaffList,
  } = useApp();
  // A director sees only the departments they actually oversee (2+ HODs -> a real multi-department
  // view); a true admin-tier viewer keeps the full org-wide picture. Same generic resolver Team
  // OKRs' Key Staff Challenges uses — no director-specific logic duplicated here.
  const directorScope = directorMeta
    ? getRelevantDeptsForViewer(directorMeta.name, directorMeta.department, staffList)
    : null;

  const [showActionPlan, setShowActionPlan] = useState(false);

  // ── Staff Management ───────────────────────────────────────────────────────
  const [staffOpen, setStaffOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<typeof staffList[0] | null>(null);
  const [localStaffStatuses, setLocalStaffStatuses] = useState<Record<string, "active" | "disabled">>({});

  // Accounts auto-disabled because the sync script detected a Last Day of Service in users.csv —
  // distinct from the manual admin toggle above. Valid for re-enabling within 30 working days of
  // detection; past that they're archived (still visible, but read-only).
  const [showDisabledAccounts, setShowDisabledAccounts] = useState(false);
  const [locallyEnabledIds, setLocallyEnabledIds] = useState<Set<string>>(new Set());
  const [enablingId, setEnablingId] = useState<string | null>(null);
  const visibleDisabledStaff = disabledStaffList.filter(s => !locallyEnabledIds.has(s.id));

  const handleEnableDisabledAccount = async (id: string, name: string) => {
    setEnablingId(id);
    try {
      await enableStaffFn({ data: { userId: id } });
      setLocallyEnabledIds(prev => new Set(prev).add(id));
      toast.success(`${name}'s account has been re-enabled`);
    } catch {
      toast.error("Failed to re-enable account");
    } finally {
      setEnablingId(null);
    }
  };

  const exportDisabledAccountsCsv = () => {
    const header = "id,name,email,department,role,supervisor,last_day_of_service,disabled_detected_date,working_days_since_detected,status";
    const csv = header + "\n" + visibleDisabledStaff.map(s => {
      const daysSince = s.disabledDetectedDate ? workingDaysSince(s.disabledDetectedDate) : 0;
      const status = daysSince >= 30 ? "Archived" : "Disabled";
      return [s.id, s.name, s.email, s.dept, s.role, s.supervisor, s.lastDayOfService, s.disabledDetectedDate, daysSince, status]
        .map(v => String(v).includes(",") ? `"${v}"` : v)
        .join(",");
    }).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "disabled_accounts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const effectiveStaff = staffList.map(s => ({
    ...s,
    status: (localStaffStatuses[s.id] ?? s.status) as "active" | "disabled",
  }));

  // Staff grouped by department (only PC departments) — scoped down to just the departments a
  // director oversees (per directorScope, above) when viewed by a director; a true admin-tier
  // viewer keeps every department.
  const deptGroups = useMemo(() => {
    const depts = directorScope ? PC_DEPARTMENTS.filter(d => directorScope.depts.includes(d)) : PC_DEPARTMENTS;
    return depts.map(dept => ({
      dept,
      staff: effectiveStaff.filter(s => s.dept === dept),
      activeCount: effectiveStaff.filter(s => s.dept === dept && s.status === "active").length,
    })).filter(g => g.staff.length > 0);
  }, [effectiveStaff, directorScope]);

  // Organisational Competency Gaps — contrasts the skills HODs have tagged as needed on their
  // department's team goals against the skills that department's team members actually possess.
  // Each department's team-goal set lives in its own silo (HCWM via `departmentGoals`, Credit Risk
  // Management via `opsDepartmentGoals`) rather than a single dept-keyed array, so the goals source
  // is resolved per department name here.
  const GOALS_BY_DEPT: Record<string, { id: string }[]> = {
    [HCWM_DEPT_NAME]: departmentGoals,
    [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [COMPLIANCE_DEPT_NAME]: complianceDepartmentGoals,
    [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
  };
  const allMemberSkills = useMemo(
    () => [...allTeamMemberSkills, ...opsAllTeamMemberSkills],
    [allTeamMemberSkills, opsAllTeamMemberSkills]
  );

  // Job-family groups — derived dynamically from whatever job families are present in staffList,
  // so it grows on its own as more staff/departments are added.
  const jobFamilyGroups = useMemo(() => {
    const families = [...new Set(effectiveStaff.map(s => s.jobFamily).filter(f => f && f !== "—"))];
    return families
      .map(fam => ({ name: fam, staff: effectiveStaff.filter(s => s.jobFamily === fam) }))
      .filter(g => g.staff.length > 0);
  }, [effectiveStaff]);

  // Shared gap computation (src/lib/insights.ts) — a group's required skills come from every
  // department any of its members belong to (a department view has exactly one; a job-family view
  // may span several, though in today's dataset each job family sits inside a single department).
  // Possessed skills stay scoped to just that group's own members, so job-family view narrows the
  // lens even though skills are only tagged at department-goal level.
  const competencyGapsByDept = useMemo(
    () => deptGroups.map(({ dept, staff }) => computeCompetencyGapRow(dept, staff, GOALS_BY_DEPT, deptGoalSkills, allMemberSkills)),
    [deptGroups, departmentGoals, opsDepartmentGoals, deptGoalSkills, allMemberSkills]
  );
  const competencyGapsByJobFamily = useMemo(
    () => jobFamilyGroups.map(({ name, staff }) => computeCompetencyGapRow(name, staff, GOALS_BY_DEPT, deptGoalSkills, allMemberSkills)),
    [jobFamilyGroups, departmentGoals, opsDepartmentGoals, deptGoalSkills, allMemberSkills]
  );

  const [gapView, setGapView] = useState<"dept" | "jobFamily">("dept");
  const [showAllGaps, setShowAllGaps] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const activeCompetencyGaps = gapView === "dept" ? competencyGapsByDept : competencyGapsByJobFamily;
  // Ranked biggest gap → smallest; untagged groups (no data yet) sort to the bottom, not the top.
  const sortedGaps = [...activeCompetencyGaps].sort((a, b) => {
    if (a.gapPct === null) return 1;
    if (b.gapPct === null) return -1;
    return b.gapPct - a.gapPct;
  });
  const visibleGaps = showAllGaps ? sortedGaps : sortedGaps.slice(0, 5);
  const switchGapView = (v: "dept" | "jobFamily") => { setGapView(v); setShowAllGaps(false); setExpandedGap(null); };

  const handleDisable = async (staff: typeof staffList[0]) => {
    const isActive = (localStaffStatuses[staff.id] ?? staff.status) === "active";
    try {
      if (isActive) {
        await disableStaffFn({ data: { userId: staff.id } });
        setLocalStaffStatuses(p => ({ ...p, [staff.id]: "disabled" }));
        toast.success(`${staff.name}'s account has been disabled`);
      } else {
        await enableStaffFn({ data: { userId: staff.id } });
        setLocalStaffStatuses(p => ({ ...p, [staff.id]: "active" }));
        toast.success(`${staff.name}'s account has been re-enabled`);
      }
      if (selectedStaff?.id === staff.id) {
        setSelectedStaff(prev => prev ? { ...prev, status: isActive ? "disabled" : "active" } : null);
      }
    } catch {
      toast.error("Failed to update account status");
    }
  };

  // ── Org net points for leaderboard ────────────────────────────────────────
  const [orgPoints, setOrgPoints] = useState<Record<string, { ytd: number; month: number }>>({});
  const [lbMode, setLbMode] = useState<"individual" | "department">("individual");
  // lbPeriod: "ytd" = Year to Date; "YYYY-MM" = specific selected month
  const [lbPeriod, setLbPeriod] = useState<"ytd" | string>("ytd");
  const [lbLoading, setLbLoading] = useState(false);

  useEffect(() => {
    setLbLoading(true);
    const yearMonth = lbPeriod === "ytd" ? undefined : lbPeriod;
    getOrgNetPointsFn({ data: { yearMonth } })
      .then(data => { setOrgPoints(data); setLbLoading(false); })
      .catch(() => setLbLoading(false));
  }, [lbPeriod]);

  const allPeople = useMemo(() => {
    return effectiveStaff.map(s => ({
      id: s.id, name: s.name, dept: s.dept,
      // YTD: use the canonical users.csv balance (points_ytd), not a sum of points_log entries.
      // The log is a partial journal that does not include the initial seeded balance, so summing
      // it produces incorrect (and often negative) totals. Monthly: sum only this month's log.
      pts: lbPeriod === "ytd"
        ? s.pointsYTD
        : (orgPoints[s.id]?.month ?? 0),
    }));
  }, [effectiveStaff, orgPoints, lbPeriod]);

  const individualLB = useMemo(() =>
    [...allPeople].sort((a, b) => b.pts - a.pts).slice(0, 5),
    [allPeople]
  );

  const deptLB = useMemo(() => {
    const map = new Map<string, number>();
    allPeople.forEach(p => map.set(p.dept, (map.get(p.dept) ?? 0) + p.pts));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dept, pts]) => ({ name: dept, sub: "", pts }));
  }, [allPeople]);

  const leaderboard = lbMode === "individual"
    ? individualLB.map(p => ({ name: p.name, sub: p.dept, pts: p.pts }))
    : deptLB;
  const maxPts = Math.max(leaderboard[0]?.pts ?? 1, 1);

  const downloadReport = async () => {
    try {
      const rows = await getRedeemedRewardsFn();
      const header = "id,staff_name,email,reward_name,points used,redemption timestamp";
      const csv = header + "\n" + rows.map(r =>
        [r.id, r.staff_name, r.email, r.reward_name, r.points_cost, r.redeemed_at]
          .map(v => String(v).includes(",") ? `"${v}"` : v)
          .join(",")
      ).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "redeemed_rewards_report.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download report.");
    }
  };

  const overallCompletion = Math.round(
    MANAGER_ACTION_PLANS.reduce((a, m) => a + getCompletion(m.items), 0) / MANAGER_ACTION_PLANS.length
  );
  const pendingManagerCount = MANAGER_ACTION_PLANS.filter(m => getCompletion(m.items) < 100).length;
  // Flagged = departments with tagged required skills and a gap over 30% (department framing,
  // independent of whichever view — dept or job family — is currently toggled on below)
  const SKILL_GAP_COUNT = competencyGapsByDept.filter(d => d.gapPct !== null && d.gapPct > 30).length;

  // ── Key Staff Challenges — real-time, derived from staff's own remarks on their goal progress ──
  // (src/lib/insights.ts — shared with the HOD/Director-scoped section on the Team OKRs page).
  // Org-wide for a true admin; scoped to just the departments a director oversees otherwise.
  const CHALLENGE_MEMBERS_BY_DEPT: Record<string, typeof teamMembers> = {
    [HCWM_DEPT_NAME]: teamMembers, [CREDIT_RISK_DEPT_NAME]: opsTeamMembersAll, [COMPLIANCE_DEPT_NAME]: complianceTeamMembers,
    [MARKETING_DEPT_NAME]: marketingTeamMembers,
  };
  const CHALLENGE_GOALS_BY_DEPT: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: departmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals, [COMPLIANCE_DEPT_NAME]: complianceDepartmentGoals,
    [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
  };
  const challengeThemes = useMemo(() => {
    if (directorScope) {
      return computeChallengeThemes(
        directorScope.depts.flatMap(d => CHALLENGE_MEMBERS_BY_DEPT[d] ?? []),
        directorScope.depts.map(d => CHALLENGE_GOALS_BY_DEPT[d] ?? []),
      );
    }
    return computeChallengeThemes(
      [...teamMembers, ...opsTeamMembersAll, ...complianceTeamMembers, ...marketingTeamMembers],
      [departmentGoals, opsDepartmentGoals, complianceDepartmentGoals, marketingDepartmentGoals],
    );
  }, [teamMembers, opsTeamMembersAll, departmentGoals, opsDepartmentGoals, directorScope]);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {showActionPlan && <ActionPlanPopup onClose={() => setShowActionPlan(false)} />}
      {selectedStaff && (
        <StaffProfilePopup
          staff={{ ...selectedStaff, status: (localStaffStatuses[selectedStaff.id] ?? selectedStaff.status) as "active" | "disabled" }}
          allStaff={effectiveStaff}
          onClose={() => setSelectedStaff(null)}
          onDisable={() => void handleDisable(selectedStaff)}
          onSupervisorChange={updateSupervisor}
        />
      )}

      <div className="mb-5">
        <div className="flex items-center gap-3">
          <ClipboardCheckSVG />
          <h2 className="font-display text-2xl">Admin Console</h2>
          <GearSparkSVG />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Manage staff, milestones, and L&D intelligence.</p>
      </div>

      {/* ── Top 2 metric cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Average Manager Action Plan Completion Rate */}
        <div
          className="relative overflow-hidden rounded-xl p-5 cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 55%, #1D4ED8 100%)" }}
          onClick={() => setShowActionPlan(true)}
        >
          <Laptop
            className="absolute -right-3 -bottom-3 text-white/20 pointer-events-none"
            style={{ width: 100, height: 100 }}
            strokeWidth={1.2}
          />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-white/70">Average Manager Action Plan Completion Rate</div>
            <div className="font-display text-4xl mt-2 text-white">{overallCompletion}%</div>
            <div className="text-xs text-white/80 mt-1">{pendingManagerCount} manager{pendingManagerCount !== 1 ? "s" : ""} yet to complete</div>
          </div>
        </div>

        {/* Skill Gaps Flagged for Action (paraphrase of Competency Red Alerts) */}
        <div
          className="relative overflow-hidden rounded-xl p-5 shadow-sm"
          style={{ background: "linear-gradient(135deg, #EF4444 0%, #DC2626 55%, #B91C1C 100%)" }}
        >
          <AlertTriangle
            className="absolute -right-3 -bottom-3 text-white/20 pointer-events-none"
            style={{ width: 100, height: 100 }}
            strokeWidth={1.2}
          />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-white/70">Skill Gaps Flagged for Action</div>
            <div className="font-display text-4xl mt-2 text-white">{SKILL_GAP_COUNT}</div>
            <div className="text-xs text-white/80 mt-1">departments requiring L&D intervention</div>
          </div>
        </div>
      </div>

      {/* ── Staff Management (compact + searchable) ─────────────────────────── */}
      <Card>
        <button
          onClick={() => setStaffOpen(v => !v)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shrink-0">
              <Search className="size-4 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Staff Management</div>
              <div className="text-xs text-muted-foreground">{effectiveStaff.filter(s => s.status === "active").length} active · {deptGroups.length} departments</div>
            </div>
          </div>
          {staffOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>

        {staffOpen && (
          <div className="mt-4 space-y-2">
            {selectedDept ? (
              <>
                <button
                  onClick={() => setSelectedDept(null)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mb-3"
                >
                  ← All Departments
                </button>
                <div className="font-semibold text-sm mb-3">{selectedDept}</div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {deptGroups.find(g => g.dept === selectedDept)?.staff.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStaff(s)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left hover:border-primary/30 transition-colors",
                        s.status === "disabled" ? "border-rag-red/20 bg-rag-red/5 opacity-70" : "border-border bg-muted/20 hover:bg-muted/50"
                      )}
                    >
                      <div className="size-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {s.name}
                          {s.hod && <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal/20 text-teal">HOD</span>}
                          {s.status === "disabled" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rag-red/20 text-rag-red">Disabled</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{s.role}</div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {deptGroups.map(g => (
                  <button
                    key={g.dept}
                    onClick={() => setSelectedDept(g.dept)}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-gradient-to-br from-blue-400/30 to-cyan-500/20 flex items-center justify-center shrink-0">
                        <Search className="size-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{g.dept}</div>
                        <div className="text-xs text-muted-foreground">{g.activeCount} active · {g.staff.length} total</div>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Disabled Accounts (Last Day of Service detected) ─────────────── */}
            <div className="pt-3 mt-3 border-t border-border/60">
              <button
                onClick={() => setShowDisabledAccounts(v => !v)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <UserX className="size-4 text-rag-red/80" />
                  <div className="text-left">
                    <div className="text-sm font-semibold">Disabled Accounts</div>
                    <div className="text-xs text-muted-foreground">{visibleDisabledStaff.length} detected via Last Day of Service in users.csv</div>
                  </div>
                </div>
                {showDisabledAccounts ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>

              {showDisabledAccounts && (
                <div className="mt-3 space-y-2">
                  {visibleDisabledStaff.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={exportDisabledAccountsCsv}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                      >
                        <Download className="size-3.5" /> Export CSV
                      </button>
                    </div>
                  )}
                  {visibleDisabledStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No accounts currently disabled.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {visibleDisabledStaff.map(s => {
                        const daysSince = s.disabledDetectedDate ? workingDaysSince(s.disabledDetectedDate) : 0;
                        const isArchived = daysSince >= 30;
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg border",
                              isArchived ? "border-border bg-muted/30" : "border-rag-red/20 bg-rag-red/5"
                            )}
                          >
                            <div className="size-8 rounded-full bg-gradient-to-br from-rag-red/30 to-rag-red/10 flex items-center justify-center text-[10px] font-bold text-rag-red shrink-0">
                              {s.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{s.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{s.role} · {s.dept}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Last day of service {s.lastDayOfService || "—"} · detected {s.disabledDetectedDate || "—"} · {daysSince} working day{daysSince !== 1 ? "s" : ""} ago
                              </div>
                            </div>
                            {isArchived ? (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border shrink-0">Archived</span>
                            ) : (
                              <button
                                onClick={() => void handleEnableDisabledAccount(s.id, s.name)}
                                disabled={enablingId === s.id}
                                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0 transition-opacity"
                              >
                                <UserCheck className="size-3" /> Enable
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 pl-1">
                    Re-enabling is available for 30 working days from detection. Past that window, accounts are archived and can only be reactivated by re-syncing an active row from the Staff Listing.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Rewards & Recognition ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-border">
        <div className="bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophySVG />
            <div>
              <h3 className="font-display text-xl text-white">Rewards &amp; Recognition</h3>
              <p className="text-white/80 text-xs mt-0.5">Points leaderboard across PhillipCapital</p>
            </div>
          </div>
          <button
            onClick={() => void downloadReport()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors border border-white/30"
          >
            <Download className="size-4" />
            Download Report
          </button>
        </div>

        <div className="bg-card p-6 space-y-4">
          {/* View mode + period filters */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLbMode("individual")}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  lbMode === "individual" ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-transparent" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                )}
              >Top Individuals</button>
              <button
                onClick={() => setLbMode("department")}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  lbMode === "department" ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                )}
              >Top Departments</button>
            </div>
            <div className="flex items-center gap-1.5 bg-muted rounded-full p-0.5">
              <button
                onClick={() => setLbPeriod("ytd")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  lbPeriod === "ytd" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Year to Date
              </button>
              <div className={cn(
                "flex items-center gap-1 rounded-full transition-colors text-xs font-medium",
                lbPeriod !== "ytd" ? "bg-card shadow-sm px-1 py-0.5" : "px-1 py-0.5"
              )}>
                <Calendar className="size-3 shrink-0 text-muted-foreground ml-1" />
                <input
                  type="month"
                  value={lbPeriod !== "ytd" ? lbPeriod : ""}
                  onChange={e => { if (e.target.value) setLbPeriod(e.target.value); }}
                  onFocus={() => {
                    if (lbPeriod === "ytd") {
                      const now = new Date();
                      setLbPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                    }
                  }}
                  className={cn(
                    "text-xs bg-transparent border-0 focus:outline-none cursor-pointer pr-1",
                    lbPeriod !== "ytd" ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </div>
            </div>
            {lbLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-3">
            {leaderboard.map((entry, i) => {
              const medal = MEDAL_COLORS[i] ?? MEDAL_COLORS[4];
              const barColor = BAR_COLORS[i] ?? BAR_COLORS[4];
              const pct = Math.max(8, Math.round((entry.pts / maxPts) * 100));
              return (
                <div key={entry.name} className="flex items-center gap-3">
                  <div className={cn("size-8 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0", medal.bg)}>
                    {medal.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <div className="text-sm font-semibold leading-none">{entry.name}</div>
                        {entry.sub && <div className="text-xs text-muted-foreground mt-0.5">{entry.sub}</div>}
                      </div>
                      <div className="text-sm font-bold text-amber-foreground shrink-0 ml-2">{entry.pts} pts</div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {leaderboard.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No points data available yet.</p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Points reflect net earnings (including deductions from reward redemptions) across goal milestones, recognitions, and survey participation.</p>
        </div>
      </div>

      {/* ── Activity Management ───────────────────────────────────────────────── */}
      <ActivityManagementPanel
        activities={liveActivities}
        onAdd={addActivity}
        onUpdate={updateActivity}
        onDelete={deleteActivity}
        onBulkUpsert={bulkUpsertActivities}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <SectionTitle sub="How the skills your HODs have flagged as essential for team goals stack up against the skills your people already have.">Organisational Competency Gaps</SectionTitle>
            {directorScope && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                {directorScope.depts.length} department{directorScope.depts.length === 1 ? "" : "s"} you oversee
              </span>
            )}
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5 shrink-0">
              <button
                onClick={() => switchGapView("dept")}
                className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors", gapView === "dept" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                By Department
              </button>
              <button
                onClick={() => switchGapView("jobFamily")}
                className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors", gapView === "jobFamily" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                By Job Family
              </button>
            </div>
          </div>
          {visibleGaps.map((d) => (
            <div key={d.name} className="py-3 border-b border-border/60 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  {d.name}
                  {d.gapPct !== null && d.gapPct > 30 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rag-red/15 text-rag-red border border-rag-red/30">FLAGGED</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {d.gapPct === null ? "No skills tagged yet" : `Gap ${d.gapPct}%`}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                <div className="bg-rag-red" style={{ width: `${d.gapPct ?? 0}%` }} />
                <div className="bg-rag-green" style={{ width: `${100 - (d.gapPct ?? 0)}%` }} />
              </div>
              {d.missing.length > 0 && (
                <button
                  onClick={() => setExpandedGap(v => v === d.name ? null : d.name)}
                  className="w-full flex items-center gap-1 mt-1.5 text-[10px] text-rag-red/80 hover:text-rag-red transition-colors"
                >
                  {expandedGap === d.name ? <ChevronUp className="size-2.5 shrink-0" /> : <ChevronDown className="size-2.5 shrink-0" />}
                  {d.missing.length} missing skill{d.missing.length !== 1 ? "s" : ""}
                </button>
              )}
              {expandedGap === d.name && d.missing.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {d.missing.map(skill => (
                    <span key={skill} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rag-red/10 text-rag-red border border-rag-red/25">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sortedGaps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No department data available yet.</p>
          )}
          {sortedGaps.length > 5 && (
            <button
              onClick={() => setShowAllGaps(v => !v)}
              className="w-full text-center text-xs text-primary hover:underline pt-2"
            >
              {showAllGaps ? "Show top 5 only" : `View all ${sortedGaps.length} ${gapView === "dept" ? "departments" : "job families"}`}
            </button>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <SectionTitle sub="Distilled in real time from staff's own remarks on their goal-progress updates.">Key Staff Challenges</SectionTitle>
            {directorScope && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                Aggregated across {directorScope.depts.join(", ")}
              </span>
            )}
          </div>
          {challengeThemes.map((t) => (
            <div key={t.theme} className="border-b border-border/60 last:border-0">
              <button
                onClick={() => setExpandedTheme(v => v === t.theme ? null : t.theme)}
                className="w-full flex items-center justify-between py-2.5 text-left gap-2"
              >
                <div className="text-sm flex items-center gap-1.5 min-w-0">
                  {expandedTheme === t.theme ? <ChevronUp className="size-3 text-muted-foreground shrink-0" /> : <ChevronDown className="size-3 text-muted-foreground shrink-0" />}
                  <span className="truncate">{t.theme}</span>
                </div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{t.count} mention{t.count !== 1 ? "s" : ""}</div>
              </button>
              {expandedTheme === t.theme && (
                <div className="pb-3 pl-4 space-y-2">
                  {t.entries.map((e, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{e.memberName}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{e.goalTitle}</span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1 leading-relaxed">&ldquo;{e.remarkText}&rdquo;</p>
                      <div className="text-[10px] text-muted-foreground mt-1">Linked to: {e.linkedDeptTitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {challengeThemes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No staff challenges reported yet.</p>
          )}
        </Card>
      </div>

      <AiGovernancePanel />
    </div>
  );
}
