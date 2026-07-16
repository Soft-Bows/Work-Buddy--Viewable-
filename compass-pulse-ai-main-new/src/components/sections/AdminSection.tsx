import { useState, useMemo, useEffect, useRef } from "react";
import { Card, SectionTitle } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import { BarChart3, AlertTriangle, Sparkles, Download, Search, ChevronDown, ChevronUp, ChevronRight, X, UserX, UserCheck, Laptop, Loader2, Calendar, Pencil, Plus, Trash2, Settings2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Activity } from "@/lib/mockData";
import { getRedeemedRewardsFn, disableStaffFn, enableStaffFn, getStaffPointsLogFn, getOrgNetPointsFn } from "@/lib/api/data.functions";

// ── PhillipCapital department list ────────────────────────────────────────────
const PC_DEPARTMENTS = [
  "Human Capital & Workplace Management",
  "Affluent Markets",
  "Finance",
  "IT - Singapore",
  "IT Operations & Services",
  "Operations - Equities",
  "Operations - Unit Trust",
  "Partnership",
  "Contract For Difference",
  "Public Markets",
  "Corporate Sales",
  "Phillip Investor Centre",
  "Client Relations And Sales Channel",
  "Application Support Helpdesk",
  "Investment Solutions",
  "Managed Accounts",
  "Corporate Development (B2B)",
  "Internal Audit",
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
  { id: "u21", name: "Eliza Lim", dept: "Affluent Markets",
    items: [
      { title: "MAS SFA Refresher (Dealing & Advisory)", done: true },
      { title: "Q2 AUM Growth Review with Regional Head", done: true },
      { title: "Digital Onboarding Platform Readiness Check", done: false },
      { title: "Private Banking Leadership Workshop", done: false },
    ],
  },
  { id: "u22", name: "Brandon Lim", dept: "Affluent Markets",
    items: [
      { title: "MAS SFA Refresher (Dealing & Advisory)", done: true },
      { title: "Q2 Trade Execution Quality Review", done: false },
      { title: "CFP Module 1 Enrolment", done: false },
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
          <div className="grid grid-cols-2 gap-3 text-sm">
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

const AUDIENCE_LABELS: Record<Activity["audience"], string> = {
  all: "All Staff",
  manager: "Managers & HODs",
  hod: "HODs Only",
};
const CATEGORY_LABELS: Record<Activity["category"], string> = {
  goal: "Goal",
  recognition: "Recognition",
  skill: "Skill",
  engagement: "Engagement",
  penalty: "Penalty",
};
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
  draft, setDraft, onSave, onCancel, saveLabel, liveActivityNames,
}: {
  draft: Partial<Omit<Activity, "id">>;
  setDraft: (fn: (prev: typeof draft) => typeof draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  liveActivityNames: string[];
}) {
  const showCustomInput = !draft.name || (!liveActivityNames.includes(draft.name) && draft.name !== "");

  return (
    <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4 animate-in slide-in-from-top-1 duration-150">

      {/* Activity name — dropdown of live activities + custom text fallback */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Activity Name</label>
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
      </div>

      {/* Points + Category + Audience row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Points Awarded</label>
          <input
            type="number"
            value={draft.points ?? 0}
            onChange={e => setDraft(p => ({ ...p, points: Number(e.target.value) }))}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Complete within (days)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 7"
              value={draft.timelineDays ?? ""}
              onChange={e => setDraft(p => ({ ...p, timelineDays: e.target.value ? Number(e.target.value) : undefined }))}
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
              onChange={e => setDraft(p => ({ ...p, penaltyPoints: e.target.value ? Number(e.target.value) : undefined }))}
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

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
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

function ActivityManagementPanel({
  activities,
  onAdd,
  onUpdate,
  onDelete,
}: {
  activities: Activity[];
  onAdd: (a: Omit<Activity, "id">) => void;
  onUpdate: (id: string, changes: Partial<Activity>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Activity>>({});
  // Which audience section is showing the "Add Activity" form
  const [addingForAudience, setAddingForAudience] = useState<Activity["audience"] | null>(null);
  const [newDraft, setNewDraft] = useState<Omit<Activity, "id">>(mkBlankDraft());

  // Live activity names for the dropdown (excludes the activity currently being edited)
  const liveActivityNames = activities.filter(a => a.live && a.id !== editingId).map(a => a.name);

  const startEdit = (a: Activity) => {
    setEditingId(a.id);
    setEditDraft({ ...a });
    setAddingForAudience(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

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
          <p className="text-xs text-muted-foreground">
            Changes apply immediately across all user dashboards. Activities are grouped by audience — expand each section to manage its activities by category.
          </p>

          {AUDIENCE_SECTIONS.map(section => {
            const catMap = byCategoryWithin(section.key);
            const totalInSection = activities.filter(a => a.audience === section.key).length;
            return (
              <div key={section.key} className={cn("rounded-xl border overflow-hidden", section.borderClass)}>
                {/* Section header */}
                <div className={cn("px-4 py-3 flex items-center justify-between", section.headerClass)}>
                  <div>
                    <div className="text-sm font-semibold">{section.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{section.desc} · {totalInSection} activit{totalInSection === 1 ? "y" : "ies"}</div>
                  </div>
                  {addingForAudience !== section.key && (
                    <button
                      onClick={() => startAdd(section.key)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* "Add" form injected at top of the correct section */}
                  {addingForAudience === section.key && (
                    <ActivityForm
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
                                    draft={editDraft}
                                    setDraft={fn => setEditDraft(prev => fn(prev))}
                                    onSave={saveEdit}
                                    onCancel={cancelEdit}
                                    saveLabel="Save Changes"
                                    liveActivityNames={liveActivityNames}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminSection() {
  const { staffList, liveActivities, addActivity, updateActivity, deleteActivity, updateSupervisor } = useApp();

  const [showActionPlan, setShowActionPlan] = useState(false);

  // ── Staff Management ───────────────────────────────────────────────────────
  const [staffOpen, setStaffOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<typeof staffList[0] | null>(null);
  const [localStaffStatuses, setLocalStaffStatuses] = useState<Record<string, "active" | "disabled">>({});

  const effectiveStaff = staffList.map(s => ({
    ...s,
    status: (localStaffStatuses[s.id] ?? s.status) as "active" | "disabled",
  }));

  // Staff grouped by department (only PC departments)
  const deptGroups = useMemo(() => {
    return PC_DEPARTMENTS.map(dept => ({
      dept,
      staff: effectiveStaff.filter(s => s.dept === dept),
      activeCount: effectiveStaff.filter(s => s.dept === dept && s.status === "active").length,
    })).filter(g => g.staff.length > 0);
  }, [effectiveStaff]);

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
  const SKILL_GAP_COUNT = 2;

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
      <div className="grid grid-cols-2 gap-4">
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
      />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <SectionTitle sub="By department & job function.">L&D Competency Gaps</SectionTitle>
          {[
            { dept: "Engineering", gap: 62, eff: 38, alert: true },
            { dept: "Marketing", gap: 41, eff: 55 },
            { dept: "Finance", gap: 28, eff: 71 },
            { dept: "Compliance", gap: 19, eff: 82 },
          ].map((d) => (
            <div key={d.dept} className="py-3 border-b border-border/60 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  {d.dept}
                  {d.alert && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rag-red/15 text-rag-red border border-rag-red/30">FLAGGED</span>}
                </div>
                <div className="text-xs text-muted-foreground">Gap {d.gap}% · Effectiveness {d.eff}%</div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                <div className="bg-rag-red" style={{ width: `${d.gap}%` }} />
                <div className="bg-rag-green" style={{ width: `${d.eff}%` }} />
              </div>
            </div>
          ))}
        </Card>

        <Card className="border-amber/30">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-amber-foreground" />
            <div className="text-xs uppercase tracking-widest text-amber-foreground">AI-synthesised</div>
          </div>
          <SectionTitle sub="Distilled from staff remarks across all goal updates this quarter.">Key Staff Challenges</SectionTitle>
          {[
            { theme: "Stakeholder alignment & decision velocity", count: 18 },
            { theme: "Resource & capacity for cross-functional work", count: 14 },
            { theme: "Career path clarity for mid-tenure ICs", count: 11 },
            { theme: "Tooling gaps in analytics & reporting", count: 9 },
          ].map((c) => (
            <div key={c.theme} className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-0">
              <div className="text-sm">{c.theme}</div>
              <div className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.count} mentions</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
