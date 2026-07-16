import { useState, useEffect } from "react";
import { Card, SectionTitle } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import type { RAG, PersonalDevGoal } from "@/lib/mockData";
import {
  Check, Lock, MessageSquare, Bell, Info, AlertCircle, Clock,
  Pencil, Trash2, Plus, Sparkles, X, Loader2, CalendarDays, CheckCircle2, Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type DevGoal = PersonalDevGoal;

// ── Month helpers ──────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const QUARTER_MONTHS: Record<string, readonly [number, number]> = {
  Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
};
function isCurrentQuarter(q: string): boolean {
  const m = new Date().getMonth();
  const range = QUARTER_MONTHS[q];
  return !!range && m >= range[0] && m <= range[1];
}

function formatDueDate(dueDate: string): string {
  if (!dueDate) return "No due date";
  const [y, m] = dueDate.split("-");
  return `${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

// ── Month picker ───────────────────────────────────────────────────────────────

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => {
    if (value) return parseInt(value.split("-")[0]);
    return new Date().getFullYear();
  });

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 rounded-md bg-background hover:bg-muted transition-colors"
      >
        <CalendarDays className="size-3 text-muted-foreground" />
        {value ? formatDueDate(value) : "Set due date"}
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 bg-popover border border-border rounded-xl shadow-lg p-3 w-52">
          <div className="flex items-center justify-between mb-2">
            <button
              onMouseDown={() => setYear((y) => y - 1)}
              className="size-6 rounded hover:bg-muted grid place-items-center text-sm font-medium"
            >‹</button>
            <span className="text-sm font-medium">{year}</span>
            <button
              onMouseDown={() => setYear((y) => y + 1)}
              className="size-6 rounded hover:bg-muted grid place-items-center text-sm font-medium"
            >›</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((m, i) => {
              const val = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = val === value;
              return (
                <button
                  key={m}
                  onMouseDown={() => { onChange(val); setOpen(false); }}
                  className={cn(
                    "text-xs py-1.5 rounded-md transition-colors font-medium",
                    selected ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/80",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI L&D recommendation database ──────────────────────────────────────────────
// Simulated "fetch" (no live external API in this app — every AI feature here is curated +
// a loading delay, consistent with the rest of the dashboard). Curated against real, accredited
// providers: IHRP, SMU, Coursera, UiPath Academy, Microsoft Learn, IBF, NUS, Tertiary Infotech.

const AI_RECS: Record<string, { internal: string[]; external: string[] }> = {
  hr_certification: {
    internal: [
      "P&C Learning Portal · IHRP Certification Study Group — join the Q3 2026 cohort (register via HR portal)",
      "Learning & Development Benefit — up to S$2,000 reimbursement per year (Intranet > P&C > Policies)",
      "HRBP Mentorship Programme — pair with a senior partner for exam preparation coaching",
    ],
    external: [
      "IHRP · Certified Professional (IHRP-CP) — Singapore's national HR certification, SkillsFuture-eligible",
      "Coursera · Human Resource Management: HR for People Managers (University of Minnesota)",
      "SMU Academy · HR Business Partnering Certificate — part-time, cohort-based",
    ],
  },
  hr_data: {
    internal: [
      "People Analytics Foundations Workshop — next cohort: Jul 2026, register on L&D portal",
      "Internal Data Glossary & Dashboard Guide — HRIS Help Centre > Analytics > Getting Started",
      "Quarterly People Data Sprint — join the P&C Ops team hackathon to practice on live data",
    ],
    external: [
      "Coursera · Data-Driven Decision Making in HR (University of Michigan, ~15 hrs)",
      "Microsoft Learn · Power BI for Data Analysts — free, self-paced learning path",
      "NUS School of Computing · People Analytics short course (SkillsFuture-eligible)",
    ],
  },
  recruitment: {
    internal: [
      "Talent Acquisition Playbook 2026 — Intranet > P&C > Hiring Resources > TA Playbook",
      "Interview Calibration Workshop — monthly sessions, register via L&D portal",
      "Hire-Right Internal Accreditation — next intake Q4 2026, contact L&D to nominate",
    ],
    external: [
      "IHRP · Certified Associate (IHRP-CA) — Talent Acquisition track",
      "Coursera · Recruiting, Hiring, and Onboarding Employees (University of Minnesota)",
      "LinkedIn Learning · Strategic Talent Acquisition (8 hrs, self-paced, certificate)",
    ],
  },
  leadership: {
    internal: [
      "Rising Leaders Programme — P&C-sponsored, self-nominate via People portal each quarter",
      "Executive Coaching Sessions — book with an ICF-certified coach via P&C coaching marketplace",
      "Resource Library: 'Leadership Playbook 2026' — Intranet > P&C > Development > Leadership",
    ],
    external: [
      "SMU Academy · Leadership and People Management Certificate — part-time, Singapore-based",
      "Coursera · Inspired Leadership Specialisation (Case Western Reserve University)",
      "Tertiary Infotech · Leadership & People Management for Managers (SkillsFuture-eligible)",
    ],
  },
  dealing_trading: {
    internal: [
      "Dealing Desk Compliance Refresher — quarterly, register via P&C Learning Portal",
      "Trade Execution Excellence Workshop — co-run with Risk & Compliance, next session Q3 2026",
      "Affluent Markets Mentorship — pair with a senior dealer for exam preparation coaching",
    ],
    external: [
      "IBF · CMFAS Module 5 & Module 6 exam prep (Rules & Regulations, Securities Products & Analysis)",
      "IBF Qualified (IBFQ) — Dealing & Trading track, IBF Standards-aligned",
      "Coursera · Financial Markets (Yale University) — foundations of trading and securities products",
    ],
  },
  wealth_advisory: {
    internal: [
      "Private Wealth Client Conversations Workshop — register via P&C Learning Portal",
      "Affluent Markets Onboarding Excellence Playbook — Intranet > Affluent Markets > Resources",
      "Senior Relationship Manager Shadowing Programme — nominate via your reporting manager",
    ],
    external: [
      "IBF · CMFAS Module 9 (Life Insurance & Investment-Linked Policies) — for holistic wealth conversations",
      "SMU Academy · Wealth Management Certificate — part-time, cohort-based, Singapore-focused",
      "Coursera · Private Equity and Venture Capital (specialisation, relevant to HNW client conversations)",
    ],
  },
  compliance_regulatory: {
    internal: [
      "MAS Regulatory Update Briefing — quarterly, mandatory for client-facing roles",
      "Internal Compliance Policy Library — Intranet > Risk & Compliance > Policies",
      "AML/CFT Refresher Training — annual, register via L&D portal",
    ],
    external: [
      "IBF · Anti-Financial Crime (AFC) Certificate — MAS-recognised",
      "IBF Qualified (IBFQ) — Compliance track",
      "Coursera · Financial Regulation and Compliance Management (specialisation)",
    ],
  },
  digital_automation: {
    internal: [
      "Digital Skills Sprint — RPA & AI fundamentals, register via L&D portal",
      "Automation Champions Network — cross-functional community of practice, monthly meetups",
      "IT Innovation Lab Office Hours — book time to prototype automation ideas with IT",
    ],
    external: [
      "UiPath Academy · RPA Developer Foundation — free, self-paced, industry-recognised certificate",
      "Microsoft Learn · AI Fundamentals (AI-900) — free learning path, no prerequisites",
      "Tertiary Infotech · AI & Automation for Business Professionals (SkillsFuture-eligible, Singapore-based)",
    ],
  },
  default: {
    internal: [
      "P&C Development Hub — browse all internal L&D offerings by function and level",
      "Mentorship Programme — available to all team members (register via HR portal)",
      "Monthly Lunch & Learn Series — cross-functional knowledge shares, see calendar on intranet",
    ],
    external: [
      "SkillsFuture Singapore · Course Directory — browse subsidised courses across all disciplines",
      "Coursera · Professional Certificates — explore by industry and skill area",
      "Tertiary Infotech · Open Course Catalogue — Singapore-based, SkillsFuture-eligible",
    ],
  },
};

// Ordered keyword rules — first match wins. Goal title/description text is matched against
// each rule's keywords to personalise recommendations to the user's specific dev goal.
const AI_REC_RULES: Array<{ keywords: string[]; category: keyof typeof AI_RECS }> = [
  { keywords: ["cmfas", "dealing", "dealer", "trading", "trade execution", "securities product"], category: "dealing_trading" },
  { keywords: ["wealth", "private bank", "affluent", "relationship manag", "client advisory", "hnw", "high-net-worth"], category: "wealth_advisory" },
  { keywords: ["compliance", "regulatory", "aml", "afc", "mas notice", "risk control"], category: "compliance_regulatory" },
  { keywords: ["automat", "rpa", "uipath", " ai ", "artificial intelligence", "machine learning", "digital transform", "robotic process"], category: "digital_automation" },
  { keywords: ["ihrp", "shrm", "certif", "qualif", "accredit"], category: "hr_certification" },
  { keywords: ["data", "analytic", "metric", "report", "dashboard", "power bi"], category: "hr_data" },
  { keywords: ["recruit", "hire", "hiring", "talent acqui", "onboard"], category: "recruitment" },
  { keywords: ["lead", "manag", "coach", "execut"], category: "leadership" },
];

function matchAIRecCategory(text: string): keyof typeof AI_RECS {
  const padded = ` ${text} `;
  const match = AI_REC_RULES.find(r => r.keywords.some(kw => padded.includes(kw)));
  return match?.category ?? "default";
}

async function fetchAIRecommendations(title: string, description: string) {
  await new Promise((r) => setTimeout(r, 1600));
  const text = (title + " " + description).toLowerCase();
  return AI_RECS[matchAIRecCategory(text)];
}

// ── SVGs ──────────────────────────────────────────────────────────────────────

function RocketSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <path d="M20 4 Q28 8 28 20 L20 28 L12 20 Q12 8 20 4Z" fill="#3B82F6"/>
      <circle cx="20" cy="16" r="4" fill="#EFF6FF"/>
      <circle cx="20" cy="16" r="2.5" fill="#DBEAFE"/>
      <path d="M12 22 L7 28 L12 26Z" fill="#22D3EE"/>
      <path d="M28 22 L33 28 L28 26Z" fill="#22D3EE"/>
      <path d="M16 28 Q18 34 20 36 Q22 34 24 28Z" fill="#FDE047"/>
      <path d="M17 28 Q19 32 20 33 Q21 32 23 28Z" fill="#F59E0B"/>
      <circle cx="8" cy="10" r="1.2" fill="#FCD34D"/>
      <circle cx="34" cy="15" r="1" fill="#FCD34D"/>
      <circle cx="6" cy="24" r="0.8" fill="#A5F3FC"/>
    </svg>
  );
}

function AIBotSVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
      <rect x="6" y="10" width="24" height="20" rx="5" fill="#3B82F6"/>
      <circle cx="13" cy="18" r="3" fill="white"/>
      <circle cx="23" cy="18" r="3" fill="white"/>
      <circle cx="13" cy="18" r="1.5" fill="#3B82F6"/>
      <circle cx="23" cy="18" r="1.5" fill="#3B82F6"/>
      <path d="M13 25 Q18 28 23 25" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <rect x="15" y="6" width="6" height="5" rx="2" fill="#93C5FD"/>
      <circle cx="18" cy="6" r="2" fill="#22D3EE"/>
      <rect x="2" y="16" width="4" height="8" rx="2" fill="#93C5FD"/>
      <rect x="30" y="16" width="4" height="8" rx="2" fill="#93C5FD"/>
      <circle cx="28" cy="8" r="1.2" fill="#FCD34D"/>
      <circle cx="8" cy="7" r="0.9" fill="#A78BFA"/>
    </svg>
  );
}

// ── RAG Info Panel ─────────────────────────────────────────────────────────────

function RAGInfoPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 relative animate-in slide-in-from-top-2 duration-200">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 size-7 rounded-full hover:bg-muted grid place-items-center transition-colors"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Info className="size-4 text-primary" />
        <div className="font-semibold text-sm">RAG Status Definitions</div>
        <div className="text-xs text-muted-foreground">Use these to accurately reflect your goal progress each quarter</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-rag-red/10 border border-rag-red/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-rag-red shrink-0" />
            <div className="text-xs font-semibold text-rag-red">RED — At Risk</div>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            Goal is significantly off track. Blockers or issues are impacting delivery. Immediate action or escalation required.
          </div>
          <div className="mt-2.5 text-[10px] font-medium text-rag-red">⚠ Mandatory feedback required</div>
        </div>
        <div className="rounded-lg bg-rag-amber/10 border border-rag-amber/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-rag-amber shrink-0" />
            <div className="text-xs font-semibold text-amber-foreground">AMBER — Monitor</div>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            Goal has minor delays or concerns. Proactive attention needed. Risk of slippage if not addressed soon.
          </div>
          <div className="mt-2.5 text-[10px] font-medium text-amber-foreground">⚠ Mandatory feedback required</div>
        </div>
        <div className="rounded-lg bg-rag-green/10 border border-rag-green/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-3 rounded-full bg-rag-green shrink-0" />
            <div className="text-xs font-semibold text-rag-green">GREEN — On Track</div>
          </div>
          <div className="text-xs text-foreground/70 leading-relaxed">
            Goal is progressing as planned and is on track for delivery. No major concerns to flag.
          </div>
          <div className="mt-2.5 text-[10px] font-medium text-rag-green">✓ Optional feedback</div>
        </div>
      </div>
    </div>
  );
}

// ── Approved goal card ─────────────────────────────────────────────────────────

type GoalType = ReturnType<typeof useApp>["teamMembers"][number]["goals"][number];

function ActiveGoalCard({ goal, memberId, memberName, directManager }: { goal: GoalType; memberId: string; memberName: string; directManager: string }) {
  const { departmentGoals, updateGoalRag, addGoalRemark, acknowledgeGoal, resolveRemark, currentUser } = useApp();
  const [editingQ, setEditingQ] = useState<string | null>(null);
  // pendingRag: selected but not yet committed (amber/red require feedback first; green commits immediately but shows optional note)
  const [pendingRag, setPendingRag] = useState<{ quarter: "Q1" | "Q2" | "Q3" | "Q4"; rag: RAG; greenCommitted: boolean } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const linkedDeptName = departmentGoals.find((d) => d.id === goal.linkedDept)?.title;
  const isMandatory = pendingRag && (pendingRag.rag === "amber" || pendingRag.rag === "red");

  // Computed display RAG per quarter — shows preview for pending quarter
  const getDisplayRag = (q: string): RAG | undefined => {
    if (pendingRag?.quarter === q) return pendingRag.rag;
    return goal.quarters.find((x) => x.q === q)?.rag;
  };

  const handleRagPick = (quarter: "Q1" | "Q2" | "Q3" | "Q4", rag: RAG) => {
    setEditingQ(null);
    if (rag === "green") {
      updateGoalRag(memberId, goal.id, quarter, rag);
      setPendingRag({ quarter, rag, greenCommitted: true });
    } else {
      setPendingRag({ quarter, rag, greenCommitted: false });
    }
    setFeedbackText("");
  };

  const submitFeedback = () => {
    if (!pendingRag) return;
    if (isMandatory && !feedbackText.trim()) return;
    if (!pendingRag.greenCommitted) {
      updateGoalRag(memberId, goal.id, pendingRag.quarter, pendingRag.rag);
    }
    if (feedbackText.trim()) {
      addGoalRemark(memberId, goal.id, memberName, feedbackText.trim());
    }
    toast.success(`${pendingRag.quarter} updated to ${pendingRag.rag.toUpperCase()}${feedbackText.trim() ? " — feedback submitted" : ""}`);
    setPendingRag(null);
    setFeedbackText("");
  };

  const skipFeedback = () => {
    toast.success(`${pendingRag?.quarter} status set to GREEN`);
    setPendingRag(null);
    setFeedbackText("");
  };

  const ownRemarks = goal.remarks.filter((r) => r.author === memberName);
  // Only show feedback from the direct leave supervisor or the department HOD — no cross-team remarks.
  const supervisorRemarks = goal.remarks.filter(r =>
    r.author !== memberName &&
    (r.author === directManager || (currentUser.hod && r.author === currentUser.name))
  );
  const sortedSupervisorRemarks = [...supervisorRemarks].sort((a, b) => {
    const aIsHod = currentUser.hod && a.author === currentUser.name;
    const bIsHod = currentUser.hod && b.author === currentUser.name;
    if (aIsHod && !bIsHod) return -1;
    if (!aIsHod && bIsHod) return 1;
    const aIsMgr = a.author === directManager;
    const bIsMgr = b.author === directManager;
    if (aIsMgr && !bIsMgr) return -1;
    if (!aIsMgr && bIsMgr) return 1;
    return 0;
  });

  return (
    <Card className="space-y-4">
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-base leading-snug flex-1">{goal.title}</div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-green/10 text-rag-green border border-rag-green/30 shrink-0">
          <Check className="size-3" /> Approved
        </span>
      </div>

      {/* Acknowledgement banner */}
      {goal.pendingAcknowledgement && (
        <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-amber/10 border border-amber/30">
          <div className="flex items-start gap-2">
            <Bell className="size-3.5 text-amber-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-amber-foreground leading-snug">
              <span className="font-medium">Your manager has modified this goal.</span> Please review the updated details and acknowledge.
            </p>
          </div>
          <button
            onClick={() => { acknowledgeGoal(memberId, goal.id); toast.success("Changes acknowledged"); }}
            className="text-xs px-3 py-1.5 rounded-md bg-amber/20 text-amber-foreground border border-amber/40 hover:bg-amber/30 shrink-0 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{goal.description}</p>
        {linkedDeptName && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
              <Target className="size-3 shrink-0" />
              {linkedDeptName}
              {goal.weightage != null && goal.linkedDept && (
                <span className="ml-0.5 text-primary/60">· {goal.weightage}% contrib.</span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/60">Key Result:</span>
          <span className="leading-snug">{goal.metric}</span>
        </div>
      </div>

      {/* Quarter RAG picker */}
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Progress by Quarter</div>
        <div className="flex gap-2">
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => {
            const displayRag = getDisplayRag(q);
            const isOpen = editingQ === q;
            const isPendingQ = pendingRag?.quarter === q && !pendingRag.greenCommitted;
            return (
              <div key={q} className="flex-1 relative">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground text-center mb-1">{q}</div>
                {displayRag ? (
                  <button
                    onClick={() => !pendingRag && isCurrentQuarter(q) && setEditingQ(isOpen ? null : q)}
                    onBlur={() => setTimeout(() => setEditingQ(null), 150)}
                    disabled={!!pendingRag || !isCurrentQuarter(q)}
                    className={cn(
                      "w-full py-1.5 rounded-md text-xs font-medium border transition-all",
                      isPendingQ && "ring-2 ring-offset-1 animate-pulse",
                      displayRag === "red" && "bg-rag-red/10 text-rag-red border-rag-red/30",
                      displayRag === "amber" && "bg-rag-amber/15 text-amber-foreground border-rag-amber/40",
                      displayRag === "green" && "bg-rag-green/10 text-rag-green border-rag-green/30",
                      isPendingQ && displayRag === "red" && "ring-rag-red",
                      isPendingQ && displayRag === "amber" && "ring-rag-amber",
                      (pendingRag || !isCurrentQuarter(q)) && !isPendingQ && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {isPendingQ ? "Pending…" : displayRag.toUpperCase()}
                  </button>
                ) : (
                  <button
                    onClick={() => !pendingRag && isCurrentQuarter(q) && setEditingQ(isOpen ? null : q)}
                    onBlur={() => setTimeout(() => setEditingQ(null), 150)}
                    disabled={!!pendingRag || !isCurrentQuarter(q)}
                    className={cn(
                      "w-full py-1.5 rounded-md text-xs border border-dashed border-border transition-all",
                      !pendingRag && isCurrentQuarter(q) && "text-muted-foreground/50 hover:border-primary/40 hover:text-primary/60",
                      (pendingRag || !isCurrentQuarter(q)) && "opacity-40 cursor-not-allowed text-muted-foreground/30",
                    )}
                  >
                    {isCurrentQuarter(q) ? "Set" : <Lock className="size-3 mx-auto" />}
                  </button>
                )}
                {isOpen && !pendingRag && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-10 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {(["red", "amber", "green"] as RAG[]).map((r) => (
                      <button
                        key={r}
                        onMouseDown={() => handleRagPick(q, r)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors",
                          r === "red" && "text-rag-red",
                          r === "amber" && "text-amber-foreground",
                          r === "green" && "text-rag-green",
                        )}
                      >
                        {r.toUpperCase()}
                        {r !== "green" && <span className="ml-1.5 text-[10px] opacity-60">(feedback required)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
          Status can only be updated during the active quarter · AMBER and RED require a mandatory explanation
        </p>
      </div>

      {/* Mandatory feedback form — AMBER / RED */}
      {pendingRag && isMandatory && (
        <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/5 p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-3.5 text-amber-foreground shrink-0" />
            <div className="text-xs font-semibold text-amber-foreground">
              Mandatory: Why is {pendingRag.quarter} status{" "}
              <span className={pendingRag.rag === "red" ? "text-rag-red" : "text-amber-foreground"}>
                {pendingRag.rag.toUpperCase()}
              </span>?
            </div>
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Describe the blocker, risk, or concern clearly for your manager…"
            rows={3}
            autoFocus
            className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={submitFeedback}
              disabled={!feedbackText.trim()}
              className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Submit & Save Status
            </button>
            {!feedbackText.trim() && (
              <span className="text-xs text-rag-red">Required — status will not be saved without feedback</span>
            )}
          </div>
        </div>
      )}

      {/* Optional note — GREEN */}
      {pendingRag && pendingRag.greenCommitted && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground font-medium">Add a progress note (optional)</div>
          </div>
          <div className="flex gap-2">
            <input
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitFeedback(); }}
              placeholder="Any notes or context for your manager?"
              className="flex-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={submitFeedback}
              disabled={!feedbackText.trim()}
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              Add Note
            </button>
            <button onClick={skipFeedback} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted shrink-0">
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Feedback received from HOD and direct supervisor — highlighted in violet */}
      {sortedSupervisorRemarks.length > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-transparent p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
            <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">Feedback Received</div>
            <span className="text-[10px] text-muted-foreground">· by seniority</span>
          </div>
          <div className="space-y-3">
            {sortedSupervisorRemarks.map(r => {
              const roleLabel = (currentUser.hod && r.author === currentUser.name) ? "HOD"
                : r.author === directManager ? "Your Manager"
                : "Supervisor";
              return (
                <div key={r.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-semibold text-violet-600/80 dark:text-violet-400/80">{r.author}</span>
                      <span className="text-[9px] px-1.5 py-0 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">{roleLabel}</span>
                      <span className="text-[10px] text-muted-foreground">· {r.date}</span>
                    </div>
                    {r.pending && (
                      <button
                        onClick={() => { void resolveRemark(r.id); }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors shrink-0"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{r.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past remarks (collapsible) */}
      {ownRemarks.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <MessageSquare className="size-3" />
            {ownRemarks.length} submitted note{ownRemarks.length > 1 ? "s" : ""}
            <span className="ml-1 opacity-60">{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {ownRemarks.map((r) => (
                <div key={r.id} className={cn("rounded-md px-3 py-2 text-xs", r.pending ? "bg-amber/5 border border-amber/20" : "bg-muted/40")}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-muted-foreground">{r.date}</span>
                    {r.pending && <span className="text-amber-foreground text-[10px]">Awaiting response</span>}
                  </div>
                  <div className="text-foreground/80">{r.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Pending goal card — amber-styled with nudge supervisor feature ─────────────

// Fixed demo reference date so nudge windows align with mock submitted dates.
const DEMO_TODAY = new Date("2026-07-02");

function PendingGoalCard({ goal }: { goal: GoalType }) {
  const { departmentGoals, nudgeGoal } = useApp();
  const linkedDeptName = departmentGoals.find((d) => d.id === goal.linkedDept)?.title;
  const [hasNudged, setHasNudged] = useState(false);

  const submittedDate = goal.submittedDate ? new Date(goal.submittedDate) : null;
  const daysSince = submittedDate
    ? Math.floor((DEMO_TODAY.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canNudge = daysSince !== null && daysSince >= 7 && daysSince < 14;
  const isPenaltyZone = daysSince !== null && daysSince >= 14;

  return (
    <Card className="border-rag-amber/40 bg-gradient-to-b from-rag-amber/5 to-transparent">
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-base leading-snug flex-1 text-foreground/80">{goal.title}</div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-amber/15 text-amber-foreground border border-rag-amber/40 shrink-0 whitespace-nowrap">
          <Clock className="size-3" /> Pending Approval
        </span>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{goal.description}</p>
        {linkedDeptName && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-xs font-medium text-foreground/60">
              <Target className="size-3 shrink-0" />
              {linkedDeptName}
              {goal.weightage != null && goal.linkedDept && (
                <span className="ml-0.5 text-foreground/40">· {goal.weightage}% contrib.</span>
              )}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/50">Key Result:</span>
          <span>{goal.metric}</span>
        </div>
        {submittedDate && (
          <div className="text-[11px] text-muted-foreground/70">
            Submitted {submittedDate.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            {daysSince !== null && ` · ${daysSince} day${daysSince !== 1 ? "s" : ""} ago`}
          </div>
        )}
      </div>

      {/* Penalty notice — approval overdue past 14 days */}
      {isPenaltyZone && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rag-red/8 border border-rag-red/20">
          <AlertCircle className="size-3.5 text-rag-red shrink-0 mt-0.5" />
          <p className="text-xs text-rag-red leading-snug">
            <span className="font-semibold">Approval overdue.</span> The 14-day window elapsed{daysSince !== null ? ` ${daysSince - 14} day${daysSince - 14 !== 1 ? "s" : ""} ago` : ""}. A 5-point penalty has been applied to you and your supervisor.
          </p>
        </div>
      )}

      {/* Lock notice */}
      <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/60 border border-border/50">
        <Lock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-snug">
          Awaiting manager approval. Progress updates and remarks are locked until this goal is approved.
        </p>
      </div>

      {/* Nudge supervisor — available on days 7–13 since submission */}
      {canNudge && (
        <div className="mt-3 space-y-1.5">
          {!hasNudged ? (
            <button
              onClick={() => {
                setHasNudged(true);
                nudgeGoal(goal.id);
                toast.success("Supervisor nudged — your goal has been bumped to the top of their pending actions");
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-rag-amber/40 text-amber-foreground bg-rag-amber/10 hover:bg-rag-amber/20 transition-colors"
            >
              <Bell className="size-3" /> Nudge Supervisor
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-rag-green">
              <Check className="size-3" /> Supervisor nudged — they've been notified to action this goal
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Approval is {daysSince! - 7} day{daysSince! - 7 !== 1 ? "s" : ""} overdue.
            {!hasNudged && ` Nudge available for ${13 - daysSince! + 1} more day${13 - daysSince! + 1 !== 1 ? "s" : ""}.`}
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Development goal card ──────────────────────────────────────────────────────

function DevGoalCard({
  goal,
  onUpdate,
  onDelete,
  managerInput,
  memberId,
}: {
  goal: DevGoal;
  onUpdate: (id: string, changes: Partial<DevGoal>) => void;
  onDelete: (id: string) => void;
  managerInput?: string;
  memberId?: string;
}) {
  const { acknowledgedManagerInputs, acknowledgeManagerFeedback } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: goal.title, description: goal.description, dueDate: goal.dueDate });
  const [showRecs, setShowRecs] = useState(false);
  const [recs, setRecs] = useState<{ internal: string[]; external: string[] } | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Fetch on demand when user opens the panel — only once per goal (resets when goal title/desc changes)
  useEffect(() => {
    if (!showRecs || recs !== null) return;
    let cancelled = false;
    setLoadingRecs(true);
    fetchAIRecommendations(goal.title, goal.description).then((result) => {
      if (!cancelled) { setRecs(result); setLoadingRecs(false); }
    });
    return () => { cancelled = true; };
  }, [showRecs, goal.id]);

  const saveEdit = () => {
    if (!draft.title.trim()) return;
    // Reset cached recs if title/desc changed so next open re-fetches
    if (draft.title !== goal.title || draft.description !== goal.description) setRecs(null);
    onUpdate(goal.id, { ...draft });
    setEditing(false);
    toast.success("Development goal updated");
  };

  const toggleComplete = () => {
    const next = !goal.completed;
    onUpdate(goal.id, { completed: next });
    toast.success(next ? "Goal marked complete 🎉" : "Goal reopened");
  };

  if (editing) {
    return (
      <Card className="space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Goal Title</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={2}
            className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Due Date</label>
          <div className="mt-1">
            <MonthPicker value={draft.dueDate} onChange={(v) => setDraft((d) => ({ ...d, dueDate: v }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} disabled={!draft.title.trim()} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
            Save
          </button>
          <button
            onClick={() => { setDraft({ title: goal.title, description: goal.description, dueDate: goal.dueDate }); setEditing(false); }}
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("space-y-4", goal.completed && "opacity-70")}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={cn("font-medium", goal.completed && "line-through text-muted-foreground")}>{goal.title}</div>
          <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{goal.description}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Due date badge with month picker */}
          <MonthPicker value={goal.dueDate} onChange={(v) => onUpdate(goal.id, { dueDate: v })} />
          {/* Complete toggle */}
          <button
            onClick={toggleComplete}
            title={goal.completed ? "Mark as incomplete" : "Mark as complete"}
            className={cn(
              "size-7 rounded-md grid place-items-center transition-colors",
              goal.completed ? "text-rag-green hover:bg-rag-green/10" : "text-muted-foreground hover:bg-rag-green/10 hover:text-rag-green",
            )}
          >
            <CheckCircle2 className="size-4" />
          </button>
          {/* AI recommendations toggle */}
          <button
            onClick={() => setShowRecs((v) => !v)}
            title="AI L&D Recommendations"
            className={cn(
              "size-7 rounded-md grid place-items-center transition-colors",
              showRecs ? "text-amber bg-amber/10" : "text-muted-foreground hover:bg-amber/10 hover:text-amber",
            )}
          >
            <Sparkles className="size-3.5" />
          </button>
          <button onClick={() => setEditing(true)} className="size-7 rounded-md hover:bg-muted grid place-items-center transition-colors" title="Edit goal">
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(goal.id)} className="size-7 rounded-md hover:bg-rag-red/10 grid place-items-center transition-colors" title="Remove goal">
            <Trash2 className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Completed badge */}
      {goal.completed && (
        <div className="flex items-center gap-1.5 text-xs text-rag-green">
          <CheckCircle2 className="size-3.5" />
          <span>Completed</span>
        </div>
      )}

      {/* Manager's Feedback & Recommendations */}
      {managerInput && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-4 space-y-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary shrink-0" />
              <div className="text-xs font-semibold text-primary">Manager's Feedback & Recommendations</div>
            </div>
            {memberId && !acknowledgedManagerInputs[`${memberId}:${goal.id}`] && (
              <button
                onClick={() => { acknowledgeManagerFeedback(memberId, goal.id); }}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors shrink-0"
              >
                Acknowledge
              </button>
            )}
            {memberId && acknowledgedManagerInputs[`${memberId}:${goal.id}`] && (
              <span className="text-[10px] text-rag-green flex items-center gap-1">
                <Check className="size-3" /> Acknowledged
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{managerInput}</p>
        </div>
      )}

      {/* AI recommendations panel — on demand */}
      {showRecs && (
        <div className="rounded-xl border border-amber/20 bg-gradient-to-b from-amber/5 to-transparent p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-amber shrink-0" />
            <div className="text-xs font-semibold">Pulse AI · Personalised L&D Recommendations</div>
            {loadingRecs && <Loader2 className="size-3 text-muted-foreground animate-spin ml-auto" />}
            <button onClick={() => setShowRecs(false)} className="ml-auto size-5 rounded grid place-items-center hover:bg-muted">
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>

          {loadingRecs ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 bg-muted rounded-full" style={{ width: `${75 + i * 5}%` }} />
              ))}
              <div className="text-[10px] text-muted-foreground/60 pt-1">
                Querying training calendar, policies & the web…
              </div>
            </div>
          ) : recs ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-primary" /> Internal Resources
                </div>
                <ul className="space-y-2">
                  {recs.internal.map((r, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-amber" /> External Resources
                </div>
                <ul className="space-y-2">
                  {recs.external.map((r, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-amber shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 text-[10px] text-muted-foreground/60 flex items-center gap-1 pt-1 border-t border-border/40">
                <Sparkles className="size-3" />
                Sourced from: Company Training Calendar · Policies & Guidelines · Web search · Personalised to your goal
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

// ── Shared "Propose Performance Goal" form ──────────────────────────────────────
// Performance goals: min 3, max 5. Submitted as pending — awaiting manager approval.
const PERF_GOAL_MAX = 5;

function AddPerfGoalForm({
  onAdd,
  onCancel,
}: {
  onAdd: (g: { title: string; description: string; metric: string }) => void;
  onCancel: () => void;
}) {
  const [newGoal, setNewGoal] = useState({ title: "", description: "", metric: "" });

  const handleAdd = () => {
    if (!newGoal.title.trim() || !newGoal.metric.trim()) return;
    onAdd({ title: newGoal.title.trim(), description: newGoal.description.trim(), metric: newGoal.metric.trim() });
  };

  return (
    <Card className="space-y-3 border-dashed border-primary/40 bg-primary/5">
      <div className="text-sm font-semibold text-primary">Propose a Performance Goal</div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</label>
        <input
          value={newGoal.title}
          onChange={(e) => setNewGoal((d) => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Reduce client onboarding turnaround by 20%"
          autoFocus
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
        <textarea
          value={newGoal.description}
          onChange={(e) => setNewGoal((d) => ({ ...d, description: e.target.value }))}
          rows={2}
          placeholder="What will you do and why does it matter?"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Key Result / Metric</label>
        <input
          value={newGoal.metric}
          onChange={(e) => setNewGoal((d) => ({ ...d, metric: e.target.value }))}
          placeholder="e.g. Turnaround time ≤ 2 days by Q3"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
        Submitted goals await your manager's approval. The department goal and weightage are set during review.
        Progress remarks can be added once the goal is approved.
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={!newGoal.title.trim() || !newGoal.metric.trim()} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
          Submit for Approval
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </Card>
  );
}

// ── Shared "Add Dev Goal" form ─────────────────────────────────────────────────

function AddDevGoalForm({
  onAdd,
  onCancel,
}: {
  onAdd: (g: DevGoal) => void;
  onCancel: () => void;
}) {
  const [newGoal, setNewGoal] = useState({ title: "", description: "", dueDate: "" });

  const handleAdd = () => {
    if (!newGoal.title.trim()) return;
    onAdd({ id: `dg${Date.now()}`, title: newGoal.title.trim(), description: newGoal.description.trim(), dueDate: newGoal.dueDate, completed: false });
    toast.success("Development goal added");
  };

  return (
    <Card className="space-y-3 border-dashed border-primary/40 bg-primary/5">
      <div className="text-sm font-semibold text-primary">New Development Goal</div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Title</label>
        <input
          value={newGoal.title}
          onChange={(e) => setNewGoal((d) => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Complete SHRM Certification"
          autoFocus
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
        <textarea
          value={newGoal.description}
          onChange={(e) => setNewGoal((d) => ({ ...d, description: e.target.value }))}
          rows={2}
          placeholder="What will you learn or achieve?"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Due Date</label>
        <div className="mt-1">
          <MonthPicker value={newGoal.dueDate} onChange={(v) => setNewGoal((d) => ({ ...d, dueDate: v }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={!newGoal.title.trim()} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
          Add Goal
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </Card>
  );
}

// ── Staff goals view ───────────────────────────────────────────────────────────

// Development goals: min 1, max 10. +10 pts is awarded each time a new one is set.
const DEV_GOAL_MAX = 10;

function StaffGoalsView() {
  const {
    tier, teamMembers,
    staffMemberId, adminMemberId,
    staffDevGoals, adminDevGoals,
    upsertStaffDevGoal, deleteStaffDevGoal,
    upsertAdminDevGoal, deleteAdminDevGoal,
    managerInputs, opsMeta, addPoints, proposeGoal,
    focusedGoalId, setFocusedGoalId,
  } = useApp();
  const [showRagInfo, setShowRagInfo] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [proposingGoal, setProposingGoal] = useState(false);

  const isAdmin = tier === "admin";
  const currentMemberId = opsMeta ? opsMeta.personaId : (isAdmin ? adminMemberId : staffMemberId);
  const currentDevGoals = opsMeta ? opsMeta.devGoals : (isAdmin ? adminDevGoals : staffDevGoals);
  const upsertDevGoal = opsMeta ? opsMeta.upsertDevGoal : (isAdmin ? upsertAdminDevGoal : upsertStaffDevGoal);
  const deleteDevGoalById = opsMeta ? opsMeta.deleteDevGoal : (isAdmin ? deleteAdminDevGoal : deleteStaffDevGoal);

  const staffMember = teamMembers.find((m) => m.id === currentMemberId);
  const [localHighlightId, setLocalHighlightId] = useState<string | null>(null);

  // Scroll to the focused goal when navigated from a pending-action notification
  useEffect(() => {
    if (!focusedGoalId) return;
    const el = document.querySelector(`[data-goal-id="${focusedGoalId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setLocalHighlightId(focusedGoalId);
      setFocusedGoalId(null);
      const t = setTimeout(() => setLocalHighlightId(null), 2500);
      return () => clearTimeout(t);
    }
  // staffMember in deps ensures we re-run once goals are rendered after section switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedGoalId, staffMember]);

  if (!staffMember) return (
    <div className="py-10 text-center text-muted-foreground text-sm">Staff member not found.</div>
  );

  const pendingGoals = staffMember.goals.filter((g) => !g.approved);
  const approvedGoals = staffMember.goals
    .filter((g) => g.approved)
    .sort((a, b) => (b.weightage ?? 0) - (a.weightage ?? 0));

  const updateDevGoal = (id: string, changes: Partial<DevGoal>) =>
    upsertDevGoal({ ...currentDevGoals.find((g) => g.id === id)!, ...changes });

  const deleteDevGoal = (id: string) => {
    deleteDevGoalById(id);
    toast.success("Development goal removed");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5 flex items-start justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <RocketSVG />
            <div>
              <h2 className="font-display text-2xl text-white">My Goals</h2>
            </div>
          </div>
          <button
            onClick={() => setShowRagInfo((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors mt-1 shrink-0",
              showRagInfo ? "bg-white/20 border-white/40 text-white" : "border-white/30 hover:bg-white/10 text-white/70",
            )}
          >
            <Info className="size-3.5" />
            RAG Guide
          </button>
        </div>

        {/* Stats strip */}
        <div className="bg-muted/40 border-b border-border px-6 py-3 flex items-center gap-6 text-xs text-muted-foreground">
          <div><span className="font-semibold text-foreground">{approvedGoals.length}</span> approved goals</div>
          <div className="w-px h-3 bg-border" />
          <div><span className="font-semibold text-foreground">{pendingGoals.length}</span> pending approval</div>
          <div className="w-px h-3 bg-border" />
          <div><span className="font-semibold text-foreground">{currentDevGoals.length}</span> development goals</div>
        </div>
      </div>

      {showRagInfo && <RAGInfoPanel onClose={() => setShowRagInfo(false)} />}

      {/* Performance Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" fill="#DBEAFE"/>
              <circle cx="20" cy="20" r="11" fill="#93C5FD"/>
              <circle cx="20" cy="20" r="6" fill="#3B82F6"/>
              <circle cx="20" cy="20" r="2.5" fill="white"/>
              <line x1="20" y1="4" x2="20" y2="8" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20" y1="32" x2="20" y2="36" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4" y1="20" x2="8" y2="20" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <line x1="32" y1="20" x2="36" y2="20" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="32" cy="8" r="1.5" fill="#FCD34D"/>
            </svg>
            <div>
              <h3 className="font-display text-xl">Performance Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({staffMember.goals.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground">Set 3–5 within 30 days of joining · pending goals await manager approval</p>
            </div>
          </div>
          <button
            onClick={() => setProposingGoal(true)}
            disabled={staffMember.goals.length >= PERF_GOAL_MAX}
            title={staffMember.goals.length >= PERF_GOAL_MAX ? `Maximum ${PERF_GOAL_MAX} performance goals reached` : undefined}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-opacity"
          >
            <Plus className="size-3.5" /> Propose Goal
          </button>
        </div>
        <div className="space-y-4">
          {approvedGoals.length === 0 && pendingGoals.length === 0 && !proposingGoal && (
            <div className="rounded-xl border-2 border-dashed border-rag-red/30 bg-rag-red/5 px-6 py-10 text-center text-sm text-muted-foreground">
              No performance goals set yet. Propose at least 3 within 30 days of joining to earn +10 pts per goal.
            </div>
          )}
          {pendingGoals.map((g) => (
            <div key={g.id} data-goal-id={g.id}>
              <PendingGoalCard goal={g} />
            </div>
          ))}
          {approvedGoals.map((g) => (
            <div
              key={g.id}
              data-goal-id={g.id}
              className={cn(
                "rounded-xl transition-all duration-500",
                localHighlightId === g.id && "ring-2 ring-primary/50 ring-offset-2 shadow-lg"
              )}
            >
              <ActiveGoalCard goal={g} memberId={staffMember.id} memberName={staffMember.name} directManager={staffMember.directManager} />
            </div>
          ))}
          {proposingGoal && (
            <AddPerfGoalForm
              onAdd={(g) => {
                proposeGoal(staffMember.id, g);
                setProposingGoal(false);
                addPoints(10);
                toast.success("Performance goal submitted for approval · +10 pts");
              }}
              onCancel={() => setProposingGoal(false)}
            />
          )}
        </div>
      </div>

      {/* Development Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="10" width="28" height="22" rx="4" fill="#FEF3C7"/>
              <rect x="6" y="10" width="28" height="22" rx="4" fill="#FCD34D" opacity="0.4"/>
              <path d="M20 7 L21.5 12 L26 12 L22.5 15 L24 20 L20 17 L16 20 L17.5 15 L14 12 L18.5 12Z" fill="#F59E0B"/>
              <circle cx="32" cy="8" r="2" fill="#FDE68A"/>
              <circle cx="8" cy="30" r="1.2" fill="#A78BFA"/>
            </svg>
            <div>
              <h3 className="font-display text-xl">Development Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({currentDevGoals.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground">Set due dates · AI L&D recommendations · Mark complete when done</p>
            </div>
          </div>
          <button
            onClick={() => setAddingGoal(true)}
            disabled={currentDevGoals.length >= DEV_GOAL_MAX}
            title={currentDevGoals.length >= DEV_GOAL_MAX ? `Maximum ${DEV_GOAL_MAX} development goals reached` : undefined}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-opacity"
          >
            <Plus className="size-3.5" /> Add Goal
          </button>
        </div>
        <div className="space-y-4">
          {currentDevGoals.map((g) => (
            <DevGoalCard
              key={g.id}
              goal={g}
              onUpdate={updateDevGoal}
              onDelete={deleteDevGoal}
              managerInput={managerInputs[`${currentMemberId}:${g.id}`]}
              memberId={currentMemberId}
            />
          ))}
          {addingGoal && (
            <AddDevGoalForm
              onAdd={(g) => { upsertDevGoal(g); setAddingGoal(false); addPoints(10); toast.success("Development goal set · +10 pts"); }}
              onCancel={() => setAddingGoal(false)}
            />
          )}
          {currentDevGoals.length === 0 && !addingGoal && (
            <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              No development goals yet. Add one to get started and receive AI recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Manager's performance goal card (same mandatory remarks flow as staff) ─────

type PerfGoal = { id: string; title: string; description: string; metric: string; rag: string; linkedDept?: string };

function ManagerPerfGoalCard({ goal }: { goal: PerfGoal }) {
  const { departmentGoals } = useApp();
  const [rag, setRag] = useState<RAG>(goal.rag as RAG);
  const [editingQ, setEditingQ] = useState(false);
  const [pendingRag, setPendingRag] = useState<{ rag: RAG; greenCommitted: boolean } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const linkedDeptName = departmentGoals.find((d) => d.id === goal.linkedDept)?.title;
  const isMandatory = pendingRag && (pendingRag.rag === "amber" || pendingRag.rag === "red");

  const handlePick = (r: RAG) => {
    setEditingQ(false);
    if (r === "green") {
      setRag(r);
      setPendingRag({ rag: r, greenCommitted: true });
    } else {
      setPendingRag({ rag: r, greenCommitted: false });
    }
    setFeedbackText("");
  };

  const submitFeedback = () => {
    if (isMandatory && !feedbackText.trim()) return;
    if (!pendingRag?.greenCommitted) setRag(pendingRag!.rag);
    toast.success(`Status updated to ${pendingRag!.rag.toUpperCase()}${feedbackText.trim() ? " — note saved" : ""}`);
    setPendingRag(null);
    setFeedbackText("");
  };

  const skipFeedback = () => {
    toast.success("Status set to GREEN");
    setPendingRag(null);
    setFeedbackText("");
  };

  const displayRag = pendingRag?.rag ?? rag;

  return (
    <Card className="space-y-3">
      {/* Title + RAG badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-base leading-snug flex-1">{goal.title}</div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shrink-0",
          displayRag === "red" && "bg-rag-red/10 text-rag-red border-rag-red/30",
          displayRag === "amber" && "bg-rag-amber/15 text-amber-foreground border-rag-amber/40",
          displayRag === "green" && "bg-rag-green/10 text-rag-green border-rag-green/30",
          pendingRag && !pendingRag.greenCommitted && "animate-pulse ring-2 ring-offset-1",
          pendingRag && !pendingRag.greenCommitted && displayRag === "red" && "ring-rag-red",
          pendingRag && !pendingRag.greenCommitted && displayRag === "amber" && "ring-rag-amber",
        )}>
          {pendingRag && !pendingRag.greenCommitted ? "Pending…" : displayRag.toUpperCase()}
        </span>
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{goal.description}</p>
        {linkedDeptName && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
              <Target className="size-3 shrink-0" />
              {linkedDeptName}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/60">Key Result:</span>
          <span className="leading-snug">{goal.metric}</span>
        </div>
      </div>

      {/* Update Status button + dropdown */}
      {!pendingRag && (
        <div className="relative inline-block">
          <button
            onClick={() => setEditingQ((v) => !v)}
            onBlur={() => setTimeout(() => setEditingQ(false), 150)}
            className="text-xs px-3 py-1.5 rounded-md bg-muted border border-border hover:bg-muted/80 transition-colors"
          >
            Update Status
          </button>
          {editingQ && (
            <div className="absolute top-full mt-1 left-0 z-10 bg-popover border border-border rounded-lg shadow-lg overflow-hidden w-40">
              {(["red", "amber", "green"] as RAG[]).map((r) => (
                <button
                  key={r}
                  onMouseDown={() => handlePick(r)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors",
                    r === "red" && "text-rag-red",
                    r === "amber" && "text-amber-foreground",
                    r === "green" && "text-rag-green",
                  )}
                >
                  {r.toUpperCase()}
                  {r !== "green" && <span className="ml-1.5 text-[10px] opacity-60">(note required)</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mandatory note — AMBER / RED */}
      {pendingRag && isMandatory && (
        <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/5 p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-3.5 text-amber-foreground shrink-0" />
            <div className="text-xs font-semibold text-amber-foreground">
              Mandatory: Why is this goal{" "}
              <span className={pendingRag.rag === "red" ? "text-rag-red" : "text-amber-foreground"}>
                {pendingRag.rag.toUpperCase()}
              </span>?
            </div>
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Describe the concern, blocker, or risk for your records…"
            rows={3}
            autoFocus
            className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={submitFeedback}
              disabled={!feedbackText.trim()}
              className="text-xs px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Submit & Save Status
            </button>
            {!feedbackText.trim() && (
              <span className="text-xs text-rag-red">Required — status will not be saved without a note</span>
            )}
          </div>
        </div>
      )}

      {/* Optional note — GREEN */}
      {pendingRag && pendingRag.greenCommitted && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-3.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground font-medium">Add a note (optional)</div>
          </div>
          <div className="flex gap-2">
            <input
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitFeedback(); }}
              placeholder="Any context or updates to record?"
              className="flex-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={submitFeedback} disabled={!feedbackText.trim()} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0">
              Add Note
            </button>
            <button onClick={skipFeedback} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted shrink-0">
              Skip
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Manager's own goals view ───────────────────────────────────────────────────

function ManagerGoalsView() {
  const { myGoals, currentUser, managerDevGoals, upsertManagerDevGoal, deleteManagerDevGoal, opsMeta, addPoints } = useApp();
  const [showRagInfo, setShowRagInfo] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);

  const perfGoals = opsMeta ? opsMeta.performanceGoals : myGoals.performance;
  const activeDevGoals = opsMeta ? opsMeta.devGoals : managerDevGoals;
  const activeUpsertDevGoal = opsMeta ? opsMeta.upsertDevGoal : upsertManagerDevGoal;
  const activeDeleteDevGoal = opsMeta ? opsMeta.deleteDevGoal : deleteManagerDevGoal;

  const updateDevGoal = (id: string, changes: Partial<DevGoal>) =>
    activeUpsertDevGoal({ ...activeDevGoals.find((g) => g.id === id)!, ...changes });

  const deleteDevGoal = (id: string) => {
    activeDeleteDevGoal(id);
    toast.success("Development goal removed");
  };

  return (
    <div className="space-y-8">
      {/* Header — matches StaffGoalsView gradient card */}
      <div className="rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5 flex items-start justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <RocketSVG />
            <div>
              <h2 className="font-display text-2xl text-white">My Goals</h2>
            </div>
          </div>
          <button
            onClick={() => setShowRagInfo((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors mt-1 shrink-0",
              showRagInfo ? "bg-white/20 border-white/40 text-white" : "border-white/30 hover:bg-white/10 text-white/70",
            )}
          >
            <Info className="size-3.5" />
            RAG Guide
          </button>
        </div>
        <div className="bg-muted/40 border-b border-border px-6 py-3 flex items-center gap-6 text-xs text-muted-foreground">
          <div><span className="font-semibold text-foreground">{perfGoals.length}</span> performance goals</div>
          <div className="w-px h-3 bg-border" />
          <div><span className="font-semibold text-foreground">{activeDevGoals.length}</span> development goals</div>
        </div>
      </div>

      {showRagInfo && <RAGInfoPanel onClose={() => setShowRagInfo(false)} />}

      {/* Performance goals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" fill="#DBEAFE"/>
            <circle cx="20" cy="20" r="11" fill="#93C5FD"/>
            <circle cx="20" cy="20" r="6" fill="#3B82F6"/>
            <circle cx="20" cy="20" r="2.5" fill="white"/>
            <line x1="20" y1="4" x2="20" y2="8" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
            <line x1="20" y1="32" x2="20" y2="36" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="20" x2="8" y2="20" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
            <line x1="32" y1="20" x2="36" y2="20" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="32" cy="8" r="1.5" fill="#FCD34D"/>
          </svg>
          <div>
            <h3 className="font-display text-xl">Performance Goals
              <span className="ml-2 text-sm font-normal text-muted-foreground">({perfGoals.length})</span>
            </h3>
            <p className="text-xs text-muted-foreground">Your goals linked to department objectives — AMBER and RED status updates require a mandatory note</p>
          </div>
        </div>
        <div className="space-y-4">
          {perfGoals.map((g) => (
            <ManagerPerfGoalCard key={g.id} goal={g} />
          ))}
        </div>
      </div>

      {/* Development goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="10" width="28" height="22" rx="4" fill="#FEF3C7"/>
              <rect x="6" y="10" width="28" height="22" rx="4" fill="#FCD34D" opacity="0.4"/>
              <path d="M20 7 L21.5 12 L26 12 L22.5 15 L24 20 L20 17 L16 20 L17.5 15 L14 12 L18.5 12Z" fill="#F59E0B"/>
              <circle cx="32" cy="8" r="2" fill="#FDE68A"/>
              <circle cx="8" cy="30" r="1.2" fill="#A78BFA"/>
            </svg>
            <div>
              <h3 className="font-display text-xl">Development Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({activeDevGoals.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground">Set due dates · AI L&D recommendations · Mark complete when done</p>
            </div>
          </div>
          <button
            onClick={() => setAddingGoal(true)}
            disabled={activeDevGoals.length >= DEV_GOAL_MAX}
            title={activeDevGoals.length >= DEV_GOAL_MAX ? `Maximum ${DEV_GOAL_MAX} development goals reached` : undefined}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="size-3.5" /> Add Goal
          </button>
        </div>
        <div className="space-y-4">
          {activeDevGoals.map((g) => (
            <DevGoalCard key={g.id} goal={g} onUpdate={updateDevGoal} onDelete={deleteDevGoal} />
          ))}
          {addingGoal && (
            <AddDevGoalForm
              onAdd={(g) => { activeUpsertDevGoal(g); setAddingGoal(false); addPoints(10); toast.success("Development goal set · +10 pts"); }}
              onCancel={() => setAddingGoal(false)}
            />
          )}
          {activeDevGoals.length === 0 && !addingGoal && (
            <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              No development goals yet. Add one to receive AI-curated L&D recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function MyGoalsSection() {
  const { tier } = useApp();
  if (tier === "manager" || tier === "ops_hod") return <ManagerGoalsView />;
  return <StaffGoalsView />;
}
