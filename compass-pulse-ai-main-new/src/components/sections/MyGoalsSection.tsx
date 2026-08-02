import { useState, useEffect } from "react";
import { Card, SectionTitle, MonthPicker, formatDueDate, SkillAttachmentModal, RAGInfoPanel, RagPill, RagDot, ActionNeededIcon, MascotFlourish } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import type { DevGoalRecommendation, PerfGoalRecommendation } from "@/lib/appContext";
import { getAiProvider } from "@/lib/aiService";
import type { RAG, PersonalDevGoal, SkillAttachment, KeyResult, DeptGoal, DirectorPerformanceGoal } from "@/lib/mockData";
import { HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { MARKETING_DEPT_NAME, marketingDepartmentGoals } from "@/lib/marketingData";
import {
  Check, Lock, MessageSquare, Bell, Info, AlertCircle, Clock,
  Pencil, Trash2, Plus, Sparkles, X, Loader2, Circle, CheckCircle2, Target, GraduationCap,
  ThumbsUp, ThumbsDown, FileCheck2, Upload, ChevronRight, ChevronDown, ChevronUp, ListChecks, UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { pointsToast } from "@/lib/pointsToast";
import { cn, workingDaysSince, formatGoalStatusDueDate, daysSinceJoin, flattenOkrOptions, keyResultsOwnedBy, objectivesOwnedBy, stripLeadingZero, clampScoreDecimal, roundToOneDecimal, formatMonthlyConfidenceDueDate, objectiveScore, objectiveConfidence, scoreToRag, isPendingAckFor, ownerNames, isKrOverdue, formatEffectiveKrScoreDueDate, isKrScoreFromPastQuarter, isKrScoreStaleForDisplay } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Types ──────────────────────────────────────────────────────────────────────

type DevGoal = PersonalDevGoal;
type DeptGoalsList = ReturnType<typeof useApp>["departmentGoals"];

// A performance goal's linkedDept can point at either a top-level Objective or one of its nested
// Key Results — this resolves either into a display title.
function resolveLinkedTitle(linkedDept: string | undefined, departmentGoals: DeptGoalsList): string | undefined {
  if (!linkedDept) return undefined;
  const obj = departmentGoals.find(d => d.id === linkedDept);
  if (obj) return obj.title;
  for (const d of departmentGoals) {
    const kr = (d.keyResults ?? []).find(k => k.id === linkedDept);
    if (kr) return kr.title;
  }
  return undefined;
}

// ── Month helpers ──────────────────────────────────────────────────────────────

const QUARTER_MONTHS: Record<string, readonly [number, number]> = {
  Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
};
function isCurrentQuarter(q: string): boolean {
  const m = new Date().getMonth();
  const range = QUARTER_MONTHS[q];
  return !!range && m >= range[0] && m <= range[1];
}

// ── AI L&D recommendation database ──────────────────────────────────────────────
// Simulated "fetch" (no live external API in this app — every AI feature here is curated +
// a loading delay, consistent with the rest of the dashboard). Curated against real, accredited
// providers: IHRP, SMU, Coursera, UiPath Academy, Microsoft Learn, IBF, NUS, Tertiary Infotech.

const AI_RECS: Record<string, { internal: string[]; external: string[] }> = {
  hr_certification: {
    internal: [
      "P&C Learning Portal · IHRP Certification Study Group — join the Q3 2026 cohort (register via the Human Capital portal)",
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
      "Mentorship Programme — available to all team members (register via the Human Capital portal)",
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

// ── Grow — a DBS iGrow-inspired section ─────────────────────────────────────────
// DBS's iGrow lets staff maintain a skill profile so the platform can recommend courses and
// internal roles from it — this is the same idea, scoped to skills already on this person's own
// profile as "pending" (started but not yet verified), reusing the existing AI_RECS course catalog
// rather than inventing a parallel one. Collapsed by default — a cute, low-pressure nudge toward
// growth, not another permanent block on an already-dense page. Internal role matching lives on the
// Skills Profile page already (the live PhillipCapital job-rotation matcher) — linked to rather than
// duplicated here.
function GrowSection({ pendingSkills, onViewOpportunities }: { pendingSkills: string[]; onViewOpportunities: () => void }) {
  const [expanded, setExpanded] = useState(false);
  if (pendingSkills.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-teal-300/60 dark:border-teal-700/40 bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-transparent dark:from-teal-950/20 overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" aria-hidden="true">🌱</span>
          <span className="font-display text-base text-teal-800 dark:text-teal-300">Grow</span>
          <span className="text-[10px] text-muted-foreground">{pendingSkills.length} skill{pendingSkills.length === 1 ? "" : "s"} in progress</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Suggested learning for the skills you're already working toward, inspired by DBS's iGrow model — course suggestions from your own skill profile, no extra setup.
          </p>
          {pendingSkills.map(skill => {
            const recs = AI_RECS[matchAIRecCategory(skill)];
            return (
              <div key={skill} className="rounded-lg border border-teal-200/60 dark:border-teal-800/40 bg-background/70 p-3">
                <div className="text-sm font-semibold text-teal-800 dark:text-teal-300">{skill}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">Internal</div>
                    <ul className="space-y-0.5">
                      {recs.internal.slice(0, 2).map(c => <li key={c} className="text-[11px] text-foreground/80 leading-snug">• {c}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-0.5">External</div>
                    <ul className="space-y-0.5">
                      {recs.external.slice(0, 2).map(c => <li key={c} className="text-[11px] text-foreground/80 leading-snug">• {c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={onViewOpportunities} className="text-xs text-teal-700 dark:text-teal-400 font-medium hover:underline">
            View matching internal roles on your Skills Profile →
          </button>
        </div>
      )}
    </div>
  );
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

// ── Approved goal card ─────────────────────────────────────────────────────────

type GoalType = ReturnType<typeof useApp>["teamMembers"][number]["goals"][number];

function ActiveGoalCard({ goal, memberId, memberName, directManager }: { goal: GoalType; memberId: string; memberName: string; directManager: string }) {
  const { departmentGoals, updateGoalRag, addGoalRemark, acknowledgeGoal, resolveRemark, currentUser, staffList, pendingGoalEditProposals, proposeGoalEdit } = useApp();
  const [editingQ, setEditingQ] = useState<string | null>(null);
  // pendingRag: selected but not yet committed (amber/red require feedback first; green commits immediately but shows optional note)
  const [pendingRag, setPendingRag] = useState<{ quarter: "Q1" | "Q2" | "Q3" | "Q4"; rag: RAG; greenCommitted: boolean } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Self-service edit proposal — title/description/metric/linkedDept, sent to the HOD for approval
  // after an attestation that the goal owner has consulted their direct supervisor.
  const [editingGoal, setEditingGoal] = useState(false);
  const [proposeDraft, setProposeDraft] = useState({ title: goal.title, description: goal.description, metric: goal.metric, linkedDept: goal.linkedDept ?? "" });
  const [showAttestation, setShowAttestation] = useState(false);
  const [attested, setAttested] = useState(false);
  const ownDept = staffList.find(s => s.id === memberId)?.dept;
  const hodEntry = staffList.find(s => s.hod && s.dept === ownDept);
  const hodName = hodEntry?.name ?? "your HOD";
  const hodId = hodEntry?.id ?? "u0";
  const hasPendingProposal = pendingGoalEditProposals.some(p => p.goalId === goal.id && p.source === "self");

  const openEditForm = () => {
    setProposeDraft({ title: goal.title, description: goal.description, metric: goal.metric, linkedDept: goal.linkedDept ?? "" });
    setEditingGoal(true);
  };
  const confirmProposal = () => {
    proposeGoalEdit({
      memberId, memberName, goalId: goal.id, goalTitle: goal.title,
      changes: { title: proposeDraft.title, description: proposeDraft.description, metric: proposeDraft.metric, linkedDept: proposeDraft.linkedDept },
      source: "self", proposedBy: memberName, hodId, hodName,
    });
    toast.success(`Proposed change sent to ${hodName} for approval`);
    setShowAttestation(false);
    setAttested(false);
    setEditingGoal(false);
  };

  const linkedDeptName = resolveLinkedTitle(goal.linkedDept, departmentGoals);
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
        <div className="flex items-center gap-1.5 shrink-0">
          {hasPendingProposal ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber/10 text-amber-foreground border border-amber/30">
              <Clock className="size-3" /> Pending {hodName}'s approval
            </span>
          ) : (
            <button
              onClick={openEditForm}
              title="Propose a change to this goal"
              className="size-6 rounded-md border border-primary/20 bg-primary/5 text-primary/80 hover:bg-primary/15 hover:text-primary grid place-items-center transition-colors"
            >
              <Pencil className="size-3" />
            </button>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-green/10 text-rag-green border border-rag-green/30">
            <Check className="size-3" /> Approved
          </span>
        </div>
      </div>

      {/* Propose-a-change form */}
      {editingGoal && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <div className="text-xs font-semibold text-primary">Propose a Change</div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Goal Title</label>
            <input
              value={proposeDraft.title}
              onChange={e => setProposeDraft(d => ({ ...d, title: e.target.value }))}
              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</label>
            <textarea
              value={proposeDraft.description}
              onChange={e => setProposeDraft(d => ({ ...d, description: e.target.value }))}
              rows={3}
              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Key Result</label>
            <textarea
              value={proposeDraft.metric}
              onChange={e => setProposeDraft(d => ({ ...d, metric: e.target.value }))}
              rows={2}
              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Objective / Key Result Linkage <span className="text-rag-red">*</span></label>
            <select
              value={proposeDraft.linkedDept}
              onChange={e => setProposeDraft(d => ({ ...d, linkedDept: e.target.value }))}
              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>Select an objective or key result…</option>
              {flattenOkrOptions(departmentGoals).map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!proposeDraft.linkedDept) { toast.error("Select an objective or key result to link this goal to"); return; } setShowAttestation(true); }}
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 font-medium transition-opacity"
            >
              Save Proposed Changes
            </button>
            <button onClick={() => setEditingGoal(false)} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attestation — must confirm consultation with direct supervisor before submitting to the HOD */}
      {showAttestation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAttestation(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="font-display text-lg leading-snug">Confirm Before Submitting</div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={attested}
                onChange={e => setAttested(e.target.checked)}
                className="mt-0.5 rounded shrink-0"
              />
              <span className="text-sm text-foreground/85 leading-relaxed">
                I confirm I have discussed and consulted my direct supervisor, <strong>{directManager}</strong>,
                before submitting this change to my performance goal to <strong>{hodName}</strong> for approval.
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmProposal}
                disabled={!attested}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Submit for Approval
              </button>
              <button
                onClick={() => { setShowAttestation(false); setAttested(false); }}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className="ml-0.5 text-primary/60">· {goal.weightage}% contribution</span>
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
  const linkedDeptName = resolveLinkedTitle(goal.linkedDept, departmentGoals);
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
                <span className="ml-0.5 text-foreground/40">· {goal.weightage}% contribution</span>
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
  const {
    acknowledgedManagerInputs, acknowledgeManagerFeedback, pendingDueDateGoals, clearPendingDueDate,
    skills, allTeamMemberSkills, devGoalAttachments, attachDevGoalCertificate, addPendingSkill,
  } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: goal.title, description: goal.description, dueDate: goal.dueDate });
  const [showRecs, setShowRecs] = useState(false);
  const [recs, setRecs] = useState<{ internal: string[]; external: string[] } | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

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

  // Marking complete requires a supporting certificate — reopening a completed goal stays instant.
  // A certification is required for every development goal, no exceptions, per policy.
  const toggleComplete = () => {
    if (!goal.completed) { setShowAttachModal(true); return; }
    onUpdate(goal.id, { completed: false });
    toast.success("Goal reopened");
  };

  const handleCertificateUpload = (attachment: SkillAttachment) => {
    attachDevGoalCertificate(goal.id, attachment);
    onUpdate(goal.id, { completed: true, completedDate: new Date().toISOString().slice(0, 10) });
    setShowAttachModal(false);
    toast.success("Goal marked complete 🎉 — certificate saved, ready to submit for manager approval.");
  };

  // Goals added from a Development Roadmap recommendation start without a due date — flagged until
  // one is set, with a 7-working-day SLA behind it (enforced in appContext.tsx).
  const pendingDueDate = pendingDueDateGoals.find(p => p.goalId === goal.id);
  const needsDueDate = !goal.dueDate && !!pendingDueDate;
  const dueDateDaysLeft = pendingDueDate ? 7 - workingDaysSince(pendingDueDate.createdDate) : 0;

  // Once completed with a certificate on file, the staff member can submit it to become a pending
  // verified skill — unless it's already been submitted (pending) or verified.
  const effectiveMemberId = memberId ?? "u0";
  const memberSkillsEntry = allTeamMemberSkills.find(m => m.memberId === effectiveMemberId);
  const pendingSkillTitles = memberSkillsEntry ? memberSkillsEntry.pending : skills.pending;
  const verifiedSkillTitles = memberSkillsEntry ? memberSkillsEntry.verified : skills.verified;
  const alreadySubmitted = pendingSkillTitles.includes(goal.title) || verifiedSkillTitles.includes(goal.title);
  const certificate = devGoalAttachments[goal.id];
  const canSubmitForApproval = goal.completed && !!certificate && !alreadySubmitted;

  const handleSubmitForApproval = () => {
    void addPendingSkill(goal.title, certificate);
    toast.success(`"${goal.title}" submitted for manager approval · your certificate is attached`);
  };

  const setDueDate = (v: string) => {
    onUpdate(goal.id, { dueDate: v });
    clearPendingDueDate(goal.id);
  };

  // Once approved into the verified skills profile, this goal has graduated — it no longer needs
  // to occupy space in the Development Goals list.
  if (verifiedSkillTitles.includes(goal.title)) return null;

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
    <Card className={cn("space-y-4", goal.completed && "border-rag-green/30 bg-gradient-to-b from-rag-green/5 to-transparent")}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={cn("font-medium", goal.completed && "font-bold text-rag-green")}>
            {goal.title}{goal.completed && " 🎉"}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{goal.description}</div>
          {needsDueDate && (
            <div className="text-xs text-amber-foreground mt-1 flex items-center gap-1">
              <Clock className="size-3 shrink-0" />
              Set a due date — {Math.max(dueDateDaysLeft, 0)} working day{dueDateDaysLeft !== 1 ? "s" : ""} left, or a 5-point penalty will apply.
            </div>
          )}
        </div>
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Due date badge with month picker */}
            <MonthPicker value={goal.dueDate} onChange={setDueDate} highlight={needsDueDate} />
            {/* Complete toggle — empty circle = not done, filled checkmark = done (todo-checkbox metaphor),
                plus a text label since an icon alone doesn't read as unambiguously as the pencil/trash do */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleComplete}
                  aria-label={goal.completed ? "Mark as incomplete" : "Mark as complete"}
                  className={cn(
                    "h-7 px-2 rounded-md border flex items-center gap-1 text-[11px] font-medium transition-colors",
                    goal.completed
                      ? "text-rag-green bg-rag-green/15 border-rag-green/30 hover:bg-rag-green/25"
                      : "text-muted-foreground/70 bg-transparent border-border hover:bg-rag-green/10 hover:text-rag-green hover:border-rag-green/30",
                  )}
                >
                  {goal.completed ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                  {goal.completed ? "Completed" : "Complete"}
                </button>
              </TooltipTrigger>
              <TooltipContent>{goal.completed ? "Mark as incomplete" : "Mark this goal as complete"}</TooltipContent>
            </Tooltip>
            {/* Learning recommendations toggle — graduation cap + label reads as "learning resources" at a glance */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowRecs((v) => !v)}
                  aria-label="Learning Recommendations"
                  className={cn(
                    "h-7 px-2 rounded-md border flex items-center gap-1 text-[11px] font-medium transition-colors",
                    showRecs
                      ? "text-amber-foreground bg-amber/20 border-amber/40"
                      : "text-amber-foreground/80 bg-amber/8 border-amber/25 hover:bg-amber/20",
                  )}
                >
                  <GraduationCap className="size-3.5" />
                  Resources
                </button>
              </TooltipTrigger>
              <TooltipContent>Recommended learning resources for this goal</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setEditing(true)}
                  className="size-7 rounded-md border border-primary/20 bg-primary/5 text-primary/80 hover:bg-primary/15 hover:text-primary grid place-items-center transition-colors"
                  aria-label="Edit goal"
                >
                  <Pencil className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit goal</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDelete(goal.id)}
                  className="size-7 rounded-md border border-rag-red/20 bg-rag-red/5 text-rag-red/70 hover:bg-rag-red/15 hover:text-rag-red grid place-items-center transition-colors"
                  aria-label="Remove goal"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Remove goal</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Completed badge + certificate submission */}
      {goal.completed && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-rag-green">
            <CheckCircle2 className="size-3.5" />
            <span>Completed</span>
          </div>
          {certificate && (
            <a
              href={certificate.objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
            >
              <FileCheck2 className="size-3" /> {certificate.fileName}
            </a>
          )}
          {canSubmitForApproval && (
            <button
              onClick={handleSubmitForApproval}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-colors"
            >
              <Upload className="size-3" /> Submit for Manager Approval
            </button>
          )}
          {alreadySubmitted && (
            <span className="text-[11px] text-amber-foreground/80">
              {verifiedSkillTitles.includes(goal.title) ? "Verified on your skills profile" : "Pending manager approval"}
            </span>
          )}
        </div>
      )}
      {showAttachModal && (
        <SkillAttachmentModal
          skillName={goal.title}
          onSubmit={handleCertificateUpload}
          onClose={() => setShowAttachModal(false)}
          submitLabel="Mark Complete"
        />
      )}

      {/* Manager's Feedback & Recommendations */}
      {managerInput && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-4 space-y-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-3.5 text-primary shrink-0" />
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
            <div className="text-xs font-semibold">Personalised Learning Recommendations</div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
const PERF_GOAL_MIN = 3;
const PERF_GOAL_MAX = 5;

function AddPerfGoalForm({
  onAdd,
  onCancel,
  departmentGoals,
}: {
  onAdd: (g: { title: string; description: string; metric: string; linkedDept: string }) => void;
  onCancel: () => void;
  departmentGoals: DeptGoalsList;
}) {
  const [newGoal, setNewGoal] = useState({ title: "", description: "", metric: "", linkedDept: "" });
  const okrOptions = flattenOkrOptions(departmentGoals);

  const handleAdd = () => {
    if (!newGoal.title.trim() || !newGoal.metric.trim() || !newGoal.linkedDept) return;
    onAdd({ title: newGoal.title.trim(), description: newGoal.description.trim(), metric: newGoal.metric.trim(), linkedDept: newGoal.linkedDept });
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
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Objective / Key Result Linkage <span className="text-rag-red">*</span></label>
        <select
          value={newGoal.linkedDept}
          onChange={(e) => setNewGoal((d) => ({ ...d, linkedDept: e.target.value }))}
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Select an objective or key result…</option>
          {okrOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
        Submitted goals await your manager's approval. Weightage is set during review.
        Progress remarks can be added once the goal is approved.
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={!newGoal.title.trim() || !newGoal.metric.trim() || !newGoal.linkedDept} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
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
    <Card className="space-y-3 border-dashed border-amber/40 bg-amber/5">
      <div className="text-sm font-semibold text-amber-foreground">New Development Goal</div>
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
        <button onClick={handleAdd} disabled={!newGoal.title.trim()} className="text-xs px-3 py-1.5 rounded-md bg-amber text-amber-foreground font-medium hover:opacity-90 disabled:opacity-50">
          Add Goal
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </Card>
  );
}

// ── Recommended development goal — awaiting the team member's acknowledge/decline ──────────────

function RecommendedDevGoalCard({ rec, memberId }: { rec: DevGoalRecommendation; memberId: string }) {
  const { acknowledgeDevGoalRec, declineDevGoalRec } = useApp();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const daysElapsed = workingDaysSince(rec.recommendedDate);
  const daysLeft = 7 - daysElapsed;
  const isOverdue = daysElapsed >= 7;

  const handleAcknowledge = () => {
    acknowledgeDevGoalRec(memberId, rec.id);
    toast.success(`"${rec.title}" added to your development goals`);
  };

  const handleDecline = () => {
    if (!reason.trim()) return;
    declineDevGoalRec(memberId, rec.id, reason.trim());
    toast.success("Recommendation declined — your response has been shared");
  };

  return (
    <Card className="space-y-3 border-dashed border-amber/50 bg-amber/5">
      <div className="flex items-center gap-2">
        <GraduationCap className="size-4 text-amber-foreground shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-foreground">Recommended for you</span>
      </div>
      <div>
        <div className="font-medium">{rec.title}</div>
        {rec.description && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{rec.description}</p>}
        <div className="text-xs text-muted-foreground mt-1.5">
          Recommended by <span className="font-medium text-foreground/80">{rec.recommendedBy}</span>
          {rec.dueDate && <> · Target: {formatDueDate(rec.dueDate)}</>}
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
        isOverdue ? "bg-rag-red/10 text-rag-red border border-rag-red/25" : "bg-muted/50 text-muted-foreground"
      )}>
        <Clock className="size-3.5 shrink-0" />
        {rec.penaltyApplied
          ? <>Response overdue — a 5-point penalty has been applied for not responding within 7 working days.</>
          : isOverdue
          ? <>Response overdue — a 5-point penalty will be applied shortly.</>
          : <>Respond within {daysLeft} more working day{daysLeft !== 1 ? "s" : ""}, or a 5-point penalty will apply.</>}
      </div>

      {!declining ? (
        <div className="flex gap-2">
          <button onClick={handleAcknowledge} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-rag-green text-white hover:opacity-90 font-medium transition-opacity">
            <ThumbsUp className="size-3.5" /> Acknowledge
          </button>
          <button onClick={() => setDeclining(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-rag-red/30 text-rag-red hover:bg-rag-red/10 transition-colors">
            <ThumbsDown className="size-3.5" /> Decline
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-rag-red/25 bg-rag-red/5 p-3 animate-in slide-in-from-top-1 duration-150">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-rag-red">Reason or counter-suggestion (required)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Why doesn't this fit, or what would you suggest instead?"
            className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleDecline} disabled={!reason.trim()} className="text-xs px-3 py-1.5 rounded-md bg-rag-red text-white hover:opacity-90 disabled:opacity-40 font-medium transition-opacity">
              Submit Decline
            </button>
            <button onClick={() => { setDeclining(false); setReason(""); }} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// A HOD/direct leave supervisor's recommended *performance* goal — distinct from an Objective/KR
// appointment. Accepting only publishes it to this read-only list; it never appoints the member as
// an owner of whatever `linkedTo` references (linkage is shown for context only).
function RecommendedPerfGoalCard({ rec, memberId, departmentGoals }: { rec: PerfGoalRecommendation; memberId: string; departmentGoals: DeptGoal[] }) {
  const { acknowledgePerfGoalRec, declinePerfGoalRec } = useApp();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const daysElapsed = workingDaysSince(rec.recommendedDate);
  const daysLeft = 7 - daysElapsed;
  const isOverdue = daysElapsed >= 7;
  const linkedLabel = rec.linkedTo ? flattenOkrOptions(departmentGoals).find(o => o.id === rec.linkedTo)?.label : undefined;

  const handleAcknowledge = () => {
    acknowledgePerfGoalRec(memberId, rec.id);
    toast.success(`"${rec.title}" added to your performance goals`);
  };

  const handleDecline = () => {
    if (!reason.trim()) return;
    declinePerfGoalRec(memberId, rec.id, reason.trim());
    toast.success("Recommendation declined — your response has been shared");
  };

  return (
    <Card className="space-y-3 border-dashed border-primary/40 bg-primary/5">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-primary shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Recommended for you</span>
      </div>
      <div>
        <div className="font-medium">{rec.title}</div>
        {rec.description && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{rec.description}</p>}
        <div className="text-xs text-muted-foreground mt-1.5">
          Recommended by <span className="font-medium text-foreground/80">{rec.recommendedBy}</span>
          {rec.dueDate && <> · Due {formatDueDate(rec.dueDate)}</>}
        </div>
        {linkedLabel && (
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <ChevronRight className="size-3" /> Linked to: <span className="font-medium text-foreground/80">{linkedLabel}</span>
          </div>
        )}
      </div>

      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
        isOverdue ? "bg-rag-red/10 text-rag-red border border-rag-red/25" : "bg-muted/50 text-muted-foreground"
      )}>
        <Clock className="size-3.5 shrink-0" />
        {rec.penaltyApplied
          ? <>Response overdue — a 5-point penalty has been applied for not responding within 7 working days.</>
          : isOverdue
          ? <>Response overdue — a 5-point penalty will be applied shortly.</>
          : <>Respond within {daysLeft} more working day{daysLeft !== 1 ? "s" : ""}, or a 5-point penalty will apply.</>}
      </div>

      {!declining ? (
        <div className="flex gap-2">
          <button onClick={handleAcknowledge} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-rag-green text-white hover:opacity-90 font-medium transition-opacity">
            <ThumbsUp className="size-3.5" /> Acknowledge
          </button>
          <button onClick={() => setDeclining(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-rag-red/30 text-rag-red hover:bg-rag-red/10 transition-colors">
            <ThumbsDown className="size-3.5" /> Decline
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-rag-red/25 bg-rag-red/5 p-3 animate-in slide-in-from-top-1 duration-150">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-rag-red">Reason or counter-suggestion (required)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Why doesn't this fit, or what would you suggest instead?"
            className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleDecline} disabled={!reason.trim()} className="text-xs px-3 py-1.5 rounded-md bg-rag-red text-white hover:opacity-90 disabled:opacity-40 font-medium transition-opacity">
              Submit Decline
            </button>
            <button onClick={() => { setDeclining(false); setReason(""); }} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// A performance goal recommendation the member has already acknowledged — a lightweight, read-only
// reference card (not an Objective/KR the member owns, just a suggestion they accepted).
function AcknowledgedPerfGoalCard({ rec, departmentGoals }: { rec: PerfGoalRecommendation; departmentGoals: DeptGoal[] }) {
  const linkedLabel = rec.linkedTo ? flattenOkrOptions(departmentGoals).find(o => o.id === rec.linkedTo)?.label : undefined;
  return (
    <Card className="space-y-1.5 border-border/60">
      <div className="flex items-center gap-2">
        <Target className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recommended Goal</span>
      </div>
      <div className="font-medium text-sm">{rec.title}</div>
      {rec.description && <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>}
      <div className="text-xs text-muted-foreground">
        Recommended by <span className="font-medium text-foreground/80">{rec.recommendedBy}</span>
        {rec.dueDate && <> · Due {formatDueDate(rec.dueDate)}</>}
      </div>
      {linkedLabel && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ChevronRight className="size-3" /> Linked to: <span className="font-medium text-foreground/80">{linkedLabel}</span>
        </div>
      )}
    </Card>
  );
}

// ── Performance goal card — a Key Result owned by this member, linked to a department/team
// Objective. Replaces the old individually-created Goal cards; every performance goal is now a
// Key Result assigned by the HOD, not self-proposed. ────────────────────────────────────────────

function MyKeyResultCard({ kr, objective, isOps, viewerName }: { kr: KeyResult; objective: DeptGoal; isOps: boolean; viewerName: string }) {
  const {
    updateKeyResultConfidence, submitKeyResultScore, acknowledgeOkrItem, proposeOkrCounter, agreeCoOwnerConfidence, agreeCoOwnerScore, focusObjective,
    respondToChallengeRemark, acknowledgeChallengeResponse, respondToScoreRemark, acknowledgeScoreResponse,
  } = useApp();
  const [ackChecked, setAckChecked] = useState(false);
  const [countering, setCountering] = useState(false);
  const [counterTitle, setCounterTitle] = useState("");
  const [counterDueDate, setCounterDueDate] = useState("");
  const [scoreDraft, setScoreDraft] = useState(kr.score !== undefined ? String(kr.score) : "");
  const [requestingMod, setRequestingMod] = useState(false);
  const [modTitle, setModTitle] = useState("");
  const [modDueDate, setModDueDate] = useState("");
  // Same mandatory-challenge-on-red/amber pattern as TeamSection's KeyResultRow — this is the other
  // place a KR owner can submit their own monthly confidence, so it needs the same gate or the
  // requirement would be trivially bypassable by using My Goals instead of Team OKRs.
  const [pendingConfidenceChoice, setPendingConfidenceChoice] = useState<RAG | null>(null);
  const [challengeDraft, setChallengeDraft] = useState("");
  const [respondingToChallenge, setRespondingToChallenge] = useState(false);
  const [challengeResponseDraft, setChallengeResponseDraft] = useState("");
  const [draftingAiResponse, setDraftingAiResponse] = useState(false);
  const [aiDraftUsed, setAiDraftUsed] = useState(false);
  // Same pattern again, for a below-green (<0.7) Quarterly Score submission instead of confidence.
  const [pendingScoreValue, setPendingScoreValue] = useState<number | null>(null);
  const [scoreRemarkDraft, setScoreRemarkDraft] = useState("");
  const [respondingToScoreRemark, setRespondingToScoreRemark] = useState(false);
  const [scoreResponseDraft, setScoreResponseDraft] = useState("");
  const [draftingAiScoreResponse, setDraftingAiScoreResponse] = useState(false);
  const [aiScoreDraftUsed, setAiScoreDraftUsed] = useState(false);
  const objKeyResults = objective.keyResults ?? [];
  const isPendingForViewer = isPendingAckFor(kr, viewerName);
  const coOwnerConfPending = kr.pendingCoOwnerConfidence;
  const coOwnerScorePending = kr.pendingCoOwnerScore;
  const iAmConfProposer = coOwnerConfPending?.proposedBy === viewerName;
  const iAmScoreProposer = coOwnerScorePending?.proposedBy === viewerName;
  const otherOwners = ownerNames(kr.owner).filter(n => n !== viewerName).join(", ");
  const overdue = isKrOverdue(kr);
  const owesChallengeResponse = (kr.pendingChallengeResponseFor ?? []).includes(viewerName);
  const owesChallengeAck = !!kr.pendingChallengeAckByOwner;
  const owesScoreResponse = (kr.pendingScoreResponseFor ?? []).includes(viewerName);
  const owesScoreAck = !!kr.pendingScoreAckByOwner;
  const hasActionNeeded = owesChallengeResponse || owesChallengeAck || owesScoreResponse || owesScoreAck;

  const handleConfidenceChange = (value: RAG) => {
    if (value === "green") {
      updateKeyResultConfidence(objective.id, kr.id, value, viewerName, isOps);
      toast.success(ownerNames(kr.owner).length > 1 ? "Confidence proposed — your co-owner will be asked to agree or counter" : "Confidence updated — you can request a modification below if needed");
      return;
    }
    setPendingConfidenceChoice(value);
    setChallengeDraft("");
  };
  const submitPendingConfidence = () => {
    if (!pendingConfidenceChoice) return;
    if (!challengeDraft.trim()) { toast.error("Share a quick note on the challenge or bottleneck before submitting"); return; }
    updateKeyResultConfidence(objective.id, kr.id, pendingConfidenceChoice, viewerName, isOps, challengeDraft.trim());
    toast.success(ownerNames(kr.owner).length > 1 ? "Confidence proposed and challenge shared — your co-owner will be asked to agree or counter" : "Confidence updated — your HOD and objective owner have been notified");
    setPendingConfidenceChoice(null);
    setChallengeDraft("");
  };
  const draftAiChallengeResponse = async () => {
    if (!kr.challengeRemark) return;
    setDraftingAiResponse(true);
    const draft = await getAiProvider().draftChallengeResponse({
      remarkText: kr.challengeRemark.text, urgency: kr.challengeRemark.rag, kind: "confidence",
    });
    setChallengeResponseDraft(draft);
    setAiDraftUsed(true);
    setDraftingAiResponse(false);
  };
  const handleScoreSubmit = (n: number) => {
    if (n >= 0.7) {
      submitKeyResultScore(objective.id, kr.id, n, viewerName, isOps);
      toast.success(ownerNames(kr.owner).length > 1 ? "Score proposed — your co-owner will be asked to agree or counter" : "Key result scored");
      setPendingScoreValue(null);
      setScoreRemarkDraft("");
      return;
    }
    setPendingScoreValue(n);
    setScoreRemarkDraft("");
  };
  const submitPendingScore = () => {
    if (pendingScoreValue === null) return;
    if (!scoreRemarkDraft.trim()) { toast.error("Add a rationale — challenges, bottlenecks, or support needed — before submitting"); return; }
    submitKeyResultScore(objective.id, kr.id, pendingScoreValue, viewerName, isOps, scoreRemarkDraft.trim());
    toast.success(ownerNames(kr.owner).length > 1 ? "Score proposed and rationale shared — your co-owner will be asked to agree or counter" : "Score submitted — your HOD and objective owner have been notified");
    setPendingScoreValue(null);
    setScoreRemarkDraft("");
  };
  const draftAiScoreResponse = async () => {
    if (!kr.scoreRemark) return;
    setDraftingAiScoreResponse(true);
    const draft = await getAiProvider().draftChallengeResponse({
      remarkText: kr.scoreRemark.text, urgency: "green", kind: "score", score: kr.scoreRemark.score,
    });
    setScoreResponseDraft(draft);
    setAiScoreDraftUsed(true);
    setDraftingAiScoreResponse(false);
  };

  return (
    <Card className={cn(
      "space-y-4",
      isPendingForViewer ? "border-amber-300/60 bg-amber-50/30 dark:bg-amber-900/10"
        : hasActionNeeded ? "border-amber-400/70 bg-amber-50/60 dark:bg-amber-900/15 ring-1 ring-amber-300/60 dark:ring-amber-700/40"
        : overdue ? "border-rag-red/50 bg-rag-red/5 dark:bg-rag-red/10" : undefined
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Same prominent-badge treatment as MyObjectiveCard — "Department Key Result ·
              You're an owner" instead of a generic "Key Result — contributes to…" line, so the two
              card types read consistently and it's equally obvious what you own either way. */}
          <span className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border",
            objective.level === "team" ? "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/25" : "text-primary bg-primary/10 border-primary/25"
          )}>
            <UserCircle2 className="size-3 shrink-0" />
            {objective.level === "team" && objective.teamName ? `${objective.teamName} Key Result` : "Department Key Result"} · You're an owner
          </span>
          <div className="font-medium text-base leading-snug mt-1.5">{kr.title}</div>
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <button
              onClick={() => focusObjective(objective.id, false)}
              title="Go to this objective on the Team OKRs page"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              <Target className="size-3 shrink-0" />
              Contributes to: {objective.title}
            </button>
            <button
              onClick={() => focusObjective(objective.id, true)}
              title="View this objective's full list of key results on the Team OKRs page"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/8 border border-violet-500/20 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-500/15 transition-colors"
            >
              <ListChecks className="size-3 shrink-0" />
              View all Key Results ({objKeyResults.length})
            </button>
          </div>
          {kr.dueDate && <div className={cn("text-xs mt-1.5", overdue ? "text-rag-red font-semibold" : "text-muted-foreground")}>Due {formatDueDate(kr.dueDate)}{overdue && " — overdue"}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Confidence</span>
            <RagPill rag={kr.ragConfidence} />
          </div>
          {kr.score !== undefined && !isKrScoreStaleForDisplay(kr) && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Score</span>
              <span className={cn("text-xs font-semibold text-foreground rounded px-1", isPendingForViewer && kr.pendingChangeType === "hodScore" && "ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/20")}>
                {kr.score.toFixed(1)}
              </span>
              {isKrScoreFromPastQuarter(kr) && (
                <span className="text-[8px] font-medium text-muted-foreground whitespace-nowrap">{kr.scoreQuarter} (past quarter)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ack-or-counterpropose */}
      {isPendingForViewer && !kr.counterProposal && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 p-3 space-y-2">
          <div className="text-xs text-amber-800 dark:text-amber-300">
            {kr.pendingChangeType === "hodScore"
              ? <>Your HOD set the quarterly score to <strong>{kr.score?.toFixed(1)}</strong>. Please review and acknowledge.</>
              : kr.pendingChangeType === "hodEdit"
              ? <>Your HOD updated this key result. Please review and acknowledge.</>
              : <>You've been appointed owner of this key result. Guidelines: update your RAG confidence by {formatMonthlyConfidenceDueDate()} every month, and score it by {formatEffectiveKrScoreDueDate(kr)}.</>}
          </div>
          {kr.lastCounterRejection && (
            <div className="text-xs text-rag-red/90 bg-rag-red/5 border border-rag-red/20 rounded-md px-2 py-1.5">
              Your counterproposal was declined{kr.lastCounterRejection.reason ? <>: "{kr.lastCounterRejection.reason}"</> : "."} You can re-acknowledge the original appointment above, or counterpropose again.
            </div>
          )}
          {!countering ? (
            <>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} className="rounded" />
                I acknowledge these guidelines
              </label>
              <div className="flex gap-2">
                <button
                  disabled={!ackChecked}
                  onClick={() => { acknowledgeOkrItem(objective.id, kr.id, viewerName, isOps); toast.success("Appointment acknowledged"); }}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Accept Appointment
                </button>
                <button onClick={() => setCountering(true)} className="px-3 py-1.5 rounded-md border border-border text-xs">Counterpropose</button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Suggest alternative wording (optional)</label>
                <input
                  value={counterTitle}
                  onChange={e => setCounterTitle(e.target.value)}
                  className="w-full text-sm rounded-lg border border-input bg-background px-3 py-1.5"
                  placeholder="Suggest an alternative key result…"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Suggest alternative due date (optional)</label>
                <input type="date" value={counterDueDate} onChange={e => setCounterDueDate(e.target.value)} className="text-sm rounded-lg border border-input bg-background px-3 py-1.5" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!counterTitle.trim() && !counterDueDate) { toast.error("Suggest a different title, a different due date, or both"); return; }
                    proposeOkrCounter(objective.id, kr.id, { title: counterTitle.trim() || undefined, dueDate: counterDueDate || undefined }, isOps, viewerName);
                    setCountering(false);
                    toast.success("Counterproposal sent to your HOD for review");
                  }}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Submit Counterproposal
                </button>
                <button onClick={() => setCountering(false)} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {kr.counterProposal && (
        <div className="rounded-lg border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-3 text-xs text-violet-800 dark:text-violet-300">
          Your proposal{kr.counterProposal.title && <> — title "{kr.counterProposal.title}"</>}{kr.counterProposal.dueDate && <> — due date {new Date(kr.counterProposal.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</>} is awaiting your HOD's review.
        </div>
      )}

      {/* Challenge thread — the mandatory red/amber remark you shared, and your HOD's/objective
          owner's response (manual or Work Buddy AI-drafted), which you need to acknowledge. */}
      {kr.challengeRemark && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-700/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <RagDot rag={kr.challengeRemark.rag} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">Your Challenge · {kr.challengeRemark.date}</span>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">&ldquo;{kr.challengeRemark.text}&rdquo;</p>
          {kr.challengeResponse && (
            <div className="rounded-md border border-primary/25 bg-primary/5 p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                {kr.challengeResponse.respondedBy}'s response{kr.challengeResponse.isAI && <span className="normal-case font-medium text-muted-foreground">(Work Buddy AI-assisted)</span>}
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed">{kr.challengeResponse.text}</p>
            </div>
          )}
          {owesChallengeAck && (
            <button
              onClick={() => { acknowledgeChallengeResponse(objective.id, kr.id, isOps); toast.success("Acknowledged"); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold"
            >
              <ActionNeededIcon size={13} title="Acknowledge" /> Acknowledge This Response
            </button>
          )}
          {owesChallengeResponse && (
            respondingToChallenge ? (
              <div className="space-y-1.5">
                <textarea
                  value={challengeResponseDraft}
                  onChange={e => setChallengeResponseDraft(e.target.value)}
                  rows={3}
                  placeholder="Share an action plan or resources to help unblock this…"
                  className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => void draftAiChallengeResponse()}
                    disabled={draftingAiResponse}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium disabled:opacity-50"
                  >
                    {draftingAiResponse ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    Ask Work Buddy AI to help draft this
                  </button>
                  <button
                    onClick={() => {
                      if (!challengeResponseDraft.trim()) { toast.error("Add a response before sending"); return; }
                      respondToChallengeRemark(objective.id, kr.id, challengeResponseDraft.trim(), viewerName, isOps, aiDraftUsed);
                      toast.success(`${kr.owner.split(",")[0].trim()} will be notified to acknowledge`);
                      setRespondingToChallenge(false);
                      setChallengeResponseDraft("");
                      setAiDraftUsed(false);
                    }}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                  >
                    Send Response
                  </button>
                  <button onClick={() => { setRespondingToChallenge(false); setChallengeResponseDraft(""); setAiDraftUsed(false); }} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setRespondingToChallenge(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold"
              >
                <ActionNeededIcon size={13} title="Respond" /> Respond to This Challenge
              </button>
            )
          )}
        </div>
      )}

      {/* Score-remark thread — same shape as the challenge thread above, for a below-green (<0.7)
          Quarterly Score's mandatory rationale instead of a red/amber Monthly Confidence. */}
      {kr.scoreRemark && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-700/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <RagDot rag={scoreToRag(kr.scoreRemark.score)} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">Your Score Rationale ({kr.scoreRemark.score.toFixed(1)}) · {kr.scoreRemark.date}</span>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">&ldquo;{kr.scoreRemark.text}&rdquo;</p>
          {kr.scoreResponse && (
            <div className="rounded-md border border-primary/25 bg-primary/5 p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                {kr.scoreResponse.respondedBy}'s response{kr.scoreResponse.isAI && <span className="normal-case font-medium text-muted-foreground">(Work Buddy AI-assisted)</span>}
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed">{kr.scoreResponse.text}</p>
            </div>
          )}
          {owesScoreAck && (
            <button
              onClick={() => { acknowledgeScoreResponse(objective.id, kr.id, isOps); toast.success("Acknowledged"); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold"
            >
              <ActionNeededIcon size={13} title="Acknowledge" /> Acknowledge This Response
            </button>
          )}
          {owesScoreResponse && (
            respondingToScoreRemark ? (
              <div className="space-y-1.5">
                <textarea
                  value={scoreResponseDraft}
                  onChange={e => setScoreResponseDraft(e.target.value)}
                  rows={3}
                  placeholder="Share an action plan or resources to help close the gap next quarter…"
                  className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => void draftAiScoreResponse()}
                    disabled={draftingAiScoreResponse}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium disabled:opacity-50"
                  >
                    {draftingAiScoreResponse ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    Ask Work Buddy AI to help draft this
                  </button>
                  <button
                    onClick={() => {
                      if (!scoreResponseDraft.trim()) { toast.error("Add a response before sending"); return; }
                      respondToScoreRemark(objective.id, kr.id, scoreResponseDraft.trim(), viewerName, isOps, aiScoreDraftUsed);
                      toast.success(`${kr.owner.split(",")[0].trim()} will be notified to acknowledge`);
                      setRespondingToScoreRemark(false);
                      setScoreResponseDraft("");
                      setAiScoreDraftUsed(false);
                    }}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                  >
                    Send Response
                  </button>
                  <button onClick={() => { setRespondingToScoreRemark(false); setScoreResponseDraft(""); setAiScoreDraftUsed(false); }} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setRespondingToScoreRemark(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold"
              >
                <ActionNeededIcon size={13} title="Respond" /> Respond to This Rationale
              </button>
            )
          )}
        </div>
      )}

      {/* Monthly confidence + quarterly score */}
      {!isPendingForViewer && (
        <div className="space-y-2 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium text-foreground/70 shrink-0">Monthly Confidence</label>
            {coOwnerConfPending ? (
              iAmConfProposer ? (
                <span className="text-xs text-muted-foreground italic">You proposed {coOwnerConfPending.rag} — awaiting {otherOwners || "your co-owner"} to respond</span>
              ) : (
                <div className="w-full rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-2 space-y-1.5">
                  <div className="text-xs text-violet-800 dark:text-violet-300">{coOwnerConfPending.proposedBy} proposed confidence: <strong>{coOwnerConfPending.rag}</strong> — agree or suggest a different value.</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => { agreeCoOwnerConfidence(objective.id, kr.id, isOps); toast.success("Confidence finalized"); }} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Agree</button>
                    <select
                      defaultValue=""
                      onChange={e => { if (!e.target.value) return; handleConfidenceChange(e.target.value as RAG); }}
                      className="text-xs rounded-md border border-input bg-background px-2 py-1"
                    >
                      <option value="" disabled>Suggest a different value…</option>
                      <option value="green">Green — 0.7–1.0, on track</option>
                      <option value="amber">Amber — 0.4–0.6, at risk</option>
                      <option value="red">Red — below 0.4, off track</option>
                    </select>
                  </div>
                </div>
              )
            ) : (
              <>
                <RagDot rag={kr.ragConfidence} pulse />
                <select
                  value={kr.ragConfidence}
                  onChange={e => handleConfidenceChange(e.target.value as RAG)}
                  className="text-xs rounded-md border border-input bg-background px-2 py-1"
                >
                  <option value="green">Green — 0.7–1.0, on track</option>
                  <option value="amber">Amber — 0.4–0.6, at risk</option>
                  <option value="red">Red — below 0.4, off track</option>
                </select>
                <span className="text-[10px] text-muted-foreground">Due by {formatMonthlyConfidenceDueDate()} — no penalty for missing this, it's a soft cadence</span>
              </>
            )}
          </div>
          {pendingConfidenceChoice && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/15 dark:border-amber-700/40 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                <ActionNeededIcon size={14} title="Feedback required" />
                {pendingConfidenceChoice === "red" ? "Red" : "Amber"} confidence needs a quick note
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                What's the key challenge or bottleneck here? This goes straight to your HOD and the objective owner so they can help.
              </p>
              <textarea
                autoFocus
                value={challengeDraft}
                onChange={e => setChallengeDraft(e.target.value)}
                rows={2}
                placeholder="e.g. Waiting on legal sign-off before we can proceed…"
                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
              />
              <div className="flex gap-1.5">
                <button onClick={submitPendingConfidence} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium">Submit</button>
                <button onClick={() => { setPendingConfidenceChoice(null); setChallengeDraft(""); }} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium text-foreground/70 shrink-0">Quarterly OKR Score</label>
            {coOwnerScorePending ? (
              iAmScoreProposer ? (
                <span className="text-xs text-muted-foreground italic">You proposed {coOwnerScorePending.score.toFixed(1)} — awaiting {otherOwners || "your co-owner"} to respond</span>
              ) : (
                <div className="w-full rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-2 space-y-1.5">
                  <div className="text-xs text-violet-800 dark:text-violet-300">{coOwnerScorePending.proposedBy} proposed a score of <strong>{coOwnerScorePending.score.toFixed(1)}</strong> — agree or suggest a different value.</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => { agreeCoOwnerScore(objective.id, kr.id, isOps); toast.success("Score finalized"); }} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Agree</button>
                    <input type="number" min={0} max={1} step={0.1} value={scoreDraft} onChange={e => setScoreDraft(stripLeadingZero(clampScoreDecimal(e.target.value)))} placeholder="Different score 0.0–1.0" className="w-28 text-xs rounded-md border border-input bg-background px-2 py-1" />
                    <button
                      onClick={() => {
                        const n = roundToOneDecimal(Number(scoreDraft));
                        if (Number.isNaN(n) || n < 0 || n > 1) { toast.error("Score must be between 0.0 and 1.0, to 1 decimal place"); return; }
                        handleScoreSubmit(n);
                      }}
                      className="px-2 py-1 rounded-md border border-border text-xs"
                    >
                      Suggest
                    </button>
                  </div>
                </div>
              )
            ) : kr.score === undefined ? (
              <>
                <input
                  type="number" min={0} max={1} step={0.1}
                  value={scoreDraft}
                  onChange={e => setScoreDraft(stripLeadingZero(clampScoreDecimal(e.target.value)))}
                  placeholder="0.0–1.0"
                  className="w-24 text-xs rounded-md border border-input bg-background px-2 py-1"
                />
                <button
                  onClick={() => {
                    const n = roundToOneDecimal(Number(scoreDraft));
                    if (Number.isNaN(n) || n < 0 || n > 1) { toast.error("Score must be between 0.0 and 1.0, to 1 decimal place"); return; }
                    handleScoreSubmit(n);
                  }}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Submit Score
                </button>
                <span className={cn("text-[10px]", overdue ? "text-rag-red font-semibold" : "text-muted-foreground")}>Due by {formatEffectiveKrScoreDueDate(kr)}, or a 15-point penalty applies</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Scored {kr.score.toFixed(1)} {kr.scoreSubmittedDate ? `on ${kr.scoreSubmittedDate}` : ""}</span>
            )}
          </div>
          {/* Mandatory rationale — a below-green (<0.7) score doesn't write until this is filled in. */}
          {pendingScoreValue !== null && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/15 dark:border-amber-700/40 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                <ActionNeededIcon size={14} title="Rationale required" />
                A score of {pendingScoreValue.toFixed(1)} needs a quick rationale
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                What's behind this score — challenges, bottlenecks, or support that would help close the gap? This goes straight to your HOD and the objective owner.
              </p>
              <textarea
                autoFocus
                value={scoreRemarkDraft}
                onChange={e => setScoreRemarkDraft(e.target.value)}
                rows={2}
                placeholder="e.g. Vendor onboarding took 6 weeks longer than planned…"
                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
              />
              <div className="flex gap-1.5">
                <button onClick={submitPendingScore} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium">Submit</button>
                <button onClick={() => { setPendingScoreValue(null); setScoreRemarkDraft(""); }} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Confidence is a forward-looking pulse-check updated monthly (no penalty for missing it); scoring is the retrospective grade on the same 0.0–1.0 scale, submitted once per quarter (penalized if missed) — the two complement each other rather than duplicate. See the Confidence &amp; Scoring Guide above for the full scale.
          </p>
          {!kr.counterProposal && (
            !requestingMod ? (
              <button onClick={() => setRequestingMod(true)} className="text-xs text-primary font-medium">Request Modification</button>
            ) : (
              <div className="space-y-2">
                <input
                  value={modTitle}
                  onChange={e => setModTitle(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
                  placeholder="Suggested description, timeline, or expected result…"
                />
                <input type="date" value={modDueDate} onChange={e => setModDueDate(e.target.value)} className="text-xs rounded-md border border-input bg-background px-2 py-1.5" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!modTitle.trim() && !modDueDate) { toast.error("Suggest a different description, a different due date, or both"); return; }
                      proposeOkrCounter(objective.id, kr.id, { title: modTitle.trim() || undefined, dueDate: modDueDate || undefined }, isOps, viewerName);
                      setRequestingMod(false);
                      toast.success("Modification request sent to your HOD for approval");
                    }}
                    className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                  >
                    Send
                  </button>
                  <button onClick={() => setRequestingMod(false)} className="px-2.5 py-1.5 rounded-md border border-border text-xs">Cancel</button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Card>
  );
}

// Owners of an entire Objective (not just one of its Key Results) see it as its own goal card here
// — a read-only summary (confidence/score are derived roll-ups of the Objective's Key Results, the
// same values shown on the Team OKRs page; there's no separately-editable Objective-level RAG/score
// field anywhere else in the app, so this doesn't invent one). "View all Key Results" navigates to
// the Team OKRs page and expands them there, rather than duplicating that list inline here.
function MyObjectiveCard({ objective, allDeptGoals }: { objective: DeptGoal; allDeptGoals: DeptGoal[] }) {
  const { focusObjective } = useApp();
  const keyResults = objective.keyResults ?? [];
  const score = objectiveScore(objective);
  const confidence = keyResults.length > 0 ? objectiveConfidence(objective) : null;
  // A team-level Objective can itself contribute to a department-level one — surface that linkage
  // the same way MyKeyResultCard surfaces a Key Result's parent Objective.
  const linkedToLabel = objective.level === "team" && objective.linkedTo
    ? flattenOkrOptions(allDeptGoals.filter(g => g.level !== "team")).find(o => o.id === objective.linkedTo)?.label
    : undefined;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* One prominent badge instead of a title-style label plus a separate small clarifying
              line underneath it — "Department Objective · You're an owner" says everything the two
              lines used to (that it's a whole Objective, which OKR set it's under, and that you own
              it outright) without needing both. */}
          <span className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border",
            objective.level === "team" ? "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/25" : "text-primary bg-primary/10 border-primary/25"
          )}>
            <UserCircle2 className="size-3 shrink-0" />
            {objective.level === "team" && objective.teamName ? `${objective.teamName} Objective` : "Department Objective"} · You're an owner
          </span>
          <div className="font-medium text-base leading-snug mt-1.5">{objective.title}</div>
          {objective.description && <p className="text-xs text-muted-foreground mt-1">{objective.description}</p>}
          {objective.dueDate && <div className="text-xs text-muted-foreground mt-1.5">Due {formatDueDate(objective.dueDate)}</div>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Confidence</span>
            {confidence ? <RagPill rag={confidence} /> : <span className="text-[10px] text-muted-foreground">No key results</span>}
          </div>
          {score !== undefined && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Score</span>
              <span className="text-xs font-semibold text-primary">{score.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/60">
        {linkedToLabel && (
          <button
            onClick={() => focusObjective(objective.linkedTo!, false)}
            title="Go to the objective this contributes to, on the Team OKRs page"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <Target className="size-3 shrink-0" />
            Contributes to: {linkedToLabel}
          </button>
        )}
        <button
          onClick={() => focusObjective(objective.id, true)}
          title="View this objective's full list of key results on the Team OKRs page"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/8 border border-violet-500/20 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-500/15 transition-colors"
        >
          <ListChecks className="size-3 shrink-0" />
          View all Key Results ({keyResults.length})
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
    managerInputs, opsMeta, awardMemberPoints,
    focusedGoalId, setFocusedGoalId,
    pendingDevGoalRecs, departmentGoals, opsDepartmentGoals,
    pendingPerfGoalRecs, acknowledgedPerfGoalRecs, skills, setSection,
  } = useApp();
  const [showRagInfo, setShowRagInfo] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);

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

  // Searches both HCWM's and Credit Risk Management's goal sets, not just this persona's own
  // department — ownership can legitimately be cross-department (e.g. a HOD appointing someone from
  // another department as a co-owner), and this member must see every goal they actually own
  // regardless of which department it structurally lives in.
  const memberOwnedObjectives = objectivesOwnedBy(staffMember.name, departmentGoals, opsDepartmentGoals);
  const ownedObjectiveIds = new Set(memberOwnedObjectives.map(o => o.id));
  // Exclude KRs that belong to an Objective the member already owns wholesale — that Objective's
  // own card already lists every one of its Key Results, so showing the KR again as a separate
  // top-level card would just duplicate it.
  const memberKeyResults = keyResultsOwnedBy(staffMember.name, departmentGoals, opsDepartmentGoals)
    .filter(({ objective }) => !ownedObjectiveIds.has(objective.id));
  const totalPerformanceGoals = memberOwnedObjectives.length + memberKeyResults.length;
  const memberPendingPerfRecs = pendingPerfGoalRecs[currentMemberId] ?? [];
  const memberAcknowledgedPerfRecs = acknowledgedPerfGoalRecs[currentMemberId] ?? [];

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
            Confidence &amp; Scoring Guide
          </button>
        </div>

        {/* Stats strip */}
        <div className="bg-muted/40 border-b border-border px-6 py-3 flex items-center gap-6 text-xs text-muted-foreground">
          <div><span className="font-semibold text-foreground">{totalPerformanceGoals}</span> performance goals</div>
          <div className="w-px h-3 bg-border" />
          <div><span className="font-semibold text-foreground">{memberKeyResults.filter(({ kr }) => isPendingAckFor(kr, staffMember.name)).length}</span> awaiting acknowledgement</div>
          <div className="w-px h-3 bg-border" />
          <div><span className="font-semibold text-foreground">{currentDevGoals.length}</span> development goals</div>
        </div>
      </div>

      {showRagInfo && <RAGInfoPanel onClose={() => setShowRagInfo(false)} />}

      <GrowSection
        pendingSkills={(opsMeta ? opsMeta.skills.pending : skills.pending)}
        onViewOpportunities={() => setSection("skills")}
      />

      {/* Performance Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MascotFlourish src="/mascot/exercising.png" className="h-11 w-auto shrink-0" />
            <div>
              <h3 className="font-display text-xl">Performance Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({totalPerformanceGoals})</span>
              </h3>
              <p className="text-xs text-muted-foreground">Every performance goal is an Objective or Key Result assigned by your HOD, linked to a department or team OKR</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Monthly RAG confidence is due by {formatMonthlyConfidenceDueDate()} · scoring is due by {formatGoalStatusDueDate()}.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {memberPendingPerfRecs.map(rec => (
            <RecommendedPerfGoalCard key={rec.id} rec={rec} memberId={currentMemberId} departmentGoals={departmentGoals} />
          ))}
          {totalPerformanceGoals === 0 && memberPendingPerfRecs.length === 0 && memberAcknowledgedPerfRecs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-rag-red/30 bg-rag-red/5 px-6 py-10 text-center text-sm text-muted-foreground">
              No goals assigned yet. Your HOD appoints owners on department and team OKRs — new joiners should have at least 3 within 30 days.
            </div>
          )}
          {memberOwnedObjectives.map(objective => (
            <div key={objective.id} data-goal-id={objective.id}>
              <MyObjectiveCard objective={objective} allDeptGoals={departmentGoals} />
            </div>
          ))}
          {memberKeyResults.map(({ kr, objective }) => (
            <div
              key={kr.id}
              data-goal-id={kr.id}
              className={cn(
                "rounded-xl transition-all duration-500",
                localHighlightId === kr.id && "ring-2 ring-primary/50 ring-offset-2 shadow-lg"
              )}
            >
              <MyKeyResultCard kr={kr} objective={objective} isOps={!!opsMeta} viewerName={staffMember.name} />
            </div>
          ))}
          {memberAcknowledgedPerfRecs.map(rec => (
            <AcknowledgedPerfGoalCard key={rec.id} rec={rec} departmentGoals={departmentGoals} />
          ))}
        </div>
      </div>

      {/* Development Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MascotFlourish src="/mascot/confident-smile.png" className="h-11 w-auto shrink-0" />
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
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-amber text-amber-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-opacity font-medium"
          >
            <Plus className="size-3.5" /> Add Goal
          </button>
        </div>
        <div className="space-y-4">
          {(pendingDevGoalRecs[currentMemberId] ?? []).map((rec) => (
            <RecommendedDevGoalCard key={rec.id} rec={rec} memberId={currentMemberId} />
          ))}
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
              onAdd={(g) => {
                const isFirstDevGoal = currentDevGoals.length === 0;
                upsertDevGoal(g);
                setAddingGoal(false);
                if (isFirstDevGoal) awardMemberPoints(currentMemberId, 10);
                const msg = `Development goal set${isFirstDevGoal ? " · +10 pts" : ""}`;
                if (isFirstDevGoal) pointsToast(msg); else toast.success(msg);
              }}
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

  const linkedDeptName = resolveLinkedTitle(goal.linkedDept, departmentGoals);
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
  const {
    currentUser, managerDevGoals, upsertManagerDevGoal, deleteManagerDevGoal, opsMeta, awardMemberPoints, departmentGoals, opsDepartmentGoals,
    pendingPerfGoalRecs, acknowledgedPerfGoalRecs,
  } = useApp();
  const [showRagInfo, setShowRagInfo] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);

  const viewerName = opsMeta ? opsMeta.user.name : currentUser.name;
  // Both goal sets, not just this persona's own department — see the equivalent comment on
  // StaffGoalsView above for why cross-department ownership needs to search both.
  const memberOwnedObjectives = objectivesOwnedBy(viewerName, departmentGoals, opsDepartmentGoals);
  const ownedObjectiveIds = new Set(memberOwnedObjectives.map(o => o.id));
  const memberKeyResults = keyResultsOwnedBy(viewerName, departmentGoals, opsDepartmentGoals)
    .filter(({ objective }) => !ownedObjectiveIds.has(objective.id));
  const totalPerformanceGoals = memberOwnedObjectives.length + memberKeyResults.length;
  const activeDevGoals = opsMeta ? opsMeta.devGoals : managerDevGoals;
  const activeUpsertDevGoal = opsMeta ? opsMeta.upsertDevGoal : upsertManagerDevGoal;
  const activeDeleteDevGoal = opsMeta ? opsMeta.deleteDevGoal : deleteManagerDevGoal;
  const activeMemberId = opsMeta ? opsMeta.personaId : "u0";
  const memberPendingPerfRecs = pendingPerfGoalRecs[activeMemberId] ?? [];
  const memberAcknowledgedPerfRecs = acknowledgedPerfGoalRecs[activeMemberId] ?? [];

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
            Confidence &amp; Scoring Guide
          </button>
        </div>
        <div className="bg-muted/40 border-b border-border px-6 py-3 flex items-center gap-6 text-xs text-muted-foreground">
          <div><span className="font-semibold text-foreground">{totalPerformanceGoals}</span> performance goals</div>
          <div className="w-px h-3 bg-border" />
          <div><span className="font-semibold text-foreground">{activeDevGoals.length}</span> development goals</div>
        </div>
      </div>

      {showRagInfo && <RAGInfoPanel onClose={() => setShowRagInfo(false)} />}

      {/* Performance goals */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <MascotFlourish src="/mascot/exercising.png" className="h-11 w-auto shrink-0" />
            <div>
              <h3 className="font-display text-xl">Performance Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({totalPerformanceGoals})</span>
              </h3>
              <p className="text-xs text-muted-foreground">Every performance goal is an Objective or Key Result you own on a department or team OKR</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Monthly RAG confidence is due by {formatMonthlyConfidenceDueDate()} · scoring is due by {formatGoalStatusDueDate()}.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {memberPendingPerfRecs.map(rec => (
            <RecommendedPerfGoalCard key={rec.id} rec={rec} memberId={activeMemberId} departmentGoals={departmentGoals} />
          ))}
          {totalPerformanceGoals === 0 && memberPendingPerfRecs.length === 0 && memberAcknowledgedPerfRecs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              No goals owned yet.
            </div>
          )}
          {memberOwnedObjectives.map(objective => (
            <MyObjectiveCard key={objective.id} objective={objective} allDeptGoals={departmentGoals} />
          ))}
          {memberKeyResults.map(({ kr, objective }) => (
            <MyKeyResultCard key={kr.id} kr={kr} objective={objective} isOps={!!opsMeta} viewerName={viewerName} />
          ))}
          {memberAcknowledgedPerfRecs.map(rec => (
            <AcknowledgedPerfGoalCard key={rec.id} rec={rec} departmentGoals={departmentGoals} />
          ))}
        </div>
      </div>

      {/* Development goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MascotFlourish src="/mascot/confident-smile.png" className="h-11 w-auto shrink-0" />
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
              onAdd={(g) => {
                const isFirstDevGoal = activeDevGoals.length === 0;
                activeUpsertDevGoal(g);
                setAddingGoal(false);
                if (isFirstDevGoal) awardMemberPoints(activeMemberId, 10);
                toast.success(`Development goal set${isFirstDevGoal ? " · +10 pts" : ""}`);
              }}
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

// Directors are free to set their own development goals — reuses the same generic
// upsertTeamDevGoal/deleteTeamDevGoal map every HOD/leave-supervisor drawer already writes other
// people's dev goals into, just keyed by the director's own real id instead of a direct report's.
// Performance goals are deliberately not offered here: in this data model a "performance goal" is a
// Key Result owned under a real department Objective, and a director owns no department of their
// own to host one under — their real performance content is the departments they oversee, on the
// Team OKRs page, not a freestanding personal KR set.
// A director's own performance goals — each links directly to one existing OKR item org-wide (a
// 2026 Philly Group Key Result, or any department Objective/Key Result) rather than duplicating one,
// per the executive-cascading research finding (tie an executive's own goal straight to one
// enterprise Key Result, keep the cascade shallow). Kept to one compact row per goal — title, a
// single OKR-picker select, and a status chip — so this stays intuitive rather than a second OKR
// editor bolted onto My Goals.
function DirectorPerformanceGoalsSection({ personaId }: { personaId: string }) {
  const {
    directorPerformanceGoalsById, upsertDirectorPerformanceGoal, deleteDirectorPerformanceGoal,
    hcwmDepartmentGoals, opsDepartmentGoals, phillyGroupGoals,
  } = useApp();
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftOkrId, setDraftOkrId] = useState("");

  const goals = directorPerformanceGoalsById[personaId] ?? [];

  const phillyOptions = phillyGroupGoals.flatMap(pg => [
    { id: pg.id, label: pg.title },
    ...pg.keyResults.map(k => ({ id: k.id, label: `↳ ${k.title}` })),
  ]);
  const deptOptionGroups: { label: string; options: { id: string; label: string }[] }[] = [
    { label: "2026 Philly Group OKRs", options: phillyOptions },
    { label: MARKETING_DEPT_NAME, options: flattenOkrOptions(marketingDepartmentGoals) },
    { label: HCWM_DEPT_NAME, options: flattenOkrOptions(hcwmDepartmentGoals) },
    { label: CREDIT_RISK_DEPT_NAME, options: flattenOkrOptions(opsDepartmentGoals) },
  ];
  const allOptions = deptOptionGroups.flatMap(g => g.options);
  const labelFor = (id?: string) => allOptions.find(o => o.id === id)?.label;

  const STATUS_STYLE: Record<DirectorPerformanceGoal["status"], string> = {
    "on-track": "bg-rag-green/10 text-rag-green border-rag-green/30",
    "at-risk": "bg-rag-amber/10 text-amber-foreground border-rag-amber/30",
    "done": "bg-muted text-muted-foreground border-border",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary shrink-0" />
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">My Performance Goals ({goals.length})</div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors">
            <Plus className="size-3" /> Add a Goal
          </button>
        )}
      </div>
      {adding && (
        <div className="mb-3 rounded-xl border border-border p-3 space-y-2 bg-muted/20">
          <input
            value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Goal title"
            className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5"
          />
          <select value={draftOkrId} onChange={e => setDraftOkrId(e.target.value)} className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5">
            <option value="">Link to an OKR (optional)</option>
            {deptOptionGroups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (!draftTitle.trim()) { toast.error("Title is required"); return; }
                upsertDirectorPerformanceGoal(personaId, {
                  id: `dpg-${Date.now()}`, title: draftTitle.trim(),
                  linkedOkrId: draftOkrId || undefined, linkedOkrLabel: draftOkrId ? labelFor(draftOkrId) : undefined,
                  status: "on-track",
                });
                setDraftTitle(""); setDraftOkrId(""); setAdding(false);
              }}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
            >
              Add
            </button>
            <button onClick={() => { setAdding(false); setDraftTitle(""); setDraftOkrId(""); }} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
          </div>
        </div>
      )}
      {goals.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
          No performance goals set yet — add one and link it to any Philly Group or department OKR.
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map(g => (
            <div key={g.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{g.title}</div>
                {g.linkedOkrLabel && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">🔗 {g.linkedOkrLabel}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={g.status}
                  onChange={e => upsertDirectorPerformanceGoal(personaId, { ...g, status: e.target.value as DirectorPerformanceGoal["status"] })}
                  className={cn("text-[10px] rounded-full border px-2 py-1 font-medium", STATUS_STYLE[g.status])}
                >
                  <option value="on-track">On track</option>
                  <option value="at-risk">At risk</option>
                  <option value="done">Done</option>
                </select>
                <button onClick={() => deleteDirectorPerformanceGoal(personaId, g.id)} className="size-6 rounded grid place-items-center text-muted-foreground hover:text-rag-red hover:bg-muted transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DirectorGoalsView() {
  const { directorMeta, teamDevGoalsById, upsertTeamDevGoal, deleteTeamDevGoal } = useApp();
  const [addingGoal, setAddingGoal] = useState(false);
  if (!directorMeta) return null;
  const devGoals = teamDevGoalsById[directorMeta.personaId] ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="font-display text-2xl">My Goals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your own performance goals — each links directly to a Philly Group or department OKR — plus free-form development goals.
        </p>
      </div>
      <DirectorPerformanceGoalsSection personaId={directorMeta.personaId} />
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-amber shrink-0" />
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Development Goals ({devGoals.length})</div>
          </div>
          {!addingGoal && (
            <button onClick={() => setAddingGoal(true)} className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber/15 text-amber-foreground border border-amber/30 hover:bg-amber/25 transition-colors">
              <Plus className="size-3" /> Add a Goal
            </button>
          )}
        </div>
        {addingGoal && (
          <div className="mb-3">
            <AddDevGoalForm
              onAdd={(g) => { upsertTeamDevGoal(directorMeta.personaId, g); setAddingGoal(false); }}
              onCancel={() => setAddingGoal(false)}
            />
          </div>
        )}
        {devGoals.length === 0 && !addingGoal ? (
          <div className="rounded-xl border-2 border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
            No development goals set yet — add one to start tracking your own growth.
          </div>
        ) : (
          <div className="space-y-3">
            {devGoals.map((g) => (
              <DevGoalCard
                key={g.id}
                goal={g}
                onUpdate={(id, changes) => upsertTeamDevGoal(directorMeta.personaId, { ...g, ...changes, id })}
                onDelete={(id) => deleteTeamDevGoal(directorMeta.personaId, id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MyGoalsSection() {
  const { tier } = useApp();
  if (tier === "manager" || tier === "ops_hod") return <ManagerGoalsView />;
  if (tier === "director1" || tier === "director2" || tier === "director0") return <DirectorGoalsView />;
  return <StaffGoalsView />;
}
