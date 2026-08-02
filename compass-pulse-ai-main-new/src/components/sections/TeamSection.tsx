import { useState, useEffect } from "react";
import { Card, RagPill, RagDot, ActionNeededIcon, MonthPicker, RAGInfoPanel, SkillsNeededPicker, MascotFlourish, MultiOwnerSelect, FieldBadge } from "@/components/ui-bits";
import { isHCWMDept, ALL_SKILLS, IHRP_SKILLS_CATALOG } from "@/lib/skillsCatalog";
import { useApp } from "@/lib/appContext";
import type { DevGoalRecommendation, PerfGoalRecommendation } from "@/lib/appContext";
import { getAiProvider } from "@/lib/aiService";
import type { TeamMember, PersonalDevGoal, RAG, DeptGoal, KeyResult } from "@/lib/mockData";
import { Sparkles, X, ChevronRight, ChevronDown, ChevronUp, Flag, AlertCircle, Check, Pencil, CheckCircle2, Loader2, Clock, TriangleAlert, Users, ExternalLink, Plus, MessageSquareHeart, GraduationCap, ThumbsDown, Info, Target, Trash2, UserPlus, UserCircle2, ListChecks, Building2, Globe2 } from "lucide-react";
import { CheckInSection } from "./CheckInSection";

function TeamSVG() {
  return (
    <svg width="40" height="36" viewBox="0 0 44 38" fill="none">
      <circle cx="10" cy="12" r="5" fill="#93C5FD"/>
      <path d="M3 26 Q3 20 10 20 Q17 20 17 26 L17 32 Q10 35 3 32Z" fill="#93C5FD"/>
      <circle cx="34" cy="12" r="5" fill="#A5F3FC"/>
      <path d="M27 26 Q27 20 34 20 Q41 20 41 26 L41 32 Q34 35 27 32Z" fill="#A5F3FC"/>
      <circle cx="22" cy="9" r="6" fill="#3B82F6"/>
      <path d="M13 28 Q13 21 22 21 Q31 21 31 28 L31 35 Q22 38 13 35Z" fill="#3B82F6"/>
      <circle cx="10" cy="10" r="2" fill="white" fillOpacity="0.3"/>
      <circle cx="34" cy="10" r="2" fill="white" fillOpacity="0.3"/>
      <circle cx="22" cy="8" r="2.5" fill="white" fillOpacity="0.3"/>
      <circle cx="38" cy="6" r="1.2" fill="#FCD34D"/>
      <circle cx="5" cy="5" r="1" fill="#F472B6"/>
    </svg>
  );
}

import { toast } from "sonner";
import { pointsToast } from "@/lib/pointsToast";
import { cn, workingDaysSince, formatGoalStatusDueDate, stripLeadingZero, clampScoreDecimal, roundToOneDecimal, flattenOkrOptions, objectiveScore, objectiveConfidence, objectiveConfidenceValue, ragConfidenceValue, scoreToRag, keyResultsOwnedBy, formatMonthlyConfidenceDueDate, isAmongOwners, ownerNames, isPendingAckFor, hasPendingAck, isKrOverdue, formatEffectiveKrScoreDueDate, isConfidenceStale, krOwnerCounts, MAX_KRS_PER_OWNER, isKrScoreFromPastQuarter, isKrScoreStaleForDisplay, objectiveScoreQuarterLabel } from "@/lib/utils";
import { computeChallengeThemes, getRelevantDeptsForViewer, HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME } from "@/lib/insights";
import { phillyGroupGoals, findPhillyGoal, findPhillyKr } from "@/lib/phillyGroupOkrs";
import { PhillyGroupOkrsDialog } from "@/components/PhillyGroupOkrsDialog";
import { MARKETING_DEPT_NAME, marketingTeamMembers, marketingDepartmentGoals } from "@/lib/marketingData";

// ── Owner picker — a search combobox over staffList (already active-only). Default (empty query)
// shows only the current department's roster, unchanged from before; typing searches every active
// colleague org-wide by name — the cross-team-OKR case ("appoint any colleague from the
// organisation"). Only a name matching an actual active person can be committed via onChange. ─────

function OwnerSelect({ value, onChange, dept, teamLeadsOnly }: {
  value: string; onChange: (v: string) => void; dept?: string;
  // Restricts the *default, dept-scoped* list to people who are themselves a "leave supervisor"
  // (appear as someone else's supervisor) and aren't the HOD — the eligible pool for a team-level
  // Objective's overall owner. Dropped once the HOD is searching org-wide, since appointing any
  // colleague (not just this department's supervisors) as a cross-team owner is the explicit ask.
  teamLeadsOnly?: boolean;
}) {
  const { staffList } = useApp();
  const [query, setQuery] = useState(value);
  useEffect(() => { setQuery(value); }, [value]);

  const isSearching = query.trim().length > 0 && query !== value;
  const deptScoped = dept ? staffList.filter(s => s.dept === dept) : staffList;
  const base = teamLeadsOnly ? deptScoped.filter(s => !s.hod && staffList.some(o => o.supervisor === s.name)) : deptScoped;
  const pool = isSearching ? staffList : base;
  const matches = pool
    .filter(s => !isSearching || s.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  const [open, setOpen] = useState(false);
  const select = (name: string) => { onChange(name); setQuery(name); setOpen(false); };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setQuery(value); }, 150)}
        placeholder="Select or search any colleague…"
        className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full max-h-56 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg">
          {matches.map(s => (
            <button
              key={s.id} type="button" onMouseDown={() => select(s.name)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {s.name}
              {isSearching && <span className="text-xs text-muted-foreground ml-1.5">— {s.role} ({s.dept})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Beautifully styled card for team members who have not set any goals ───────

function NoGoalMemberCard({ m, onOpen, isClickable, ownedKrCount, color }: {
  m: TeamMember;
  onOpen: (m: TeamMember) => void;
  isClickable: boolean;
  ownedKrCount: number;
  // Pastel tone matched to this member's supervisor group — keeps the section from reading as a
  // wall of red while still leaving a small red accent on the actual "outstanding" badge.
  color: { border: string; bg: string; text: string };
}) {
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={() => isClickable && onOpen(m)}
      onKeyDown={e => { if (isClickable && (e.key === "Enter" || e.key === " ")) onOpen(m); }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all select-none",
        isClickable ? "cursor-pointer hover:shadow-lg active:scale-[0.99]" : "cursor-default",
        color.border, "shadow-sm"
      )}
    >
      {/* Gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br via-card to-card pointer-events-none", color.bg)} />

      <div className="relative p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn("size-14 rounded-2xl bg-gradient-to-br to-transparent grid place-items-center font-bold text-lg shrink-0 border shadow-sm", color.bg, color.text, color.border)}>
            {m.avatar}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-base leading-tight text-foreground">{m.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5 truncate">{m.role}</div>
              </div>
              {isClickable && (
                <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
            </div>

            {/* Status badges — kept red since this is the actual urgency signal */}
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rag-red/12 text-rag-red border border-rag-red/25">
                {ownedKrCount === 0 ? "No Goals Set" : `Incomplete (${ownedKrCount}/3)`}
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-medium">Min. 3 required</span>
            </div>
          </div>
        </div>

        {/* Bottom action row for clickable cards */}
        {isClickable && (
          <div className={cn("mt-4 pt-3 border-t flex items-center justify-between", color.border)}>
            <span className="text-xs text-muted-foreground">Open to provide feedback &amp; suggest goals</span>
            <span className="text-xs font-semibold text-primary">View →</span>
          </div>
        )}
        {!isClickable && (
          <div className={cn("mt-4 pt-3 border-t", color.border)}>
            <span className="text-[10px] text-muted-foreground/50 italic">Goal-setting action required by {m.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Objective card (HOD view) ─────────────────────────────────────────────────

function currentQuarterKey(): "Q1" | "Q2" | "Q3" | "Q4" {
  const m = new Date().getMonth();
  if (m <= 2) return "Q1"; if (m <= 5) return "Q2"; if (m <= 8) return "Q3"; return "Q4";
}

function formatDueDate(ym: string) {
  const [y, mo] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(mo) - 1]} ${y}`;
}

// ── Key Result row — owner-driven confidence/score inputs, ack-or-counterpropose ─────────────────

function KeyResultRow({
  objectiveId, kr, krIndex, isOps, isOwnerViewer, viewedUserName, isHod, isTeamOkrEditor, level, dept, canOpenOwner, onOpenOwner,
}: {
  objectiveId: string; kr: KeyResult; krIndex: number; isOps: boolean; isOwnerViewer: boolean;
  viewedUserName: string; isHod: boolean;
  // Delegated leave supervisor granted team-level edit rights by the HOD (see TeamSection()'s header
  // control) — combined with level below to produce canEdit, the actual gate used everywhere here.
  isTeamOkrEditor: boolean;
  level: "department" | "team"; dept: string;
  canOpenOwner: (ownerName: string, level: "department" | "team") => boolean;
  onOpenOwner: (ownerName: string) => void;
}) {
  const {
    updateKeyResultConfidence, submitKeyResultScore, acknowledgeOkrItem, proposeOkrCounter, resolveOkrCounter,
    updateKeyResult, overrideKeyResultScore, agreeCoOwnerConfidence, agreeCoOwnerScore, deptGoalSkills, updateGoalSkills, staffList,
    respondToChallengeRemark, acknowledgeChallengeResponse, respondToScoreRemark, acknowledgeScoreResponse,
  } = useApp();
  // A red/amber confidence submission (either the direct select, or a co-owner's "suggest a
  // different value") doesn't write immediately — it opens this mandatory composer first. Shared by
  // both entry points since they ultimately call the same updateKeyResultConfidence.
  const [pendingConfidenceChoice, setPendingConfidenceChoice] = useState<RAG | null>(null);
  const [challengeDraft, setChallengeDraft] = useState("");
  // Once a challenge/score thread is fully closed out (responded to AND acknowledged), its full
  // remark text stays collapsed by default — it's history, not something to act on — to keep the
  // page from growing a wall of old resolved threads. Still one click away via "Show details".
  const [challengeThreadOpen, setChallengeThreadOpen] = useState(false);
  const [scoreThreadOpen, setScoreThreadOpen] = useState(false);
  // Same mandatory-composer pattern, for a below-green (<0.7) Quarterly Score submission instead of
  // a red/amber confidence — shared by the direct submit and the co-owner "suggest a different
  // value" entry points, both of which ultimately call submitKeyResultScore.
  const [pendingScoreValue, setPendingScoreValue] = useState<number | null>(null);
  const [scoreRemarkDraft, setScoreRemarkDraft] = useState("");
  const [respondingToScoreRemark, setRespondingToScoreRemark] = useState(false);
  const [scoreResponseDraft, setScoreResponseDraft] = useState("");
  const [draftingAiScoreResponse, setDraftingAiScoreResponse] = useState(false);
  const [aiScoreDraftUsed, setAiScoreDraftUsed] = useState(false);
  const [respondingToChallenge, setRespondingToChallenge] = useState(false);
  const [challengeResponseDraft, setChallengeResponseDraft] = useState("");
  const [draftingAiResponse, setDraftingAiResponse] = useState(false);
  const [aiDraftUsed, setAiDraftUsed] = useState(false);
  const [countering, setCountering] = useState(false);
  const [counterTitle, setCounterTitle] = useState("");
  const [counterDueDate, setCounterDueDate] = useState("");
  const [ackChecked, setAckChecked] = useState(false);
  const [scoreDraft, setScoreDraft] = useState(kr.score !== undefined ? String(kr.score) : "");
  const [requestingMod, setRequestingMod] = useState(false);
  const [modTitle, setModTitle] = useState("");
  const [modDueDate, setModDueDate] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ title: kr.title, owner: kr.owner, dueDate: kr.dueDate });
  const [overridingScore, setOverridingScore] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState(kr.score !== undefined ? String(kr.score) : "");
  const [overrideRemarkDraft, setOverrideRemarkDraft] = useState("");
  const [rejectingCounter, setRejectingCounter] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [modifyingCounter, setModifyingCounter] = useState(false);
  const [counterModifyDraft, setCounterModifyDraft] = useState({ title: kr.title, owner: kr.owner, dueDate: kr.dueDate });
  const skillCatalog = isHCWMDept(dept) ? IHRP_SKILLS_CATALOG : ALL_SKILLS;
  const isPendingForViewer = isPendingAckFor(kr, viewedUserName);
  const scoreHighlighted = isPendingForViewer && kr.pendingChangeType === "hodScore";
  // Monthly confidence is deliberately never gated on anyone's acknowledgement (see
  // updateKeyResultConfidence) — but a recent update is still worth flagging passively to whoever
  // else has a stake here (the HOD, a team-level set's secondary owner, or a co-owner) for a short
  // window, without asking them to click anything. 7 *working* days, same SLA window used for the
  // acknowledgement penalties elsewhere, so "recent" means the same thing throughout the app.
  const confidenceRecentlyUpdated = !!kr.ragConfidenceUpdatedDate && workingDaysSince(kr.ragConfidenceUpdatedDate) < 7;
  // "Needs attention" the opposite way — a confidence value that's gone stale is itself a risk
  // signal worth surfacing before anyone thinks to ask, same spirit as R4 from the platform research
  // (Lattice/Workday "find risk ahead of it being noticed"). Since confidence is rated on a monthly
  // cadence (not a rolling working-day window), staleness follows that same cadence: no rating for
  // the previous month once the new month's first working day has passed (see isConfidenceStale).
  const confidenceStale = isConfidenceStale(kr.ragConfidenceUpdatedDate);
  const canEdit = isHod || (level === "team" && isTeamOkrEditor);
  const coOwnerConfPending = kr.pendingCoOwnerConfidence;
  const coOwnerScorePending = kr.pendingCoOwnerScore;
  const iAmConfProposer = coOwnerConfPending?.proposedBy === viewedUserName;
  const iAmScoreProposer = coOwnerScorePending?.proposedBy === viewedUserName;
  const otherOwners = ownerNames(kr.owner).filter(n => n !== viewedUserName).join(", ");
  // Overdue = no score yet, past its effective deadline (the earlier of the standard quarterly
  // grace period or the KR's own due date if that falls before the quarter ends — see
  // effectiveKrScoreDueDate in utils.ts). Shown to everyone, not just the owner, since the whole
  // team benefits from seeing which Key Results are behind.
  const overdue = isKrOverdue(kr);
  // Action-needed: either this viewer owes a response to an open challenge remark (routed to the
  // Objective owner + HOD), or this viewer is the KR owner and owes an acknowledgement of a response
  // that's already come in. Drives the ActionNeededIcon + highlight, and clears itself the moment
  // either step is done — see respondToChallengeRemark/acknowledgeChallengeResponse in appContext.
  const owesChallengeResponse = (kr.pendingChallengeResponseFor ?? []).includes(viewedUserName);
  const owesChallengeAck = !!kr.pendingChallengeAckByOwner && isOwnerViewer;
  const owesScoreResponse = (kr.pendingScoreResponseFor ?? []).includes(viewedUserName);
  const owesScoreAck = !!kr.pendingScoreAckByOwner && isOwnerViewer;
  const hasActionNeeded = owesChallengeResponse || owesChallengeAck || owesScoreResponse || owesScoreAck;

  const handleConfidenceChange = (value: RAG) => {
    if (value === "green") {
      updateKeyResultConfidence(objectiveId, kr.id, value, viewedUserName, isOps);
      toast.success(ownerNames(kr.owner).length > 1 ? "Confidence proposed — your co-owner will be asked to agree or counter" : "Confidence updated — you can request a modification below if needed");
      return;
    }
    // Red/amber doesn't write yet — open the mandatory challenge composer below first.
    setPendingConfidenceChoice(value);
    setChallengeDraft("");
  };
  const submitPendingConfidence = () => {
    if (!pendingConfidenceChoice) return;
    if (!challengeDraft.trim()) { toast.error("Share a quick note on the challenge or bottleneck before submitting"); return; }
    updateKeyResultConfidence(objectiveId, kr.id, pendingConfidenceChoice, viewedUserName, isOps, challengeDraft.trim());
    toast.success(ownerNames(kr.owner).length > 1 ? "Confidence proposed and challenge shared — your co-owner will be asked to agree or counter" : "Confidence updated — your HOD and objective owner have been notified");
    setPendingConfidenceChoice(null);
    setChallengeDraft("");
  };
  const handleScoreSubmit = (n: number) => {
    if (n >= 0.7) {
      submitKeyResultScore(objectiveId, kr.id, n, viewedUserName, isOps);
      toast.success(ownerNames(kr.owner).length > 1 ? "Score proposed — your co-owner will be asked to agree or counter" : "Key result scored");
      setPendingScoreValue(null);
      setScoreRemarkDraft("");
      return;
    }
    // Below green doesn't write yet — open the mandatory rationale composer below first.
    setPendingScoreValue(n);
    setScoreRemarkDraft("");
  };
  const submitPendingScore = () => {
    if (pendingScoreValue === null) return;
    if (!scoreRemarkDraft.trim()) { toast.error("Add a rationale — challenges, bottlenecks, or support needed — before submitting"); return; }
    submitKeyResultScore(objectiveId, kr.id, pendingScoreValue, viewedUserName, isOps, scoreRemarkDraft.trim());
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

  return (
    <div className={cn(
      // rounded-xl (up from -lg) plus a soft shadow + hover lift matches ObjectiveCard's own
      // "lively" treatment — a Key Result nested inside a department objective should feel like
      // part of the same friendly, tactile visual system, not a flatter afterthought.
      "rounded-xl border p-3 space-y-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200",
      // Precedence: overdue (most urgent) > action-needed (you owe someone a response) > "this is
      // mine" ownership pastel > default. Each is visually distinct so they never get confused for
      // one another even when they overlap in the same viewer's eyes. Ownership saturation
      // deliberately mirrors ObjectiveCard's own treatment below (border-2 + a strong bg wash)
      // rather than a lighter one-off — a KR you own should read at least as clearly as an
      // Objective you own, not more faintly just because it's nested one level deeper.
      overdue ? "border-rag-red/50 bg-rag-red/5 dark:bg-rag-red/10"
        : hasActionNeeded ? "border-amber-400/70 bg-amber-50/60 dark:bg-amber-900/15 ring-1 ring-amber-300/60 dark:ring-amber-700/40"
        : isOwnerViewer ? "border-2 border-sky-400/80 dark:border-sky-600/70 bg-sky-50/85 dark:bg-sky-950/30 ring-1 ring-sky-200 dark:ring-sky-800/50"
        : "border-border/60 bg-gradient-to-br from-background to-muted/20"
    )}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Key Result {krIndex + 1}</span>
        {hasActionNeeded && (
          <ActionNeededIcon size={16} title={
            owesChallengeResponse ? "A challenge remark needs your response"
              : owesScoreResponse ? "A below-target score rationale needs your response"
              : owesScoreAck ? "A response to your score rationale is waiting for your acknowledgement"
              : "A response is waiting for your acknowledgement"
          } />
        )}
        {isPendingForViewer && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40">Pending</span>
        )}
        {kr.crossDeptApproval && kr.crossDeptApproval.pendingFrom.length > 0 && (
          <span
            title={`Awaiting consent from: ${kr.crossDeptApproval.pendingFrom.join(", ")}`}
            className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/40"
          >
            <ActionNeededIcon size={11} title="Awaiting cross-department consent" /> Cross-Dept Consent Pending
          </span>
        )}
        {isOwnerViewer && (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-700/40">
            <UserCircle2 className="size-2.5" /> You're an owner
          </span>
        )}
        {overdue && (
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rag-red/15 text-rag-red border border-rag-red/40">
            <AlertCircle className="size-2.5" /> Overdue — score required
          </span>
        )}
      </div>
      {/* A cross-department appointment this viewer requested was rejected by the appointee's HOD
          or leave supervisor — surfaced right at the top since it needs a reappointment, not just
          acknowledgement. Clears itself automatically the next time the owner field is edited. */}
      {kr.crossDeptApproval?.rejection && kr.crossDeptApproval.requestedBy === viewedUserName && (
        <div className="rounded-md border border-rag-red/30 bg-rag-red/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rag-red">
            <ActionNeededIcon size={14} title="Appointment rejected" />
            {kr.crossDeptApproval.appointee}'s appointment was rejected by {kr.crossDeptApproval.rejection.by}
          </div>
          {kr.crossDeptApproval.rejection.reason && (
            <p className="text-[11px] text-rag-red/90">&ldquo;{kr.crossDeptApproval.rejection.reason}&rdquo;</p>
          )}
          <p className="text-[11px] text-muted-foreground">Edit this key result to appoint someone else.</p>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1.5">
              <input value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1" placeholder="Key result title" />
              <MultiOwnerSelect value={editDraft.owner} onChange={v => setEditDraft(d => ({ ...d, owner: v }))} dept={dept} staffList={staffList} />
              <input type="date" value={editDraft.dueDate} onChange={e => setEditDraft(d => ({ ...d, dueDate: e.target.value }))} className="text-xs rounded-md border border-input bg-background px-2 py-1" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (!editDraft.title.trim() || !editDraft.owner || !editDraft.dueDate) { toast.error("Title, owner, and due date are required"); return; }
                    updateKeyResult(objectiveId, kr.id, editDraft, isOps, viewedUserName);
                    setEditing(false);
                    toast.success("Key result updated — owner will be notified to re-acknowledge");
                  }}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium leading-snug">{kr.title}</div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <FieldBadge kind="owner">Owner</FieldBadge>
                <span className="text-sm font-semibold">
                  {/* The viewer's own name (if they're a co-owner) stays full-strength; other
                      co-owners are dimmed a touch — still easily legible, just visually secondary —
                      so it's obvious at a glance which of possibly several names is "you". */}
                  {ownerNames(kr.owner).map((n, i) => {
                    const isViewer = n === viewedUserName;
                    return (
                      <span key={n}>
                        {i > 0 && ", "}
                        {canOpenOwner(n, level) ? (
                          <button onClick={() => onOpenOwner(n)} className={cn("hover:underline", isViewer ? "text-primary" : "text-primary/60")}>{n}</button>
                        ) : (
                          <span className={isViewer ? "text-foreground" : "text-foreground/55"}>{n}</span>
                        )}
                      </span>
                    );
                  })}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className={cn("text-sm font-semibold", overdue ? "text-rag-red" : "text-foreground")}>
                  Due {kr.dueDate ? new Date(kr.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && !editing && (
            <button onClick={() => { setEditDraft({ title: kr.title, owner: kr.owner, dueDate: kr.dueDate }); setEditing(true); }} className="size-5 rounded grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors" title="Edit key result">
              <Pencil className="size-3" />
            </button>
          )}
          {/* Owners get the full interactive Monthly Confidence/Quarterly Score section further
              down (with the current value reflected right in the control) — repeating a static
              read-only copy of the same two labels up here would just be the same information
              twice. Everyone else (who has no edit section) sees the read-only pills here instead. */}
          {!(isOwnerViewer && !isPendingForViewer) && (
            <>
              <div className="flex flex-col items-end gap-0.5">
                <FieldBadge kind="confidence" className="text-[9px]">Confidence</FieldBadge>
                <div
                  className={cn(
                    "rounded-full flex items-center gap-1",
                    confidenceRecentlyUpdated && !isOwnerViewer && "ring-2 ring-violet-300 dark:ring-violet-700/50",
                    confidenceStale && "ring-2 ring-amber-300 dark:ring-amber-700/50",
                  )}
                  title={
                    confidenceRecentlyUpdated && !isOwnerViewer ? "Updated within the last 7 working days"
                    : confidenceStale ? "No confidence rating recorded for last month yet — may need a refresh"
                    : undefined
                  }
                >
                  {confidenceRecentlyUpdated && !isOwnerViewer && <Sparkles className="size-3 text-violet-500 shrink-0" />}
                  {confidenceStale && <Clock className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                  <RagPill rag={kr.ragConfidence} value={ragConfidenceValue(kr.ragConfidence)} />
                </div>
              </div>
              {kr.score !== undefined && !isKrScoreStaleForDisplay(kr) && (
                <div className="flex flex-col items-end gap-0.5">
                  <FieldBadge kind="score" className="text-[9px]">Score</FieldBadge>
                  <div className={cn("rounded-full", scoreHighlighted && "ring-2 ring-amber-400")}>
                    <RagPill rag={scoreToRag(kr.score)} value={kr.score} />
                  </div>
                  {isKrScoreFromPastQuarter(kr) && (
                    <span className="text-[8px] font-medium text-muted-foreground whitespace-nowrap">{kr.scoreQuarter} (past quarter)</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Skills needed for this key result — editable by the HOD or the delegated team-OKR editor */}
      {canEdit && (
        <div className="flex items-start gap-2 pt-1">
          <FieldBadge kind="skills" className="mt-0.5">Skills Needed</FieldBadge>
          <SkillsNeededPicker value={deptGoalSkills[kr.id] ?? []} onChange={skills => updateGoalSkills(kr.id, skills)} catalog={skillCatalog} />
        </div>
      )}
      {!canEdit && (deptGoalSkills[kr.id]?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {deptGoalSkills[kr.id]!.map(skill => (
            <span key={skill} className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">{skill}</span>
          ))}
        </div>
      )}

      {/* Owner ack-or-counterpropose */}
      {/* Whoever is actually in pendingAcknowledgementFor gets this — not just this KR's own
          "owner" field. That list can now also hold the HOD (reviewing a change made by a
          team-level set's delegated secondary owner) or a secondary owner (reviewing a change from
          one of the set's other owners) — see applyTeamCoResponsibility in appContext.tsx — so the
          copy below stays actor-neutral ("this key result was updated") rather than assuming
          "Your HOD," and Counterpropose (an owner-only move — declining/renegotiating your own
          appointment) is gated on isOwnerViewer specifically rather than on being pending at all. */}
      {isPendingForViewer && !kr.counterProposal && (
          <div className="rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 p-2.5 space-y-1.5">
            <div className="text-[11px] text-amber-800 dark:text-amber-300">
              {kr.pendingChangeType === "hodScore"
                ? <>The quarterly score was set to <strong>{kr.score?.toFixed(1)}</strong>. Please review and acknowledge.</>
                : kr.pendingChangeType === "hodEdit"
                ? <>This key result was updated. Please review and acknowledge.</>
                : <>You've been appointed owner of this key result. Guidelines: update RAG confidence monthly, and score it by {formatEffectiveKrScoreDueDate(kr)}.</>}
            </div>
            {kr.pendingChangeType === "hodScore" && kr.scoreRemark && (
              <div className="text-[11px] text-amber-800/90 dark:text-amber-300/90 bg-amber-100/50 dark:bg-amber-900/20 rounded-md px-2 py-1.5">
                "{kr.scoreRemark.text}"
              </div>
            )}
            {kr.lastCounterRejection && (
              <div className="text-[11px] text-rag-red/90 bg-rag-red/5 border border-rag-red/20 rounded-md px-2 py-1.5">
                Your counterproposal was declined{kr.lastCounterRejection.reason ? <>: "{kr.lastCounterRejection.reason}"</> : "."} You can re-acknowledge the original appointment above, or counterpropose again.
              </div>
            )}
            {!countering ? (
              <>
                <label className="flex items-center gap-1.5 text-[11px]">
                  <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} className="rounded" />
                  {kr.pendingChangeType === "hodScore" ? "I acknowledge this score"
                    : kr.pendingChangeType === "hodEdit" ? "I acknowledge this update"
                    : "I acknowledge these guidelines"}
                </label>
                <div className="flex gap-1.5">
                  <button
                    disabled={!ackChecked}
                    onClick={() => acknowledgeOkrItem(objectiveId, kr.id, viewedUserName, isOps)}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {kr.pendingChangeType === "hodScore" ? "Acknowledge Score"
                      : kr.pendingChangeType === "hodEdit" ? "Acknowledge Update"
                      : "Accept Appointment"}
                  </button>
                  {isOwnerViewer && (
                    <button onClick={() => setCountering(true)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">
                      Counterpropose
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground">Suggest alternative wording (optional)</label>
                  <input
                    value={counterTitle}
                    onChange={e => setCounterTitle(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-background px-2 py-1"
                    placeholder="Suggest an alternative key result…"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Suggest alternative due date (optional)</label>
                  <input
                    type="date"
                    value={counterDueDate}
                    onChange={e => setCounterDueDate(e.target.value)}
                    className="text-xs rounded-md border border-input bg-background px-2 py-1"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      if (!counterTitle.trim() && !counterDueDate) { toast.error("Suggest a different title, a different due date, or both"); return; }
                      proposeOkrCounter(objectiveId, kr.id, { title: counterTitle.trim() || undefined, dueDate: counterDueDate || undefined }, isOps, viewedUserName);
                      setCountering(false);
                      toast.success("Counterproposal sent for review");
                    }}
                    className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                  >
                    Submit Counterproposal
                  </button>
                  <button onClick={() => setCountering(false)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
                </div>
              </div>
            )}
          </div>
      )}

      {/* Counterproposal awaiting HOD/delegated-editor review — accept, reject (with optional
          reason), or modify the appointment directly */}
      {kr.counterProposal && canEdit && (
        <div className="rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-2.5 space-y-1.5">
          <div className="text-[11px] text-violet-800 dark:text-violet-300">
            {kr.counterProposal.proposedBy} proposed a change:{" "}
            {kr.counterProposal.title && <>title <strong>"{kr.counterProposal.title}"</strong></>}
            {kr.counterProposal.title && kr.counterProposal.dueDate && <> and </>}
            {kr.counterProposal.dueDate && <>due date <strong>{new Date(kr.counterProposal.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</strong></>}
          </div>
          {!rejectingCounter && !modifyingCounter && (
            <div className="flex gap-1.5">
              <button onClick={() => resolveOkrCounter(objectiveId, kr.id, { type: "accept" }, isOps, viewedUserName)} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium">Accept</button>
              <button onClick={() => setRejectingCounter(true)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Reject</button>
              <button
                onClick={() => { setCounterModifyDraft({ title: kr.counterProposal!.title ?? kr.title, owner: kr.owner, dueDate: kr.counterProposal!.dueDate ?? kr.dueDate }); setModifyingCounter(true); }}
                className="px-2.5 py-1 rounded-md border border-border text-[11px]"
              >
                Modify
              </button>
            </div>
          )}
          {rejectingCounter && (
            <div className="space-y-1.5">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1"
                placeholder="Optional reason for the owner…"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => { resolveOkrCounter(objectiveId, kr.id, { type: "reject", reason: rejectReason.trim() || undefined }, isOps); setRejectingCounter(false); setRejectReason(""); toast.success("Counterproposal rejected — owner can re-acknowledge the original appointment"); }}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Confirm Reject
                </button>
                <button onClick={() => { setRejectingCounter(false); setRejectReason(""); }} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            </div>
          )}
          {modifyingCounter && (
            <div className="space-y-1.5">
              <input value={counterModifyDraft.title} onChange={e => setCounterModifyDraft(d => ({ ...d, title: e.target.value }))} className="w-full text-xs rounded-md border border-input bg-background px-2 py-1" placeholder="Key result title" />
              <MultiOwnerSelect value={counterModifyDraft.owner} onChange={v => setCounterModifyDraft(d => ({ ...d, owner: v }))} dept={dept} staffList={staffList} />
              <input type="date" value={counterModifyDraft.dueDate} onChange={e => setCounterModifyDraft(d => ({ ...d, dueDate: e.target.value }))} className="text-xs rounded-md border border-input bg-background px-2 py-1" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (!counterModifyDraft.title.trim() || !counterModifyDraft.owner || !counterModifyDraft.dueDate) { toast.error("Title, owner, and due date are required"); return; }
                    resolveOkrCounter(objectiveId, kr.id, { type: "modify", changes: counterModifyDraft }, isOps, viewedUserName);
                    setModifyingCounter(false);
                    toast.success("Appointment modified — owner will be notified to re-acknowledge");
                  }}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Save
                </button>
                <button onClick={() => setModifyingCounter(false)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Challenge thread — the mandatory red/amber remark, the HOD's/objective owner's response
          (manual or Work Buddy AI-drafted), and the owner's acknowledgement step. Full text only for the
          people actually involved; everyone else just sees the action icon/highlight above. */}
      {kr.challengeRemark && (canEdit || isOwnerViewer || owesChallengeResponse || owesChallengeAck) && (() => {
        const challengeResolved = !!kr.challengeResponse && !(kr.pendingChallengeResponseFor?.length) && !kr.pendingChallengeAckByOwner;
        const showBody = !challengeResolved || challengeThreadOpen;
        return (
        <div className="rounded-md border border-amber-300/50 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-700/30 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <RagDot rag={kr.challengeRemark.rag} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">
              Challenge shared by {ownerNames(kr.owner).join(", ")} · {kr.challengeRemark.date}
            </span>
            {challengeResolved && (
              <button onClick={() => setChallengeThreadOpen(o => !o)} className="ml-auto text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                {challengeThreadOpen ? "Hide details" : "Resolved · Show details"}
              </button>
            )}
          </div>
          {showBody && !challengeResolved && (kr.pendingChallengeResponseFor?.length || kr.pendingChallengeAckByOwner) && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400">
              {kr.pendingChallengeResponseFor?.length
                ? <>Awaiting response from <strong>{kr.pendingChallengeResponseFor.join(", ")}</strong></>
                : <>Awaiting acknowledgement from <strong>{ownerNames(kr.owner).join(", ")}</strong></>}
            </div>
          )}
          {showBody && <p className="text-xs text-foreground/85 leading-relaxed">&ldquo;{kr.challengeRemark.text}&rdquo;</p>}

          {showBody && kr.challengeResponse && (
            <div className="rounded-md border border-primary/25 bg-primary/5 p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                {kr.challengeResponse.respondedBy}'s response{kr.challengeResponse.isAI && <span className="normal-case font-medium text-muted-foreground">(Work Buddy AI-assisted)</span>}
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed">{kr.challengeResponse.text}</p>
            </div>
          )}

          {/* Respond — HOD or the objective owner */}
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
                      respondToChallengeRemark(objectiveId, kr.id, challengeResponseDraft.trim(), viewedUserName, isOps, aiDraftUsed);
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

          {/* Acknowledge — the KR owner, once a response has come in */}
          {owesChallengeAck && (
            <button
              onClick={() => { acknowledgeChallengeResponse(objectiveId, kr.id, isOps); toast.success("Acknowledged"); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold"
            >
              <ActionNeededIcon size={13} title="Acknowledge" /> Acknowledge This Response
            </button>
          )}
        </div>
        );
      })()}

      {/* Score-remark thread — same shape as the challenge thread above, for a below-green (<0.7)
          Quarterly Score's mandatory rationale instead of a red/amber Monthly Confidence. */}
      {kr.scoreRemark && (canEdit || isOwnerViewer || owesScoreResponse || owesScoreAck) && (() => {
        const scoreResolved = !!kr.scoreResponse && !(kr.pendingScoreResponseFor?.length) && !kr.pendingScoreAckByOwner;
        const showBody = !scoreResolved || scoreThreadOpen;
        return (
        <div className="rounded-md border border-amber-300/50 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-700/30 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <RagDot rag={scoreToRag(kr.scoreRemark.score)} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">Score Rationale ({kr.scoreRemark.score.toFixed(1)}) · {kr.scoreRemark.date}</span>
            {scoreResolved && (
              <button onClick={() => setScoreThreadOpen(o => !o)} className="ml-auto text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                {scoreThreadOpen ? "Hide details" : "Resolved · Show details"}
              </button>
            )}
          </div>
          {showBody && <p className="text-xs text-foreground/85 leading-relaxed">&ldquo;{kr.scoreRemark.text}&rdquo;</p>}

          {showBody && kr.scoreResponse && (
            <div className="rounded-md border border-primary/25 bg-primary/5 p-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground">
                {kr.scoreResponse.respondedBy}'s response{kr.scoreResponse.isAI && <span className="normal-case font-medium text-muted-foreground">(Work Buddy AI-assisted)</span>}
              </div>
              <p className="text-xs text-foreground/85 leading-relaxed">{kr.scoreResponse.text}</p>
            </div>
          )}

          {/* Respond — HOD or the objective owner */}
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
                      respondToScoreRemark(objectiveId, kr.id, scoreResponseDraft.trim(), viewedUserName, isOps, aiScoreDraftUsed);
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

          {/* Acknowledge — the KR owner, once a response has come in */}
          {owesScoreAck && (
            <button
              onClick={() => { acknowledgeScoreResponse(objectiveId, kr.id, isOps); toast.success("Acknowledged"); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-semibold"
            >
              <ActionNeededIcon size={13} title="Acknowledge" /> Acknowledge This Response
            </button>
          )}
        </div>
        );
      })()}

      {/* Owner-only: monthly confidence + quarterly score */}
      {isOwnerViewer && !isPendingForViewer && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">Monthly Confidence</label>
            {coOwnerConfPending ? (
              iAmConfProposer ? (
                <span className="text-[11px] text-muted-foreground italic">You proposed {coOwnerConfPending.rag} — awaiting {otherOwners || "your co-owner"} to respond</span>
              ) : (
                <div className="w-full rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-2 space-y-1.5">
                  <div className="text-[11px] text-violet-800 dark:text-violet-300">{coOwnerConfPending.proposedBy} proposed confidence: <strong>{coOwnerConfPending.rag.toUpperCase()}</strong> — agree or suggest a different value.</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => { agreeCoOwnerConfidence(objectiveId, kr.id, isOps); toast.success("Confidence finalized"); }} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium">Agree</button>
                    <select
                      defaultValue=""
                      onChange={e => { if (!e.target.value) return; handleConfidenceChange(e.target.value as RAG); }}
                      className="text-[11px] rounded-md border border-input bg-background px-2 py-1"
                    >
                      <option value="" disabled>Suggest a different value…</option>
                      <option value="green">Confidence: Green (0.7–1.0)</option>
                      <option value="amber">Confidence: Amber (0.4–0.6)</option>
                      <option value="red">Confidence: Red (&lt;0.4)</option>
                    </select>
                  </div>
                </div>
              )
            ) : (
              <>
                {/* Standalone RAG word + dot, same RagPill treatment as everyone else's read-only
                    view of this same field — previously the word only existed inside the <select>'s
                    own closed-state text, easy to miss at a glance. */}
                <RagPill rag={kr.ragConfidence} value={ragConfidenceValue(kr.ragConfidence)} />
                <select
                  value={kr.ragConfidence}
                  onChange={e => handleConfidenceChange(e.target.value as RAG)}
                  className="text-[11px] rounded-md border border-input bg-background px-2 py-1"
                >
                  <option value="green">Confidence: Green (0.7–1.0)</option>
                  <option value="amber">Confidence: Amber (0.4–0.6)</option>
                  <option value="red">Confidence: Red (&lt;0.4)</option>
                </select>
                <span className="text-[10px] text-muted-foreground">Due {formatMonthlyConfidenceDueDate()}</span>
              </>
            )}
          </div>
          {/* Mandatory challenge note — a red/amber submission doesn't write until this is filled in.
              Routed to the Objective owner(s) + HOD for a response; concise by design (a few
              sentences on what's actually blocking progress, not a status report). */}
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
            <label className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">Quarterly OKR Score</label>
            {coOwnerScorePending ? (
              iAmScoreProposer ? (
                <span className="text-[11px] text-muted-foreground italic">You proposed {coOwnerScorePending.score.toFixed(1)} — awaiting {otherOwners || "your co-owner"} to respond</span>
              ) : (
                <div className="w-full rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-2 space-y-1.5">
                  <div className="text-[11px] text-violet-800 dark:text-violet-300">{coOwnerScorePending.proposedBy} proposed a score of <strong>{coOwnerScorePending.score.toFixed(1)}</strong> — agree or suggest a different value.</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => { agreeCoOwnerScore(objectiveId, kr.id, isOps); toast.success("Score finalized"); }} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium">Agree</button>
                    <input type="number" min={0} max={1} step={0.1} value={scoreDraft} onChange={e => setScoreDraft(stripLeadingZero(clampScoreDecimal(e.target.value)))} placeholder="Different score 0.0–1.0" className="w-28 text-[11px] rounded-md border border-input bg-background px-2 py-1" />
                    <button
                      onClick={() => {
                        const n = roundToOneDecimal(Number(scoreDraft));
                        if (Number.isNaN(n) || n < 0 || n > 1) { toast.error("Score must be between 0.0 and 1.0, to 1 decimal place"); return; }
                        handleScoreSubmit(n);
                      }}
                      className="px-2 py-1 rounded-md border border-border text-[11px]"
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
                  placeholder="Score 0.0–1.0"
                  className="w-24 text-[11px] rounded-md border border-input bg-background px-2 py-1"
                />
                <button
                  onClick={() => {
                    const n = roundToOneDecimal(Number(scoreDraft));
                    if (Number.isNaN(n) || n < 0 || n > 1) { toast.error("Score must be between 0.0 and 1.0, to 1 decimal place"); return; }
                    handleScoreSubmit(n);
                  }}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Submit Score
                </button>
                <span className={cn("text-[10px]", overdue ? "text-rag-red font-semibold" : "text-muted-foreground")}>Due {formatEffectiveKrScoreDueDate(kr)}</span>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <RagPill rag={scoreToRag(kr.score)} value={kr.score} />
                {kr.scoreSubmittedDate && <span className="text-[10px] text-muted-foreground">on {kr.scoreSubmittedDate}</span>}
              </div>
            )}
          </div>
          {/* Mandatory rationale — a below-green (<0.7) score doesn't write until this is filled in.
              Routed to the Objective owner(s) + HOD, same as the confidence challenge above. */}
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
          {/* Modification request — available again after a confidence update, subject to HOD approval */}
          {!kr.counterProposal && (
            !requestingMod ? (
              <button onClick={() => setRequestingMod(true)} className="text-[11px] text-primary font-medium">Request Modification</button>
            ) : (
              <div className="space-y-1.5">
                <input value={modTitle} onChange={e => setModTitle(e.target.value)} className="w-full text-[11px] rounded-md border border-input bg-background px-2 py-1" placeholder="Suggested description/timeline/expected result…" />
                <input type="date" value={modDueDate} onChange={e => setModDueDate(e.target.value)} className="text-[11px] rounded-md border border-input bg-background px-2 py-1" />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (!modTitle.trim() && !modDueDate) { toast.error("Suggest a different description, a different due date, or both"); return; }
                      proposeOkrCounter(objectiveId, kr.id, { title: modTitle.trim() || undefined, dueDate: modDueDate || undefined }, isOps, viewedUserName);
                      setRequestingMod(false);
                      toast.success("Modification request sent to your HOD for approval");
                    }}
                    className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                  >
                    Send
                  </button>
                  <button onClick={() => setRequestingMod(false)} className="px-2 py-1 rounded-md border border-border text-[11px]">Cancel</button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* HOD, or the delegated team-OKR editor (secondary owner) for a team-level set: set or edit
          the quarterly score directly — not gated on the owner having submitted one first, so the
          HOD/secondary owner can score a Key Result outright, not just correct an existing score. */}
      {canEdit && !isOwnerViewer && (
        <div className="pt-1">
          {!overridingScore ? (
            <button
              onClick={() => { setOverrideDraft(kr.score !== undefined ? String(kr.score) : ""); setOverrideRemarkDraft(""); setOverridingScore(true); }}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              {kr.score !== undefined ? "Edit Quarterly Score" : "Set Quarterly Score"}
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={1} step={0.1}
                  value={overrideDraft}
                  onChange={e => setOverrideDraft(stripLeadingZero(clampScoreDecimal(e.target.value)))}
                  placeholder="0.0–1.0"
                  className="w-24 text-[11px] rounded-md border border-input bg-background px-2 py-1"
                />
              </div>
              {/* Same below-0.7-needs-a-rationale rule as an owner's own quarterly score submission
                  (see handleScoreSubmit above) — a HOD overriding a score is just as accountable for
                  explaining a low mark, and the owner sees this text right in their acknowledgement
                  banner below once it's saved. */}
              <textarea
                value={overrideRemarkDraft}
                onChange={e => setOverrideRemarkDraft(e.target.value)}
                rows={2}
                placeholder="Rationale — required for scores below 0.7, optional at 0.7+"
                className="w-full text-[11px] rounded-md border border-input bg-background px-2 py-1.5"
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const n = roundToOneDecimal(Number(overrideDraft));
                    if (Number.isNaN(n) || n < 0 || n > 1) { toast.error("Score must be between 0.0 and 1.0, to 1 decimal place"); return; }
                    if (n < 0.7 && !overrideRemarkDraft.trim()) { toast.error("Add a rationale — challenges, bottlenecks, or support needed — before submitting"); return; }
                    overrideKeyResultScore(objectiveId, kr.id, n, isOps, overrideRemarkDraft.trim() || undefined);
                    setOverridingScore(false);
                    toast.success(kr.score !== undefined ? "Score overridden — owner will be notified to acknowledge" : "Score set — owner will be notified to acknowledge");
                  }}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Save
                </button>
                <button onClick={() => setOverridingScore(false)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectiveCard({
  deptGoal,
  objectiveIndex,
  allDeptGoals,
  isHod,
  isTeamOkrEditor,
  viewedUserName,
  isOps,
  dept,
  canOpenOwner,
  onOpenOwner,
  initialKrExpanded,
}: {
  deptGoal: DeptGoal;
  // Position within this Objective's own set (department set, or that specific team's set) — drives
  // the "Objective 1/2/3…" label.
  objectiveIndex: number;
  // Every Objective in this department (both levels) — used to resolve a team-level Objective's
  // `linkedTo` id into a readable label for the "Contributes to" chip.
  allDeptGoals: DeptGoal[];
  isHod: boolean;
  // Delegated leave supervisor granted team-level edit rights by the HOD — see canEdit below.
  isTeamOkrEditor: boolean;
  viewedUserName: string;
  isOps: boolean;
  dept: string;
  canOpenOwner: (ownerName: string, level: "department" | "team") => boolean;
  onOpenOwner: (ownerName: string) => void;
  // True when navigated here via a My Goals card's "view all key results" icon — starts the Key
  // Results list already expanded (read once at mount, matching the focus-then-clear pattern used
  // for focusedObjectiveId elsewhere).
  initialKrExpanded?: boolean;
}) {
  const { deptGoalSkills, updateGoalSkills, addKeyResult, updateObjective, acknowledgeOkrItem, proposeOkrCounter, resolveOkrCounter, staffList } = useApp();
  // Key results are collapsed by default as a single "Key Results (N)" row — click to expand them all.
  const [krSectionExpanded, setKrSectionExpanded] = useState(!!initialKrExpanded);
  const [addingKr, setAddingKr] = useState(false);
  const [krDraft, setKrDraft] = useState({ title: "", owner: "", dueDate: "" });
  const [ackChecked, setAckChecked] = useState(false);
  const [countering, setCountering] = useState(false);
  const [counterTitle, setCounterTitle] = useState("");
  const [counterDueDate, setCounterDueDate] = useState("");
  const [proposingChange, setProposingChange] = useState(false);
  const [proposedTitle, setProposedTitle] = useState("");
  const [proposedDueDate, setProposedDueDate] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    title: deptGoal.title, description: deptGoal.description ?? "", owner: deptGoal.owner, dueDate: deptGoal.dueDate ?? "",
    linkedPhillyGoalId: deptGoal.linkedPhillyGoalId ?? "", linkedPhillyKrId: deptGoal.linkedPhillyKrId ?? "",
  });
  const [showPhillyDialog, setShowPhillyDialog] = useState(false);
  const linkedPhillyKr = findPhillyKr(deptGoal.linkedPhillyGoalId, deptGoal.linkedPhillyKrId);
  const linkedPhillyGoal = findPhillyGoal(deptGoal.linkedPhillyGoalId);
  const [rejectingCounter, setRejectingCounter] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [modifyingCounter, setModifyingCounter] = useState(false);
  const [counterModifyDraft, setCounterModifyDraft] = useState({ title: deptGoal.title, owner: deptGoal.owner, dueDate: deptGoal.dueDate ?? "" });
  const level: "department" | "team" = deptGoal.level === "team" ? "team" : "department";
  const ownerNames = deptGoal.owner ? deptGoal.owner.split(",").map(s => s.trim()).filter(Boolean) : [];
  const skillCatalog = isHCWMDept(dept) ? IHRP_SKILLS_CATALOG : ALL_SKILLS;
  const canEdit = isHod || (level === "team" && isTeamOkrEditor);
  const isPendingForViewer = isPendingAckFor(deptGoal, viewedUserName);

  const keyResults = deptGoal.keyResults ?? [];
  const needsMoreKrs = keyResults.length > 0 && keyResults.length < 3;
  const score = objectiveScore(deptGoal);
  const confidence = keyResults.length > 0 ? objectiveConfidence(deptGoal) : null;
  // Raw numeric average behind the bucketed confidence — shown inside the pill itself (e.g.
  // "GREEN · 0.82") so it's clear how the overall band was derived from the Key Results, not just
  // the bucketed result on its own.
  const confidenceValue = keyResults.length > 0 ? objectiveConfidenceValue(deptGoal) : undefined;
  const isOwnerViewer = isAmongOwners(deptGoal.owner, viewedUserName);
  // A team-level Objective's owner (a leave supervisor/team lead) can propose changes to their own
  // set, subject to HOD/delegated-editor approval — department-level Objectives stay HOD-only.
  const canProposeChange = level === "team" && isOwnerViewer && !canEdit && !isPendingForViewer;
  // What this team-level Objective contributes to, resolved to a readable label for a prominent
  // "Contributes to" chip — linkage was previously stored but never surfaced anywhere in the UI.
  const linkedToLabel = level === "team" && deptGoal.linkedTo
    ? flattenOkrOptions(allDeptGoals.filter(g => g.level !== "team")).find(o => o.id === deptGoal.linkedTo)?.label
    : undefined;
  const anyKrPendingForViewer = keyResults.some(kr => isPendingAckFor(kr, viewedUserName));
  const anyKrOverdue = keyResults.some(kr => isKrOverdue(kr));
  // Any Key Result in this Objective where this viewer personally owes a challenge response
  // (they're the Objective owner or HOD) or an acknowledgement (they're the KR owner) — flags the
  // whole Objective card so it's never buried, with the specific Key Result separately highlighted.
  const anyKrActionNeeded = keyResults.some(kr =>
    (kr.pendingChallengeResponseFor ?? []).includes(viewedUserName)
    || (!!kr.pendingChallengeAckByOwner && isAmongOwners(kr.owner, viewedUserName))
  );

  return (
    <div
      data-objective-id={deptGoal.id}
      className={cn(
        // shadow-md + a hover lift give the card a touch of "3D" depth instead of sitting flat on
        // the page — small and tasteful, not a heavy skeuomorphic treatment.
        "relative rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200",
        // Action-needed (you owe a challenge response/acknowledgement somewhere in this Objective)
        // takes precedence over the plain ownership pastel — it's the more urgent of the two signals.
        // Ownership deliberately relies on a strong border + background wash to read at a glance —
        // no separate "You're an owner" text line, since a thin banner is easy to skim past while a
        // genuinely different-looking card border isn't.
        anyKrActionNeeded
          ? "border-2 border-amber-400/80 ring-2 ring-amber-300/50 dark:ring-amber-700/40"
          // Ownership pastel — a soft sky wash, deliberately far from the red/amber/green RAG family
          // so "this is mine" never reads as a status signal. Ties to the "Owner" sublabel's own sky
          // colour elsewhere in the card, so the same hue consistently means "who owns this."
          : isOwnerViewer
          ? "border-2 border-sky-400/80 dark:border-sky-600/70 bg-sky-50/90 dark:bg-sky-950/30 ring-1 ring-sky-200 dark:ring-sky-800/50"
          : "border border-border bg-gradient-to-br from-card to-muted/30"
      )}
    >
      {/* Department vs team-level accent stripe — absolutely positioned so it never competes with
          the ownership border/background colour above; always present regardless of ownership. */}
      <div className={cn("absolute inset-y-0 left-0 w-1", level === "team" ? "bg-teal-500" : "bg-primary")} aria-hidden="true" />
      {/* Action needed somewhere inside this Objective — the single most urgent thing to notice,
          shown above the ownership banner since it demands a response, not just awareness. */}
      {anyKrActionNeeded && (
        <div className="flex items-center gap-1.5 px-5 pt-3 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          <ActionNeededIcon size={15} title="A key result in this objective needs your response" />
          A Key Result below needs your response
        </div>
      )}
      {/* ── 2–3 KR nudge (highlights the title area, per the 2–5 recommended range) ── */}
      {needsMoreKrs && (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50/60 dark:bg-amber-900/10 border-b border-amber-200/60 dark:border-amber-700/30">
          <AlertCircle className="size-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-800 dark:text-amber-300">Set at least 3 key results for this objective (up to 5 recommended) — currently {keyResults.length}.</span>
        </div>
      )}

      {/* ── Stylish subheader ── */}
      <div className={cn(
        "bg-gradient-to-r from-primary/8 via-primary/5 to-transparent border-b border-border px-5 py-3",
        needsMoreKrs && "ring-1 ring-inset ring-amber-300/60"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                "font-bold text-sm uppercase tracking-wide",
                level === "team" ? "text-teal-600 dark:text-teal-400" : "text-primary"
              )}>
                Objective {objectiveIndex + 1}
              </div>
              {anyKrOverdue && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-rag-red/10 text-rag-red border border-rag-red/30">
                  Overdue KR
                </span>
              )}
              {canEdit && !editing && (
                <button
                  onClick={() => { setEditDraft({ title: deptGoal.title, description: deptGoal.description ?? "", owner: deptGoal.owner, dueDate: deptGoal.dueDate ?? "", linkedPhillyGoalId: deptGoal.linkedPhillyGoalId ?? "", linkedPhillyKrId: deptGoal.linkedPhillyKrId ?? "" }); setEditing(true); }}
                  className="size-5 rounded grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  title="Edit objective"
                >
                  <Pencil className="size-3" />
                </button>
              )}
            </div>
            {level === "team" && deptGoal.teamName ? (
              <div className="text-[11px] text-muted-foreground mt-0.5">{deptGoal.teamName}'s OKRs</div>
            ) : level === "department" && dept ? (
              <div className="text-[11px] text-muted-foreground mt-0.5">{dept} OKRs</div>
            ) : null}
            {linkedToLabel && (
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/40">
                🔗 Contributes to: {linkedToLabel}
              </div>
            )}
            {linkedPhillyGoal && linkedPhillyKr && (
              <button
                onClick={() => setShowPhillyDialog(true)}
                className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40 hover:brightness-95 transition-[filter]"
                title={linkedPhillyKr.title}
              >
                🌐 Linked to Philly Group OKR: {linkedPhillyGoal.title}
              </button>
            )}
            {showPhillyDialog && (
              <PhillyGroupOkrsDialog onClose={() => setShowPhillyDialog(false)} highlightGoalId={deptGoal.linkedPhillyGoalId} highlightKrId={deptGoal.linkedPhillyKrId} />
            )}
            {editing ? (
              <div className="space-y-1.5 mt-1.5">
                <input value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5" placeholder="Objective title" />
                <textarea value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} rows={2} className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5 resize-none" placeholder="Description" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <MultiOwnerSelect value={editDraft.owner} onChange={v => setEditDraft(d => ({ ...d, owner: v }))} dept={dept} staffList={staffList} teamLeadsOnly={level === "team"} />
                  <input type="date" value={editDraft.dueDate} onChange={e => setEditDraft(d => ({ ...d, dueDate: e.target.value }))} className="text-sm rounded-md border border-input bg-background px-2.5 py-1.5" />
                </div>
                {level === "department" && (
                  <select
                    value={editDraft.linkedPhillyGoalId && editDraft.linkedPhillyKrId ? `${editDraft.linkedPhillyGoalId}:${editDraft.linkedPhillyKrId}` : ""}
                    onChange={e => {
                      const [goalId, krId] = e.target.value ? e.target.value.split(":") : ["", ""];
                      setEditDraft(d => ({ ...d, linkedPhillyGoalId: goalId, linkedPhillyKrId: krId }));
                    }}
                    className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5"
                  >
                    <option value="">Not linked to a 2026 Philly Group OKR</option>
                    {phillyGroupGoals.map(pg => (
                      <optgroup key={pg.id} label={pg.title}>
                        {pg.keyResults.map(kr => (
                          <option key={kr.id} value={`${pg.id}:${kr.id}`}>{kr.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      if (!editDraft.title.trim() || !editDraft.owner) { toast.error("Title and owner are required"); return; }
                      updateObjective(deptGoal.id, {
                        ...editDraft,
                        linkedPhillyGoalId: editDraft.linkedPhillyGoalId || undefined,
                        linkedPhillyKrId: editDraft.linkedPhillyKrId || undefined,
                      }, isOps, viewedUserName);
                      setEditing(false);
                      toast.success("Objective updated — owner will be notified to re-acknowledge");
                    }}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-display text-lg leading-snug text-foreground mt-1">{deptGoal.title}</h3>
                {deptGoal.description && <p className="text-xs text-muted-foreground mt-1">{deptGoal.description}</p>}
              </>
            )}
            {ownerNames.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <FieldBadge kind="owner">Owner</FieldBadge>
                {/* Same "you vs. co-owner" fade as KeyResultRow's own owner-name list — the viewer's
                    own name (if a co-owner) stays full-strength, others dim a touch but stay legible. */}
                {ownerNames.map(n => {
                  const isViewer = n === viewedUserName;
                  return canOpenOwner(n, level) ? (
                    <button
                      key={n}
                      onClick={() => onOpenOwner(n)}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors",
                        isViewer ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" : "bg-primary/5 text-primary/60 border-primary/10 hover:bg-primary/10"
                      )}
                    >
                      {n}
                    </button>
                  ) : (
                    <span key={n} className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                      isViewer ? "bg-muted text-foreground border-border" : "bg-muted/50 text-foreground/55 border-border/60"
                    )}>
                      {n}
                    </span>
                  );
                })}
              </div>
            )}
            {canEdit ? (
              <div className="flex items-start gap-2 mt-2">
                <FieldBadge kind="skills" className="mt-0.5">Skills Needed</FieldBadge>
                <SkillsNeededPicker value={deptGoalSkills[deptGoal.id] ?? []} onChange={skills => updateGoalSkills(deptGoal.id, skills)} catalog={skillCatalog} />
              </div>
            ) : (deptGoalSkills[deptGoal.id]?.length ?? 0) > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <FieldBadge kind="skills">Skills Needed</FieldBadge>
                {deptGoalSkills[deptGoal.id]!.map(skill => (
                  <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal/10 text-teal border border-teal/20">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right min-w-0 space-y-1.5">
            <div>
              <div className="flex justify-end"><FieldBadge kind="confidence">Confidence</FieldBadge></div>
              <div className="flex items-center justify-end gap-2 flex-wrap mt-0.5">
                {confidence ? (
                  <RagPill rag={confidence} value={confidenceValue} />
                ) : (
                  <span className="text-[10px] text-muted-foreground">No key results yet</span>
                )}
              </div>
            </div>
            <div>
              <div className="flex justify-end"><FieldBadge kind="score">Quarterly Score</FieldBadge></div>
              <div className="flex items-center justify-end mt-0.5">
                {score !== undefined ? (
                  <RagPill rag={scoreToRag(score)} value={score} />
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {keyResults.length > 0 ? `Pending — ${keyResults.filter(k => k.score !== undefined).length}/${keyResults.length} scored` : "—"}
                  </span>
                )}
              </div>
              {score !== undefined && objectiveScoreQuarterLabel(deptGoal) && (
                <div className="text-[9px] font-medium text-muted-foreground mt-0.5">{objectiveScoreQuarterLabel(deptGoal)} (past quarter)</div>
              )}
            </div>
            {deptGoal.dueDate && <div className="text-[10px] text-muted-foreground mt-1">Due {formatDueDate(deptGoal.dueDate)}</div>}
            <div className="text-[10px] text-muted-foreground mt-1">{keyResults.length} key result{keyResults.length === 1 ? "" : "s"}</div>
          </div>
        </div>
      </div>

      {/* ── Objective owner-or-HOD-or-secondary-owner ack-or-counterpropose — see the matching
          comment on KeyResultRow's own version above for why this no longer gates on isOwnerViewer
          and why the copy is actor-neutral. ── */}
      {isPendingForViewer && !deptGoal.counterProposal && (
          <div className="mx-5 mt-3 rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/30 p-3 space-y-1.5">
            <div className="text-xs text-amber-800 dark:text-amber-300">
              {deptGoal.pendingChangeType === "hodEdit"
                ? <>This objective was updated. Please review and acknowledge.</>
                : <>You've been appointed owner of this objective. Guidelines: update RAG confidence monthly, and score contributing key results by {formatGoalStatusDueDate()}.</>}
            </div>
            {deptGoal.lastCounterRejection && (
              <div className="text-xs text-rag-red/90 bg-rag-red/5 border border-rag-red/20 rounded-md px-2 py-1.5">
                Your counterproposal was declined{deptGoal.lastCounterRejection.reason ? <>: "{deptGoal.lastCounterRejection.reason}"</> : "."} You can re-acknowledge the original appointment above, or counterpropose again.
              </div>
            )}
            {!countering ? (
              <>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} className="rounded" />
                  {deptGoal.pendingChangeType === "hodScore" ? "I acknowledge this score"
                    : deptGoal.pendingChangeType === "hodEdit" ? "I acknowledge this update"
                    : "I acknowledge these guidelines"}
                </label>
                <div className="flex gap-1.5">
                  <button disabled={!ackChecked} onClick={() => acknowledgeOkrItem(deptGoal.id, null, viewedUserName, isOps)} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                    {deptGoal.pendingChangeType === "hodScore" ? "Acknowledge Score"
                      : deptGoal.pendingChangeType === "hodEdit" ? "Acknowledge Update"
                      : "Accept Appointment"}
                  </button>
                  {isOwnerViewer && (
                    <button onClick={() => setCountering(true)} className="px-3 py-1.5 rounded-md border border-border text-xs">Counterpropose</button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground">Suggest alternative wording (optional)</label>
                  <input value={counterTitle} onChange={e => setCounterTitle(e.target.value)} className="w-full text-xs rounded-md border border-input bg-background px-2 py-1" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Suggest alternative due date (optional)</label>
                  <input type="date" value={counterDueDate} onChange={e => setCounterDueDate(e.target.value)} className="text-xs rounded-md border border-input bg-background px-2 py-1" />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      if (!counterTitle.trim() && !counterDueDate) { toast.error("Suggest a different title, a different due date, or both"); return; }
                      proposeOkrCounter(deptGoal.id, null, { title: counterTitle.trim() || undefined, dueDate: counterDueDate || undefined }, isOps, viewedUserName);
                      setCountering(false);
                      toast.success("Counterproposal sent for review");
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
      {deptGoal.counterProposal && canEdit && (
        <div className="mx-5 mt-3 rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 p-3 space-y-1.5">
          <div className="text-xs text-violet-800 dark:text-violet-300">
            {deptGoal.counterProposal.proposedBy} proposed a change:{" "}
            {deptGoal.counterProposal.title && <>title <strong>"{deptGoal.counterProposal.title}"</strong></>}
            {deptGoal.counterProposal.title && deptGoal.counterProposal.dueDate && <> and </>}
            {deptGoal.counterProposal.dueDate && <>due date <strong>{new Date(deptGoal.counterProposal.dueDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</strong></>}
          </div>
          {!rejectingCounter && !modifyingCounter && (
            <div className="flex gap-1.5">
              <button onClick={() => resolveOkrCounter(deptGoal.id, null, { type: "accept" }, isOps, viewedUserName)} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">Accept</button>
              <button onClick={() => setRejectingCounter(true)} className="px-3 py-1.5 rounded-md border border-border text-xs">Reject</button>
              <button
                onClick={() => { setCounterModifyDraft({ title: deptGoal.counterProposal!.title ?? deptGoal.title, owner: deptGoal.owner, dueDate: deptGoal.counterProposal!.dueDate ?? deptGoal.dueDate ?? "" }); setModifyingCounter(true); }}
                className="px-3 py-1.5 rounded-md border border-border text-xs"
              >
                Modify
              </button>
            </div>
          )}
          {rejectingCounter && (
            <div className="space-y-1.5">
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} className="w-full text-xs rounded-md border border-input bg-background px-2 py-1" placeholder="Optional reason for the owner…" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => { resolveOkrCounter(deptGoal.id, null, { type: "reject", reason: rejectReason.trim() || undefined }, isOps); setRejectingCounter(false); setRejectReason(""); toast.success("Counterproposal rejected — owner can re-acknowledge the original appointment"); }}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Confirm Reject
                </button>
                <button onClick={() => { setRejectingCounter(false); setRejectReason(""); }} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
              </div>
            </div>
          )}
          {modifyingCounter && (
            <div className="space-y-1.5">
              <input value={counterModifyDraft.title} onChange={e => setCounterModifyDraft(d => ({ ...d, title: e.target.value }))} className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1.5" placeholder="Objective title" />
              <MultiOwnerSelect value={counterModifyDraft.owner} onChange={v => setCounterModifyDraft(d => ({ ...d, owner: v }))} dept={dept} staffList={staffList} teamLeadsOnly={level === "team"} />
              <input type="date" value={counterModifyDraft.dueDate} onChange={e => setCounterModifyDraft(d => ({ ...d, dueDate: e.target.value }))} className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5" />
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (!counterModifyDraft.title.trim() || !counterModifyDraft.owner) { toast.error("Title and owner are required"); return; }
                    resolveOkrCounter(deptGoal.id, null, { type: "modify", changes: counterModifyDraft }, isOps, viewedUserName);
                    setModifyingCounter(false);
                    toast.success("Appointment modified — owner will be notified to re-acknowledge");
                  }}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Save
                </button>
                <button onClick={() => setModifyingCounter(false)} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team lead's own propose-a-change affordance (post-acceptance) */}
      {canProposeChange && !deptGoal.counterProposal && (
        <div className="mx-5 mt-3">
          {!proposingChange ? (
            <button onClick={() => setProposingChange(true)} className="text-xs text-primary font-medium">Propose Change to This Objective</button>
          ) : (
            <div className="space-y-1.5">
              <input value={proposedTitle} onChange={e => setProposedTitle(e.target.value)} placeholder="Suggest alternative wording (optional)" className="w-full text-xs rounded-md border border-input bg-background px-2 py-1" />
              <input type="date" value={proposedDueDate} onChange={e => setProposedDueDate(e.target.value)} className="text-xs rounded-md border border-input bg-background px-2 py-1" />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (!proposedTitle.trim() && !proposedDueDate) { toast.error("Suggest a different title, a different due date, or both"); return; }
                    proposeOkrCounter(deptGoal.id, null, { title: proposedTitle.trim() || undefined, dueDate: proposedDueDate || undefined }, isOps, viewedUserName);
                    setProposingChange(false);
                    toast.success("Change proposed to your HOD for approval");
                  }}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Send
                </button>
                <button onClick={() => setProposingChange(false)} className="px-2.5 py-1 rounded-md border border-border text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Key Results — a single expandable "Key Results (N)" row; expanding reveals every Key
          Result inline, each labelled "Key Result 1/2/3…" within its own card (see KeyResultRow) ── */}
      <div className="px-5 py-4 space-y-2 bg-muted/10">
        <button
          onClick={() => setKrSectionExpanded(v => !v)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 hover:bg-muted/40 transition-colors text-left"
        >
          <span className="flex items-center gap-2 min-w-0">
            {krSectionExpanded ? <ChevronDown className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />}
            <span className="text-xs font-semibold text-foreground">Key Results ({keyResults.length})</span>
            {anyKrPendingForViewer && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40 shrink-0">Pending</span>
            )}
          </span>
          {!krSectionExpanded && (
            <span className="text-[10px] text-muted-foreground shrink-0">{keyResults.filter(k => k.score !== undefined).length}/{keyResults.length} scored</span>
          )}
        </button>
        {krSectionExpanded && (
          <div className="space-y-2">
            {keyResults.map((kr, idx) => (
              <KeyResultRow
                key={kr.id}
                objectiveId={deptGoal.id} kr={kr} krIndex={idx} isOps={isOps} isHod={isHod} isTeamOkrEditor={isTeamOkrEditor}
                isOwnerViewer={isAmongOwners(kr.owner, viewedUserName)} viewedUserName={viewedUserName} level={level} dept={dept}
                canOpenOwner={canOpenOwner} onOpenOwner={onOpenOwner}
              />
            ))}
          </div>
        )}
        {keyResults.length === 0 && <div className="text-xs text-muted-foreground text-center py-3">No key results yet.</div>}

        {canEdit && !addingKr && keyResults.length < 5 && (
          <button onClick={() => setAddingKr(true)} className="flex items-center gap-1 text-xs text-primary font-medium mt-1">
            <Plus className="size-3.5" /> Add Key Result
          </button>
        )}
        {canEdit && keyResults.length >= 5 && (
          <div className="text-[11px] text-muted-foreground italic mt-1">Maximum 5 key results reached — remove one to add another.</div>
        )}
        {canEdit && addingKr && (
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2 mt-1">
            <input placeholder="Key result title" value={krDraft.title} onChange={e => setKrDraft(d => ({ ...d, title: e.target.value }))} className="w-full text-sm rounded-md border border-input bg-background px-2.5 py-1.5" />
            <MultiOwnerSelect value={krDraft.owner} onChange={v => setKrDraft(d => ({ ...d, owner: v }))} dept={dept} staffList={staffList} />
            <input type="date" value={krDraft.dueDate} onChange={e => setKrDraft(d => ({ ...d, dueDate: e.target.value }))} className="text-sm rounded-md border border-input bg-background px-2.5 py-1.5" />
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (!krDraft.title.trim() || !krDraft.owner || !krDraft.dueDate) { toast.error("Title, owner, and due date are required"); return; }
                  // Max 5 Key Results per owner, department-wide — separate from the existing max-5-
                  // per-Objective cap above. Checked against every Objective in this department, not
                  // just this one, since that's where the person is actually being stretched thin.
                  const counts = krOwnerCounts(allDeptGoals);
                  const draftOwnerNames = krDraft.owner.split(",").map(s => s.trim()).filter(Boolean);
                  const overLimit = draftOwnerNames.filter(n => (counts[n] ?? 0) >= MAX_KRS_PER_OWNER);
                  if (overLimit.length > 0) {
                    const roomToSpare = staffList
                      .filter(s => s.dept === dept && !overLimit.includes(s.name) && (counts[s.name] ?? 0) < MAX_KRS_PER_OWNER)
                      .sort((a, b) => (counts[a.name] ?? 0) - (counts[b.name] ?? 0))
                      .slice(0, 5)
                      .map(s => `${s.name} (${counts[s.name] ?? 0}/${MAX_KRS_PER_OWNER})`);
                    toast.error(
                      `${overLimit.join(", ")} already ${overLimit.length > 1 ? "have" : "has"} ${MAX_KRS_PER_OWNER} key results assigned — that's the max per person.` +
                      (roomToSpare.length > 0 ? ` Consider instead: ${roomToSpare.join(", ")}.` : " No one else in this department has room right now."),
                      { duration: 8000 },
                    );
                    return;
                  }
                  addKeyResult(deptGoal.id, { title: krDraft.title, owner: krDraft.owner, dueDate: krDraft.dueDate, ragConfidence: "green" }, isOps, viewedUserName);
                  setKrDraft({ title: "", owner: "", dueDate: "" });
                  setAddingKr(false);
                  toast.success("Key result added — owner will be notified to acknowledge");
                }}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
              >
                Add
              </button>
              <button onClick={() => setAddingKr(false)} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Objective panel (HOD-only) — department or team level, with an inline Key Result
// editor. Team-level requires a custom team name (grouped/labelled as "{teamName}'s OKRs" — see
// the main TeamSection layout below) and a link to a department-level Objective or Key Result. ────

function CreateObjectivePanel({
  dept, departmentGoals, isOps, onClose, lockToTeamLevel,
}: {
  dept: string; departmentGoals: DeptGoal[]; isOps: boolean; onClose: () => void;
  // True when opened by a delegated team-OKR editor (not the HOD) — forces team-level, hides the toggle.
  lockToTeamLevel?: boolean;
}) {
  const { addObjective, staffList } = useApp();
  const [level, setLevel] = useState<"department" | "team">(lockToTeamLevel ? "team" : "department");
  const [teamName, setTeamName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkedTo, setLinkedTo] = useState("");
  const [krs, setKrs] = useState<{ title: string; owner: string; dueDate: string }[]>([]);
  const [krDraft, setKrDraft] = useState({ title: "", owner: "", dueDate: "" });

  const existingTeamNames = Array.from(new Set(departmentGoals.filter(g => g.level === "team" && g.teamName).map(g => g.teamName!)));
  const deptLevelOptions = flattenOkrOptions(departmentGoals.filter(g => g.level !== "team"));
  const needsMoreKrs = krs.length > 0 && krs.length < 3;
  const MAX_OBJECTIVES_PER_SET = 5;
  const MAX_KRS_PER_OBJECTIVE = 5;
  const existingSetCount = level === "department"
    ? departmentGoals.filter(g => g.level !== "team").length
    : departmentGoals.filter(g => g.level === "team" && g.teamName === teamName.trim()).length;
  const atSetCap = existingSetCount >= MAX_OBJECTIVES_PER_SET;
  const atKrCap = krs.length >= MAX_KRS_PER_OBJECTIVE;

  const addKrDraft = () => {
    if (atKrCap) { toast.error(`Maximum ${MAX_KRS_PER_OBJECTIVE} key results per objective.`); return; }
    if (!krDraft.title.trim() || !krDraft.owner || !krDraft.dueDate) { toast.error("Key result title, owner, and due date are required"); return; }
    setKrs(prev => [...prev, krDraft]);
    setKrDraft({ title: "", owner: "", dueDate: "" });
  };

  const canSubmit = !atSetCap && title.trim() && owner && dueDate && krs.length >= 1 && (level === "department" || (teamName.trim() && linkedTo));

  const submit = () => {
    if (atSetCap) { toast.error(`Maximum ${MAX_OBJECTIVES_PER_SET} objectives reached for this ${level === "team" ? "team" : "department"} set.`); return; }
    if (!canSubmit) { toast.error("Title, owner, due date, at least 1 key result — and for team-level, a team name and link — are all required"); return; }
    addObjective({
      title, description, level, teamName: level === "team" ? teamName.trim() : undefined,
      owner, dueDate, progress: 0, linkedTo: level === "team" ? linkedTo : undefined,
      keyResults: krs.map(k => ({ ...k, ragConfidence: "green" as RAG })),
    }, isOps);
    toast.success(`${level === "team" ? `${teamName.trim()}'s OKRs` : "Department objective"} created — owners will be notified to acknowledge`);
    onClose();
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
      {!lockToTeamLevel && (
        <div className="flex items-center gap-2">
          <button onClick={() => setLevel("department")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border", level === "department" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Department-level</button>
          <button onClick={() => setLevel("team")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border", level === "team" ? "bg-primary text-primary-foreground border-primary" : "border-border")}>Team-level</button>
        </div>
      )}
      {atSetCap && (
        <div className="flex items-center gap-2 text-[11px] text-rag-red bg-rag-red/8 border border-rag-red/25 rounded-md px-2.5 py-1.5">
          <AlertCircle className="size-3.5 shrink-0" />
          Maximum {MAX_OBJECTIVES_PER_SET} objectives reached for this {level === "team" && teamName.trim() ? `"${teamName.trim()}"` : level} set (currently {existingSetCount}).
        </div>
      )}

      {level === "team" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Team Name</label>
            <input
              list="existing-team-names" value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Human Capital"
              className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-2.5 py-1.5"
            />
            <datalist id="existing-team-names">{existingTeamNames.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Links to (department objective/KR)</label>
            <select value={linkedTo} onChange={e => setLinkedTo(e.target.value)} className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-2.5 py-1.5">
              <option value="">Select…</option>
              {deptLevelOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      <input placeholder="Objective title" value={title} onChange={e => setTitle(e.target.value)} className="w-full text-sm rounded-lg border border-input bg-background px-2.5 py-1.5" />
      <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full text-sm rounded-lg border border-input bg-background px-2.5 py-1.5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <MultiOwnerSelect value={owner} onChange={setOwner} dept={dept} staffList={staffList} teamLeadsOnly={level === "team"} />
          {level === "team" && <p className="text-[10px] text-muted-foreground mt-1">Must be a manager/team lead — they'll be able to propose changes to this set.</p>}
        </div>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm rounded-lg border border-input bg-background px-2.5 py-1.5" />
      </div>

      <div className="rounded-lg border border-border/60 bg-background p-3 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Key Results ({krs.length}/{MAX_KRS_PER_OBJECTIVE})</div>
        {needsMoreKrs && <div className="text-[11px] text-amber-700 dark:text-amber-400">Set at least 3 key results for this objective (up to {MAX_KRS_PER_OBJECTIVE}).</div>}
        {krs.map((k, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded-md px-2 py-1.5">
            <span className="truncate">{k.title} — {k.owner}</span>
            <button onClick={() => setKrs(prev => prev.filter((_, idx) => idx !== i))} className="text-rag-red shrink-0"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
        {atKrCap ? (
          <div className="text-[11px] text-muted-foreground italic">Maximum {MAX_KRS_PER_OBJECTIVE} key results reached — remove one to add another.</div>
        ) : (
          <>
            <input placeholder="Key result title" value={krDraft.title} onChange={e => setKrDraft(d => ({ ...d, title: e.target.value }))} className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5" />
            <MultiOwnerSelect value={krDraft.owner} onChange={v => setKrDraft(d => ({ ...d, owner: v }))} dept={dept} staffList={staffList} />
            <div className="flex items-center gap-2">
              <input type="date" value={krDraft.dueDate} onChange={e => setKrDraft(d => ({ ...d, dueDate: e.target.value }))} className="text-xs rounded-md border border-input bg-background px-2 py-1.5" />
              <button onClick={addKrDraft} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus className="size-3.5" /> Add Key Result</button>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={atSetCap} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed">Create Objective</button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border text-xs">Cancel</button>
      </div>
    </div>
  );
}

// ── Contribution Overview Dialog ──────────────────────────────────────────────
// First pop-up: shows all contributors for a dept-goal.
// HODs can click a member's name to inline-edit their contribution details.
// Leave supervisors click their direct reports' names to open the full goals drawer.

// ── HOD: recommend a brand-new performance goal to one or more team members ────────────────────

const PERF_GOAL_MAX_TEAM = 5;

function RecommendNewGoalPanel({
  deptGoalId,
  deptGoalTitle,
  departmentGoals,
  members,
  onSubmit,
  onCancel,
}: {
  deptGoalId: string;
  deptGoalTitle: string;
  departmentGoals: DeptGoal[];
  members: TeamMember[];
  onSubmit: (g: { title: string; description: string; metric: string; memberIds: string[]; linkedDept: string }) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("");
  const [linkedDept, setLinkedDept] = useState(deptGoalId);

  const toggleMember = (id: string, atCap: boolean) => {
    if (atCap) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canSubmit = title.trim() && metric.trim() && selected.size > 0;
  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), description: description.trim(), metric: metric.trim(), memberIds: [...selected], linkedDept });
  };

  return (
    <div className="px-6 py-4 border-b border-border bg-primary/5 space-y-3 animate-in slide-in-from-top-1 duration-150">
      <div className="text-sm font-semibold text-primary">Recommend a New Goal for "{deptGoalTitle}"</div>

      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Team Member(s)</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {members.map(m => {
            const atCap = m.goals.length >= PERF_GOAL_MAX_TEAM;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id, atCap)}
                disabled={atCap}
                title={atCap ? "Maximum 5 performance goals reached" : undefined}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors",
                  atCap
                    ? "bg-muted/40 border-border/60 text-muted-foreground/40 cursor-not-allowed"
                    : selected.has(m.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/40 text-foreground/80"
                )}
              >
                <span className="size-4 rounded-full bg-secondary/80 text-primary grid place-items-center text-[9px] font-medium">{m.avatar}</span>
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Team Goal Linkage</label>
        <select
          value={linkedDept}
          onChange={e => setLinkedDept(e.target.value)}
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {flattenOkrOptions(departmentGoals).map(o => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Goal Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Drive adoption of the new onboarding portal"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What will they do and why does it matter?"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Key Result / Metric</label>
        <input
          value={metric}
          onChange={e => setMetric(e.target.value)}
          placeholder="e.g. 80% adoption by Q4"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        Lands directly in each selected member's goals, linked to the chosen team goal at 0% contribution — set the weightage below once they're added. Each member has 7 working days to acknowledge, or a 5-point penalty applies.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 font-medium transition-opacity"
        >
          Recommend Goal{selected.size > 1 ? ` to ${selected.size} members` : ""}
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContributionOverviewDialog({
  deptGoal,
  contributors,
  allMembers,
  onClose,
  onOpenMember,
  isHod,
  viewedUserName,
  hodId,
  hodName,
}: {
  deptGoal: DeptGoal;
  contributors: Array<{ member: TeamMember; goal: TeamMember["goals"][number] }>;
  allMembers: TeamMember[];
  onClose: () => void;
  onOpenMember: (m: TeamMember) => void;
  isHod: boolean;
  viewedUserName: string;
  hodId: string;
  hodName: string;
}) {
  const { modifyGoal, departmentGoals, recommendGoal, pendingGoalEditProposals, proposeGoalEdit, resolveGoalEditProposal } = useApp();
  const [recommendingNewGoal, setRecommendingNewGoal] = useState(false);

  // HOD: one always-visible draft per contributor, keyed "memberId-goalId". Seeded from a pending
  // supervisor-proposed edit when one exists, so approving and re-balancing % contribution happen
  // in the same "Save Changes" click the HOD already uses for their own edits.
  const [hodDrafts, setHodDrafts] = useState<Record<string, {
    description: string; metric: string; linkedDept: string; weightage: number;
  }>>({});

  const proposalFor = (memberId: string, goalId: string) =>
    pendingGoalEditProposals.find(p => p.source === "supervisor" && p.memberId === memberId && p.goalId === goalId);

  useEffect(() => {
    if (!isHod) return;
    setHodDrafts(prev => {
      const next = { ...prev };
      contributors.forEach(({ member, goal }) => {
        const k = `${member.id}-${goal.id}`;
        if (!(k in next)) {
          const proposal = proposalFor(member.id, goal.id);
          next[k] = {
            description: proposal?.changes.description ?? goal.description,
            metric: proposal?.changes.metric ?? goal.metric,
            linkedDept: proposal?.changes.linkedDept ?? goal.linkedDept ?? "",
            weightage: goal.weightage ?? 0,
          };
        }
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHod, contributors]);

  const updateHodDraft = (k: string, field: string, value: string | number) =>
    setHodDrafts(prev => {
      if (!prev[k]) return prev;
      const next = { ...prev[k], [field]: value };
      // Re-linking to a different team goal resets the % contribution to 0
      if (field === "linkedDept" && value !== prev[k].linkedDept) next.weightage = 0;
      return { ...prev, [k]: next };
    });

  const saveHodEdit = (memberId: string, goalId: string, memberName: string) => {
    const k = `${memberId}-${goalId}`;
    const draft = hodDrafts[k];
    if (!draft) return;
    modifyGoal(memberId, goalId, draft, false);
    const proposal = proposalFor(memberId, goalId);
    if (proposal) resolveGoalEditProposal(proposal.id);
    toast.success(`Changes saved — ${memberName} will be notified to acknowledge`);
  };

  const discardProposal = (memberId: string, goalId: string, goal: TeamMember["goals"][number]) => {
    const proposal = proposalFor(memberId, goalId);
    if (!proposal) return;
    resolveGoalEditProposal(proposal.id);
    const k = `${memberId}-${goalId}`;
    setHodDrafts(prev => ({ ...prev, [k]: { description: goal.description, metric: goal.metric, linkedDept: goal.linkedDept ?? "", weightage: goal.weightage ?? 0 } }));
    toast(`Proposal discarded — ${goal.title} left unchanged`);
  };

  // Direct supervisor: click row to toggle edit form
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    description: string; metric: string; linkedDept: string; weightage: number;
  } | null>(null);

  const startEdit = (member: TeamMember, goal: TeamMember["goals"][number]) => {
    setEditingKey(`${member.id}-${goal.id}`);
    setEditDraft({ description: goal.description, metric: goal.metric, linkedDept: goal.linkedDept ?? "", weightage: goal.weightage ?? 0 });
  };
  const cancelEdit = () => { setEditingKey(null); setEditDraft(null); };
  // A direct (non-HOD) supervisor's edit is proposed, not applied — it only goes live once the HOD
  // approves it, since the HOD is the one accountable for keeping every contributing goal aligned
  // and for re-balancing % contribution when anything changes.
  const saveEdit = (memberId: string, goalId: string, memberName: string, goalTitle: string) => {
    if (!editDraft) return;
    proposeGoalEdit({
      memberId, memberName, goalId, goalTitle,
      changes: { description: editDraft.description, metric: editDraft.metric, linkedDept: editDraft.linkedDept },
      source: "supervisor", proposedBy: viewedUserName, hodId, hodName,
    });
    toast.success(`Change proposed — sent to ${hodName} for approval`);
    cancelEdit();
  };

  const liveTotal = contributors.reduce((sum, { goal }) => sum + (goal.weightage ?? 0), 0);
  // For HOD, reflect draft weightages in the footer total
  const displayTotal = isHod
    ? contributors.reduce((sum, { member, goal }) => {
        const k = `${member.id}-${goal.id}`;
        return sum + (hodDrafts[k]?.weightage ?? goal.weightage ?? 0);
      }, 0)
    : liveTotal;
  const hasIssue = displayTotal !== 100;

  // Any 0% draft = newly linked goal that still needs a weightage set
  const hasZeroWeightGoal = isHod && contributors.some(({ member, goal }) => {
    const k = `${member.id}-${goal.id}`;
    return (hodDrafts[k]?.weightage ?? goal.weightage ?? 0) === 0;
  });

  // HOD cannot close if total ≠ 100% AND there are no newly linked 0% goals
  // (0% goals are a legitimate in-progress state — notify but allow close)
  const handleClose = () => {
    if (isHod && hasIssue && !hasZeroWeightGoal) {
      toast.error("Cannot close — total contribution must equal 100% before leaving");
      return;
    }
    if (isHod && hasIssue && hasZeroWeightGoal) {
      toast.warning("Reminder: set the % contribution for the newly linked goal — total must reach 100%");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Team Contribution Overview</div>
              <div className="font-display text-lg leading-snug text-foreground">{deptGoal.title}</div>
            </div>
            <button
              onClick={handleClose}
              title={isHod && hasIssue && !hasZeroWeightGoal ? "Adjust weightages to 100% before closing" : undefined}
              className={cn(
                "size-7 rounded-full grid place-items-center shrink-0 mt-0.5 transition-colors",
                isHod && hasIssue && !hasZeroWeightGoal
                  ? "text-muted-foreground/30 cursor-not-allowed"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <X className="size-3.5" />
            </button>
          </div>
          {isHod && !recommendingNewGoal && (
            <button
              onClick={() => setRecommendingNewGoal(true)}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-colors"
            >
              <Plus className="size-3.5" /> Recommend New Goal for Team Member(s)
            </button>
          )}
        </div>

        {isHod && recommendingNewGoal && (
          <RecommendNewGoalPanel
            deptGoalId={deptGoal.id}
            deptGoalTitle={deptGoal.title}
            departmentGoals={departmentGoals}
            members={allMembers}
            onCancel={() => setRecommendingNewGoal(false)}
            onSubmit={({ title, description, metric, memberIds, linkedDept }) => {
              recommendGoal(memberIds, { title, description, metric, linkedDept }, viewedUserName);
              setRecommendingNewGoal(false);
              toast.success(`Goal recommended to ${memberIds.length} member${memberIds.length > 1 ? "s" : ""} — 7 working days to acknowledge, or a 5-point penalty applies`);
            }}
          />
        )}

        {/* Sum-mismatch alert */}
        {hasIssue && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-rag-amber/10 border-b border-rag-amber/25">
            <TriangleAlert className="size-3.5 text-amber-foreground shrink-0" />
            <span className="text-xs text-amber-foreground">
              {hasZeroWeightGoal
                ? <>Newly linked goal has 0% contribution — assign a weightage so the total reaches 100% (currently <strong>{displayTotal}%</strong>)</>
                : <>Contributions total <strong>{displayTotal}%</strong> — must equal exactly 100% before closing</>
              }
            </span>
          </div>
        )}

        {/* Contributors list */}
        <div className={cn("max-h-[72vh] overflow-y-auto", isHod ? "px-6 py-4 space-y-3" : "divide-y divide-border/50")}>
          {contributors.map(({ member, goal }, idx) => {
            const isDirectSupervisor = !isHod && member.directManager === viewedUserName;
            const canEdit = isHod || isDirectSupervisor;
            const k = `${member.id}-${goal.id}`;
            const hodDraft = hodDrafts[k];
            const pendingProposal = isHod ? proposalFor(member.id, goal.id) : undefined;
            const isEditingThis = editingKey === k;
            const livePct = isHod && hodDraft ? hodDraft.weightage : (goal.weightage ?? 0);
            const barTotal = isHod
              ? contributors.reduce((s, c) => {
                  const ck = `${c.member.id}-${c.goal.id}`;
                  return s + (hodDrafts[ck]?.weightage ?? c.goal.weightage ?? 0);
                }, 0)
              : liveTotal;

            const isNewlyLinked = livePct === 0;

            return (
              <div key={`${member.id}-${goal.id}-${idx}`} className={cn(!isHod && "px-6 py-5")}>
                {isHod ? (
                  /* ── HOD: always-visible edit form per member, wrapped in a card ── */
                  <div className={cn(
                    "rounded-xl border shadow-sm p-4 space-y-3 transition-colors",
                    isNewlyLinked
                      ? "border-orange-300 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-900/10"
                      : "border-border bg-muted/20 dark:bg-muted/10"
                  )}>
                    {/* Member identity + Open Full Goals CTA */}
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-secondary text-primary grid place-items-center font-medium text-sm shrink-0">
                        {member.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-foreground leading-none">{member.name}</div>
                          {isNewlyLinked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-500/40 font-medium">
                              Needs weighting
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{member.role}</div>
                      </div>
                      <button
                        onClick={() => { onOpenMember(member); onClose(); }}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                      >
                        <ExternalLink className="size-3.5" />
                        {member.name.split(" ")[0]}'s Full Goals
                      </button>
                    </div>

                    {/* Goal title pill */}
                    <div className={cn(
                      "text-[11px] font-medium rounded-lg px-3 py-1.5 leading-relaxed",
                      isNewlyLinked ? "bg-orange-100/60 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300" : "bg-muted/60 text-muted-foreground"
                    )}>
                      {goal.title}
                    </div>

                    {pendingProposal && (
                      <div className="flex items-center gap-1.5 text-[10px] text-primary bg-primary/8 border border-primary/25 rounded-lg px-3 py-1.5">
                        <Pencil className="size-3 shrink-0" />
                        Proposed by {pendingProposal.proposedBy} on {pendingProposal.proposedDate} — review below, then Save Changes to approve or discard.
                      </div>
                    )}

                    {hodDraft && (
                      <div className="space-y-3">
                        {/* Goal Description — full width */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Goal Description</label>
                          <textarea
                            value={hodDraft.description}
                            onChange={e => updateHodDraft(k, "description", e.target.value)}
                            rows={3}
                            className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>

                        {/* Key Result — full width textarea so long sentences fit */}
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Key Result</label>
                          <textarea
                            value={hodDraft.metric}
                            onChange={e => updateHodDraft(k, "metric", e.target.value)}
                            rows={2}
                            className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>

                        {/* % Contribution (compact) + Team Goal Linkage (wider) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className={cn("text-[10px] font-semibold uppercase tracking-widest", isNewlyLinked ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
                              % Contribution{isNewlyLinked ? " *" : ""}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={hodDraft.weightage}
                              onChange={e => updateHodDraft(k, "weightage", Math.max(0, Math.min(100, Number(stripLeadingZero(e.target.value)))))}
                              className={cn(
                                "w-full mt-1.5 text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring",
                                isNewlyLinked
                                  ? "border-orange-300 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-500/50"
                                  : "border-input bg-background"
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Team Goal Linkage</label>
                            <select
                              value={hodDraft.linkedDept}
                              onChange={e => updateHodDraft(k, "linkedDept", e.target.value)}
                              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">No linkage</option>
                              {flattenOkrOptions(departmentGoals).map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Contribution bar reflecting live draft */}
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", barTotal === 100 ? "bg-teal" : isNewlyLinked ? "bg-orange-400" : "bg-rag-amber")}
                              style={{ width: `${Math.min(livePct, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-[10px] font-bold shrink-0 w-8 text-right", barTotal === 100 ? "text-teal" : isNewlyLinked ? "text-orange-600 dark:text-orange-400" : "text-amber-foreground")}>
                            {livePct}%
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => saveHodEdit(member.id, goal.id, member.name)}
                            className={cn(
                              "text-sm font-medium px-4 py-2 rounded-lg transition-opacity",
                              isNewlyLinked
                                ? "bg-orange-500 text-white hover:opacity-90"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            )}
                          >
                            {pendingProposal ? "Approve & Save" : "Save Changes"}
                          </button>
                          {pendingProposal && (
                            <button
                              onClick={() => discardProposal(member.id, goal.id, goal)}
                              className="text-sm font-medium px-4 py-2 rounded-lg border border-rag-red/30 text-rag-red hover:bg-rag-red/10 transition-colors"
                            >
                              Discard Proposal
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Direct supervisor / read-only: click entire row to toggle ── */
                  <div>
                    {canEdit ? (
                      <button
                        onClick={() => isEditingThis ? cancelEdit() : startEdit(member, goal)}
                        className={cn(
                          "flex items-center gap-3 w-full text-left rounded-xl px-3 py-2 -mx-3 transition-colors",
                          isEditingThis ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="size-9 rounded-full bg-secondary text-primary grid place-items-center font-medium text-sm shrink-0">
                          {member.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm font-semibold leading-none transition-colors", isEditingThis ? "text-primary" : "text-primary")}>
                            {member.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{goal.title}</div>
                        </div>
                        <ChevronRight className={cn("size-4 text-primary/60 shrink-0 transition-transform duration-200", isEditingThis && "rotate-90")} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-secondary text-primary grid place-items-center font-medium text-sm shrink-0">
                          {member.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground leading-none">{member.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{goal.title}</div>
                        </div>
                      </div>
                    )}

                    {/* Contribution bar */}
                    <div className="flex items-center gap-2.5 mt-2.5 ml-12">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", liveTotal === 100 ? "bg-teal" : "bg-rag-amber")}
                          style={{ width: `${Math.min(goal.weightage ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-bold shrink-0 w-8 text-right", liveTotal === 100 ? "text-teal" : "text-amber-foreground")}>
                        {goal.weightage ?? 0}%
                      </span>
                    </div>

                    {/* Expanded edit form for direct supervisor */}
                    {canEdit && isEditingThis && editDraft && (
                      <div className="mt-3 ml-12 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4 animate-in slide-in-from-top-1 duration-150">
                        {/* Conspicuous open-full-goals button at top */}
                        <button
                          onClick={() => { onOpenMember(member); onClose(); }}
                          className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <ExternalLink className="size-3.5" />
                          Open {member.name.split(" ")[0]}'s Full Performance & Development Goals
                        </button>
                        <div className="border-t border-primary/15 pt-3 space-y-3">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Goal Description</label>
                            <textarea
                              value={editDraft.description}
                              onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value } : d)}
                              rows={3}
                              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Team Goal Linkage</label>
                            <select
                              value={editDraft.linkedDept}
                              onChange={e => setEditDraft(d => d ? { ...d, linkedDept: e.target.value, ...(e.target.value !== d.linkedDept ? { weightage: 0 } : {}) } : d)}
                              className="w-full mt-1.5 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">No linkage</option>
                              {flattenOkrOptions(departmentGoals).map(o => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => saveEdit(member.id, goal.id, member.name, goal.title)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                            >
                              Propose Change
                            </button>
                            <button onClick={cancelEdit} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                              Cancel
                            </button>
                            <span className="text-[10px] text-muted-foreground ml-1">Sent to {hodName} for approval.</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer — total contribution */}
        <div className={cn(
          "flex items-center justify-between px-6 py-3 border-t",
          displayTotal === 100 ? "bg-rag-green/8 border-rag-green/25" : "bg-rag-red/6 border-rag-red/20"
        )}>
          <span className="text-xs text-muted-foreground font-medium">Total contribution</span>
          <span className={cn("text-sm font-bold tracking-tight", displayTotal === 100 ? "text-rag-green" : "text-rag-red")}>
            {displayTotal}%{displayTotal !== 100 && " / 100%"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

// Cycling palette for the "Team Members With Insufficient Goals" supervisor groups — purely to make each
// supervisor's group visually distinct at a glance, not tied to RAG semantics. Kept to cool,
// complementary hues (no rose/amber) and softer opacity so the groups don't compete visually with
// the red "No Goals Set" / amber "Incomplete" alert badges rendered inside these same cards.
// `dot` is a solid swatch used as a small group-identity marker; `accent` is the left-edge border.
const SUPERVISOR_GROUP_COLORS = [
  { border: "border-blue-200/70 dark:border-blue-500/30", accent: "border-l-blue-400", bg: "bg-blue-50/70 dark:bg-blue-900/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-400" },
  { border: "border-violet-200/70 dark:border-violet-500/30", accent: "border-l-violet-400", bg: "bg-violet-50/70 dark:bg-violet-900/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-400" },
  { border: "border-teal-200/70 dark:border-teal-500/30", accent: "border-l-teal-400", bg: "bg-teal-50/70 dark:bg-teal-900/10", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-400" },
  { border: "border-cyan-200/70 dark:border-cyan-500/30", accent: "border-l-cyan-400", bg: "bg-cyan-50/70 dark:bg-cyan-900/10", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-400" },
  { border: "border-indigo-200/70 dark:border-indigo-500/30", accent: "border-l-indigo-400", bg: "bg-indigo-50/70 dark:bg-indigo-900/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-400" },
];

// A different hue per team's driving-mascot flourish, purely so adjacent teams' OKR blocks read as
// visually distinct at a glance (cycles if there are more teams than tints).
const TEAM_MASCOT_TINTS = [
  "none",
  "hue-rotate(50deg) saturate(1.4)",
  "hue-rotate(-60deg) saturate(1.3)",
  "hue-rotate(130deg) saturate(1.3)",
  "hue-rotate(210deg) saturate(1.2)",
];

// A single Philly Group Key Result row in the director's own "2026 Philly Group OKRs" section —
// read-only display plus an inline "reassign owner" affordance (any staff name, not gated to a
// single department's roster, since group-level ownership deliberately isn't dept-scoped).
function PhillyKrOwnerRow({ goalId, kr }: { goalId: string; kr: KeyResult }) {
  const { reassignPhillyKrOwner } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(kr.owner);
  return (
    <div className="flex items-center justify-between gap-2 text-xs border-t border-border/40 pt-1.5 first:border-0 first:pt-0">
      <span className="flex-1 min-w-0 truncate">{kr.title}</span>
      {editing ? (
        <div className="flex items-center gap-1 shrink-0">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-32 text-xs rounded-md border border-input bg-background px-1.5 py-0.5"
          />
          <button
            onClick={() => {
              if (!draft.trim()) { toast.error("Owner is required"); return; }
              reassignPhillyKrOwner(goalId, kr.id, draft.trim());
              setEditing(false);
              toast.success("Owner reassigned");
            }}
            className="size-5 rounded grid place-items-center text-rag-green hover:bg-muted transition-colors"
            title="Save"
          >
            <Check className="size-3" />
          </button>
          <button onClick={() => { setDraft(kr.owner); setEditing(false); }} className="size-5 rounded grid place-items-center text-muted-foreground hover:bg-muted transition-colors" title="Cancel">
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-muted-foreground">{kr.owner}</span>
          <RagPill rag={kr.ragConfidence} value={ragConfidenceValue(kr.ragConfidence)} />
          <button onClick={() => setEditing(true)} className="size-5 rounded grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors" title="Reassign owner">
            <Pencil className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function TeamSection() {
  const {
    teamMembers, tier, currentUser, focusedTeamMemberId, setFocusedTeamMemberId, departmentGoals,
    staffMemberId, adminMemberId, opsMeta, directorMeta, staffList, teamOkrEditors, setTeamOkrEditor, renameTeam,
    teamBoxNames, renameTeamBox, focusedObjectiveId, clearFocusedObjective, focusedObjectiveExpandKrs,
    opsTeamMembersAll, opsDepartmentGoals, hcwmTeamMembers, hcwmDepartmentGoals,
    teamMemberDrawerReturnHome, setTeamMemberDrawerReturnHome, setSection,
    respondToCrossDeptAppointment,
    phillyGroupGoals, reassignPhillyKrOwner,
  } = useApp();
  const [active, setActive] = useState<TeamMember | null>(null);
  const [showRagInfo, setShowRagInfo] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  // Which team-level set's secondary-owner editor is currently open (by teamName), if any.
  const [editingSecondaryOwnerFor, setEditingSecondaryOwnerFor] = useState<string | null>(null);
  const [secondaryOwnerDraft, setSecondaryOwnerDraft] = useState("");
  // Which team name (in the "Team Members With Insufficient Goals" box) is currently being renamed, if any.
  const [editingTeamNameFor, setEditingTeamNameFor] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");

  useEffect(() => {
    if (focusedTeamMemberId) {
      const member = teamMembers.find(m => m.id === focusedTeamMemberId) ?? null;
      setActive(member);
      setFocusedTeamMemberId(null);
    }
  }, [focusedTeamMemberId]);

  // Scroll to a specific Objective when navigated here from a My Goals performance-goal card's
  // "linked objective"/"view all key results" icon — the target ObjectiveCard reads
  // focusedObjectiveId itself (via data-objective-id) to decide whether to start with its Key
  // Results list expanded, so this effect only needs to handle the scroll + clear the focus.
  useEffect(() => {
    if (!focusedObjectiveId) return;
    const el = document.querySelector(`[data-objective-id="${focusedObjectiveId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    clearFocusedObjective();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedObjectiveId]);

  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const isOps = !!opsMeta;
  const viewedMemberId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null;
  const viewedUserName = directorMeta
    ? directorMeta.name
    : opsMeta
    ? opsMeta.user.name
    : (viewedMemberId ? (teamMembers.find(m => m.id === viewedMemberId)?.name ?? currentUser.name) : currentUser.name);
  // The leave supervisor the HOD has granted edit rights to for a *specific* team-level OKR set
  // (the set's secondary owner) — grants the same team-level rights as the HOD for that set only,
  // never department-level Objectives or other teams' sets.
  const isTeamOkrEditorFor = (teamName: string) => !!teamOkrEditors[teamName] && viewedUserName === teamOkrEditors[teamName];

  const visibleMembers = teamMembers;

  // The current viewer's department — read directly off currentUser/opsMeta.user rather than
  // joining through staffList by id, since the switchable ops personas (u21/u22/u23) don't share an
  // id namespace with staffList's real CSV-sourced rows and that join would silently fall back to
  // undefined (showing a generic "Department OKRs" instead of e.g. "Credit Risk Management OKRs").
  // A director's own "department" (Executive Office) genuinely has no Objectives of its own — that's
  // an honest empty state below, not a bug — their real content is the Key Staff Challenges section
  // further down, which reads real multi-department data via getRelevantDeptsForViewer instead.
  const resolvedDept = directorMeta ? directorMeta.department : opsMeta ? opsMeta.user.department : currentUser.department;

  // Owner names are just strings on Objectives/KRs — resolving to an actual TeamMember (to open
  // their drawer) used to only search this department's own roster (`visibleMembers`), which
  // silently failed (click did nothing, no error) for any cross-department KR owner — e.g. a
  // Compliance or Marketing Communications person named as a co-owner on an HCWM Key Result.
  // Searching every known roster fixes that; permission is still gated separately by canOpenOwner
  // below. The HOD can always open anyone; for team-level items, the clicked member's own direct
  // supervisor can too (mirrors the existing directManager convention used everywhere else here).
  const ALL_KNOWN_MEMBERS = [...teamMembers, ...opsTeamMembersAll, ...marketingTeamMembers];
  const resolveMemberByName = (name: string) => ALL_KNOWN_MEMBERS.find(m => m.name === name);
  const canOpenOwner = (ownerName: string, level: "department" | "team"): boolean => {
    if (isHod) return true;
    if (level !== "team") return false;
    const owner = resolveMemberByName(ownerName);
    return !!owner && owner.directManager === viewedUserName;
  };
  const openOwner = (ownerName: string) => {
    const member = resolveMemberByName(ownerName);
    if (member) setActive(member);
    else toast.error(`Couldn't find ${ownerName}'s profile — they may no longer be an active account.`);
  };

  // A director sees every department they oversee, collapsed by default, one at a time — "grouped
  // by department... collapsible rows... only fully display if they click on the department." HCWM
  // and Credit Risk are real, live, CSV-backed state (addKeyResult/updateObjective/updateKeyResult
  // support them directly), so directors get full HOD-equivalent editing there — the same
  // ObjectiveCard every HOD uses, just with isHod force-set true and actingOnBehalfOfHod passed
  // through so the department's real HOD ends up needing to acknowledge the change (see appContext.
  // tsx's own comment on updateObjective for the full reasoning). Compliance and Marketing
  // Communications aren't backed by any live mutable state anywhere in this app yet (their data is
  // static seed content used only for read-only aggregation, same as every other page that shows
  // them) — directors see a real, correct read-only view there rather than a broken edit UI.
  const [expandedDirectorDept, setExpandedDirectorDept] = useState<string | null>(null);
  const directorDeptList = directorMeta
    ? getRelevantDeptsForViewer(directorMeta.name, directorMeta.department, staffList).depts
    : [];
  const directorDeptHod = (dept: string) => staffList.find(s => s.dept === dept && s.hod)?.name;
  const DIRECTOR_GOALS_BY_DEPT: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
  };
  const LIVE_DEPT_NAMES = new Set([HCWM_DEPT_NAME, CREDIT_RISK_DEPT_NAME]);

  // Department-level first, then team-level grouped by teamName — "arrange by department-level
  // followed by team-level... without overcrowding" per the request.
  const deptLevelGroups = departmentGoals.filter(g => g.level !== "team");
  const teamLevelGroups = departmentGoals.filter(g => g.level === "team");
  const teamNames = Array.from(new Set(teamLevelGroups.map(g => g.teamName || "Team")));

  // "Outstanding" performance goals = under the 3-Key-Result minimum (not just zero), matching the
  // existing red(0)/amber(<3) distinction already used elsewhere (HomeSection's own badges).
  // Performance goals are now Key Results owned by name, not the old individually-created Goal
  // objects. Visible only to the HOD or to a viewer who supervises at least one person.
  const canSeeNoGoalsSection = isHod || visibleMembers.some(m => m.directManager === viewedUserName);

  // Grouped by *team* (one box per leave supervisor's own reports), not by flatly listing everyone
  // under their immediate manager — a leave supervisor who is themselves a direct report of the HOD
  // (e.g. Caleb Ong, who leads Workplace Management) used to appear twice: once as their own group's
  // implicit header, and again as an ordinary member card inside the HOD's group. Now each such
  // person gets exactly one box — their own team's — with their personal goal status shown as a
  // highlight on that box's header instead of a separate card. The HOD's own status is deliberately
  // never surfaced here (only on her own Performance Goals section) — her box (if she has any direct
  // reports who aren't themselves team leads) has no `lead` match below, so it's never highlighted.
  const isTeamLead = (name: string) => visibleMembers.some(m => m.directManager === name);
  const teamNameFor = (leadName: string): string => {
    if (teamBoxNames[leadName]) return teamBoxNames[leadName];
    const lead = visibleMembers.find(m => m.name === leadName);
    if (!lead) return "Direct Reports";
    const segments = lead.role.split(",");
    return (segments.length > 1 ? segments[segments.length - 1] : lead.role).trim();
  };
  const leadNames = Array.from(new Set(visibleMembers.map(m => m.directManager).filter(Boolean)));
  const teamBoxes = leadNames
    .map(leadName => {
      const lead = visibleMembers.find(m => m.name === leadName);
      // Both goal sets — someone's total owned-KR count (for the 3-minimum check) must include any
      // cross-department appointment too, or a person who genuinely meets the minimum once you count
      // everything they own gets incorrectly flagged as short on this department's page alone.
      const leadKrCount = keyResultsOwnedBy(leadName, departmentGoals, opsDepartmentGoals).length;
      const members = visibleMembers.filter(m =>
        m.directManager === leadName && !isTeamLead(m.name) && keyResultsOwnedBy(m.name, departmentGoals, opsDepartmentGoals).length < 3
      );
      return { leadName, teamName: teamNameFor(leadName), leadHasNoGoals: !!lead && leadKrCount < 3, leadKrCount, members };
    })
    .filter(box => box.leadHasNoGoals || box.members.length > 0);

  // ── Key Staff Challenges — HOD sees their own department; a "Director" (an HOD/senior manager
  // with other HODs reporting to them, per real users.csv supervisor/hod data) sees an
  // AI-aggregated view across every department those HOD reports themselves head. Same classifier
  // as the admin console's org-wide version (src/lib/insights.ts) — just scoped to fewer members.
  // A non-HOD leave supervisor also gets this section, scoped to just their own direct reports —
  // they're routed a challenge response whenever they happen to be a Key Result's Objective owner,
  // but they should see their team's open challenges either way, not just the ones addressed to them.
  const MEMBERS_BY_DEPT: Record<string, TeamMember[]> = {
    [HCWM_DEPT_NAME]: hcwmTeamMembers, [CREDIT_RISK_DEPT_NAME]: opsTeamMembersAll,
    [MARKETING_DEPT_NAME]: marketingTeamMembers,
  };
  const GOALS_BY_DEPT: Record<string, DeptGoal[]> = {
    [HCWM_DEPT_NAME]: hcwmDepartmentGoals, [CREDIT_RISK_DEPT_NAME]: opsDepartmentGoals,
    [MARKETING_DEPT_NAME]: marketingDepartmentGoals,
  };
  const canonicalOwnDept = staffList.find(s => s.name === viewedUserName)?.dept ?? resolvedDept ?? "";
  // A director (hod=false themselves, but real leave supervisor of one or more HODs per
  // users.csv) is exactly the case getRelevantDeptsForViewer already generalizes for — it looks at
  // who reports to *this name* as an HOD, not at whether the viewer is one themselves. Running it
  // for any HOD or director viewer (not just tier-HODs) is what makes "2+ HODs report to you ->
  // multi-department view" work for a real leave supervisor with no special-cased tier at all.
  const { depts: relevantDepts, isDirector } = (isHod || !!directorMeta)
    ? getRelevantDeptsForViewer(viewedUserName, canonicalOwnDept, staffList)
    : { depts: [] as string[], isDirector: false };
  const isLeaveSupervisorViewer = !isHod && !directorMeta && isTeamLead(viewedUserName);
  const showKeyStaffChallenges = isHod || isLeaveSupervisorViewer || !!directorMeta;
  const keyStaffChallenges = (isHod || directorMeta)
    ? computeChallengeThemes(
        relevantDepts.flatMap(d => MEMBERS_BY_DEPT[d] ?? []),
        Object.fromEntries(relevantDepts.map(d => [d, GOALS_BY_DEPT[d] ?? []])),
      )
    : isLeaveSupervisorViewer
    ? computeChallengeThemes(visibleMembers.filter(m => m.directManager === viewedUserName), { [HCWM_DEPT_NAME]: departmentGoals })
    : [];
  // ── Cross-Department Appointment Consent — searches BOTH department goal sets regardless of
  // which one this page is currently showing, since the appointee's HOD/leave supervisor might
  // belong to the *other* department from the one the Key Result itself lives in (that's the whole
  // point of "cross-department"). See crossDeptApproval on KeyResult / respondToCrossDeptAppointment.
  const crossDeptApprovalsForViewer = [...hcwmDepartmentGoals, ...opsDepartmentGoals]
    .flatMap(objective => (objective.keyResults ?? [])
      .filter(kr => kr.crossDeptApproval?.pendingFrom.includes(viewedUserName))
      .map(kr => ({ objective, kr, isOpsGoal: opsDepartmentGoals.includes(objective) }))
    );
  const [rejectingCrossDeptFor, setRejectingCrossDeptFor] = useState<string | null>(null);
  const [crossDeptRejectReason, setCrossDeptRejectReason] = useState("");
  const [showPhillyGroupDialog, setShowPhillyGroupDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* ── Top banner header ── */}
      <div className="rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5 flex items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <TeamSVG />
            <div>
              <h2 className="font-display text-2xl text-white">Team OKRs</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPhillyGroupDialog(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/30 hover:bg-white/10 text-white/80 transition-colors"
            >
              <Globe2 className="size-3.5" /> 2026 Philly Group OKRs
            </button>
            <button
              onClick={() => setShowRagInfo(v => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors",
                showRagInfo ? "bg-white/20 border-white/40 text-white" : "border-white/30 hover:bg-white/10 text-white/80"
              )}
            >
              <Info className="size-3.5" /> Confidence &amp; Scoring Guide
            </button>
          </div>
        </div>
      </div>
      {showRagInfo && <RAGInfoPanel onClose={() => setShowRagInfo(false)} />}
      {showPhillyGroupDialog && <PhillyGroupOkrsDialog onClose={() => setShowPhillyGroupDialog(false)} />}

      {directorMeta && (
        <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="font-display text-2xl">Departments You Oversee</h2>
          {directorDeptList.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground py-2">No department HODs currently list you as their manager.</p></Card>
          ) : (
            directorDeptList.map(dept => {
              const isExpanded = expandedDirectorDept === dept;
              const isLive = LIVE_DEPT_NAMES.has(dept);
              const goals = DIRECTOR_GOALS_BY_DEPT[dept] ?? [];
              const isOpsDept = dept === CREDIT_RISK_DEPT_NAME;
              return (
                <div key={dept} className="rounded-2xl border border-border/70 overflow-hidden">
                  <button
                    onClick={() => setExpandedDirectorDept(isExpanded ? null : dept)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3.5 bg-muted/30 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-primary shrink-0" />
                      <span className="font-medium text-sm">{dept}</span>
                      <span className="text-[10px] text-muted-foreground">{goals.length} objective{goals.length === 1 ? "" : "s"} · HOD: {directorDeptHod(dept) ?? "—"}</span>
                      {!isLive && (
                        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Read-only</span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-card">
                      {goals.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">No objectives yet.</p>
                      ) : isLive ? (
                        goals.map((deptGoal, idx) => (
                          <ObjectiveCard
                            key={deptGoal.id}
                            deptGoal={deptGoal}
                            objectiveIndex={idx}
                            allDeptGoals={goals}
                            isHod={true}
                            isTeamOkrEditor={false}
                            viewedUserName={viewedUserName}
                            isOps={isOpsDept}
                            dept={dept}
                            canOpenOwner={() => true}
                            onOpenOwner={openOwner}
                          />
                        ))
                      ) : (
                        // Read-only — Compliance/Marketing Communications have no live mutable
                        // state to edit yet (see the comment on directorDeptList above).
                        goals.map(deptGoal => (
                          <div key={deptGoal.id} className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
                            <div className="font-medium text-sm">{deptGoal.title}</div>
                            <div className="space-y-1.5">
                              {(deptGoal.keyResults ?? []).map(kr => (
                                <div key={kr.id} className="flex items-center justify-between gap-2 text-xs border-t border-border/40 pt-1.5 first:border-0 first:pt-0">
                                  <span className="flex-1 min-w-0 truncate">{kr.title}</span>
                                  <span className="text-muted-foreground shrink-0">{ownerNames(kr.owner).join(", ")}</span>
                                  <RagPill rag={kr.ragConfidence} value={ragConfidenceValue(kr.ragConfidence)} />
                                  {kr.score !== undefined && <RagPill rag={scoreToRag(kr.score)} value={kr.score} />}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── 2026 Philly Group OKRs — the group-level layer above every department's own
            Objectives (see src/lib/phillyGroupOkrs.ts). Directors get a dedicated, editable view
            here (reassigning a Key Result's owner) on top of the read-only popup any user can open
            from the header button above. ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">2026 Philly Group OKRs</h2>
            <span className="text-[11px] text-muted-foreground">Owners can be any staff member, not only HODs</span>
          </div>
          <div className="space-y-3">
            {phillyGroupGoals.map(pg => (
              <Card key={pg.id} className="space-y-2.5">
                <div>
                  <div className="font-semibold text-sm">{pg.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{pg.description}</div>
                </div>
                <div className="space-y-1.5">
                  {pg.keyResults.map(kr => (
                    <PhillyKrOwnerRow key={kr.id} goalId={pg.id} kr={kr} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ── Department OKRs subheader — mascot always on the left, no other symbol ── */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MascotFlourish src="/mascot/headphones.png" className="h-12 w-auto" />
          <h2 className="font-display text-2xl">{resolvedDept} OKRs</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(isHod || Object.values(teamOkrEditors).includes(viewedUserName)) && !showCreatePanel && (
            <button
              onClick={() => setShowCreatePanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 shrink-0"
            >
              <Plus className="size-3.5" /> New Objective
            </button>
          )}
        </div>
      </div>

      {showCreatePanel && resolvedDept && (
        <div className="mb-4">
          <CreateObjectivePanel dept={resolvedDept} departmentGoals={departmentGoals} isOps={isOps} onClose={() => setShowCreatePanel(false)} lockToTeamLevel={!isHod} />
        </div>
      )}

      {/* ── Department-Level group — header sits outside its bubble, exactly like each team-level
          header below (same font-display/text-xl format), differentiated only by a small
          "Department-Level · Overarching" tag rather than a wall of extra text, so the two read as
          siblings in the same system rather than unrelated boxes. ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-sm">
            <Building2 className="size-3.5" /> Department-Level
          </span>
          <span className="font-display text-xl text-primary">{resolvedDept} OKRs</span>
          <span className="text-[10px] text-muted-foreground">— overarching goals for the whole department</span>
        </div>
        <div className="rounded-3xl border-2 border-primary/25 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent p-4 space-y-3 shadow-sm">
          {deptLevelGroups.map((deptGoal, idx) => (
            <ObjectiveCard
              key={deptGoal.id}
              deptGoal={deptGoal}
              objectiveIndex={idx}
              allDeptGoals={departmentGoals}
              isHod={isHod}
              isTeamOkrEditor={false}
              viewedUserName={viewedUserName}
              isOps={isOps}
              dept={resolvedDept ?? ""}
              canOpenOwner={canOpenOwner}
              onOpenOwner={openOwner}
              initialKrExpanded={focusedObjectiveId === deptGoal.id && focusedObjectiveExpandKrs}
            />
          ))}
        </div>
      </div>

      {/* ── Team-Level groups — each gets its own header (outside its bubble, same format as the
          Department-Level header above, tagged "Team-Level") and its own distinctly-styled (teal,
          not primary) bubble — clearly not the "Team Members With Insufficient Goals" section
          below, which deliberately uses no such bubble/card-group styling at all. ── */}
      {teamNames.map((name, teamIdx) => (
        <div key={name} className={cn("space-y-3", teamIdx === 0 && "mt-2")}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-teal-600 text-white shadow-sm">
              <Users className="size-3.5" /> Team-Level
            </span>
            <MascotFlourish
              src="/mascot/driving.png"
              className="h-8 w-auto"
              style={{ filter: TEAM_MASCOT_TINTS[teamIdx % TEAM_MASCOT_TINTS.length] }}
            />
            {editingTeamNameFor === `okr:${name}` ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={teamNameDraft}
                  onChange={e => setTeamNameDraft(e.target.value)}
                  className="text-sm rounded-md border border-input bg-background px-2 py-1 font-display"
                />
                <button
                  onClick={() => { renameTeam(name, teamNameDraft, isOps); setEditingTeamNameFor(null); toast.success("Team name updated"); }}
                  className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                >
                  Save
                </button>
                <button onClick={() => setEditingTeamNameFor(null)} className="px-2 py-1 rounded-md border border-border text-[11px]">Cancel</button>
              </div>
            ) : (
              <span className="font-display text-xl text-teal-700 dark:text-teal-300">{name}'s OKRs</span>
            )}
            <span className="text-[10px] text-muted-foreground">— this team's contribution</span>
            {isHod && editingTeamNameFor !== `okr:${name}` && (
              <button
                onClick={() => { setTeamNameDraft(name); setEditingTeamNameFor(`okr:${name}`); }}
                title="Rename this team"
                className="size-5 rounded grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <Pencil className="size-3" />
              </button>
            )}
            {isHod && editingSecondaryOwnerFor !== name && (
              <button
                onClick={() => { setSecondaryOwnerDraft(teamOkrEditors[name] ?? ""); setEditingSecondaryOwnerFor(name); }}
                title="Set a secondary owner for this team's OKRs"
                className="size-6 rounded-full grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <UserPlus className="size-3.5" />
              </button>
            )}
            {teamOkrEditors[name] && editingSecondaryOwnerFor !== name && (
              <span className="text-[10px] text-muted-foreground">— co-responsible with {teamOkrEditors[name]}</span>
            )}
          </div>

          {isHod && editingSecondaryOwnerFor === name && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Make one colleague co-responsible for "{name}'s OKRs" — they can create/edit Objectives &amp; Key Results, override scores, and appoint owners, for this set only. Any edit or score they make is finalised once you acknowledge it; any modification or quarterly score from this set's other owners will be routed to both of you to view and acknowledge. Leave blank to revoke.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <OwnerSelect value={secondaryOwnerDraft} onChange={setSecondaryOwnerDraft} dept={resolvedDept} teamLeadsOnly />
                </div>
                <button
                  onClick={() => {
                    setTeamOkrEditor(name, secondaryOwnerDraft, isOps);
                    setEditingSecondaryOwnerFor(null);
                    toast.success(secondaryOwnerDraft ? `${secondaryOwnerDraft} is now co-responsible for "${name}'s OKRs"` : "Secondary owner revoked");
                  }}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Save
                </button>
                <button onClick={() => setEditingSecondaryOwnerFor(null)} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
              </div>
            </div>
          )}

          <div className="rounded-3xl border-2 border-teal-500/25 bg-gradient-to-b from-teal-500/[0.06] via-teal-500/[0.02] to-transparent p-4 space-y-3 shadow-sm">
            {teamLevelGroups
              .filter(g => (g.teamName || "Team") === name)
              .map((deptGoal, idx) => (
                <ObjectiveCard
                  key={deptGoal.id}
                  deptGoal={deptGoal}
                  objectiveIndex={idx}
                  allDeptGoals={departmentGoals}
                  isHod={isHod}
                  isTeamOkrEditor={isTeamOkrEditorFor(name)}
                  viewedUserName={viewedUserName}
                  isOps={isOps}
                  dept={resolvedDept ?? ""}
                  canOpenOwner={canOpenOwner}
                  onOpenOwner={openOwner}
                  initialKrExpanded={focusedObjectiveId === deptGoal.id && focusedObjectiveExpandKrs}
                />
              ))}
          </div>
        </div>
      ))}

        {crossDeptApprovalsForViewer.length > 0 && (
          <div>
            <div className="mb-5 mt-4 flex items-center gap-3 flex-wrap">
              <ActionNeededIcon size={30} title="Cross-department appointments awaiting your consent" />
              <h2 className="font-display text-2xl">Cross-Department Appointments Awaiting Your Consent</h2>
            </div>
            <Card className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Someone from your team has been proposed as a co-owner of a Key Result in another department. As their HOD or direct manager, your consent is needed — along with theirs and the requesting HOD's — before the appointment is confirmed. Rejecting removes them from the appointment and lets you enclose a reason for the requesting HOD.
              </p>
              {crossDeptApprovalsForViewer.map(({ objective, kr, isOpsGoal }) => (
                <div key={kr.id} className="rounded-lg border border-amber-300/60 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-700/40 p-3 space-y-1.5">
                  <div className="text-sm font-medium leading-snug">{kr.title}</div>
                  <div className="text-[11px] text-muted-foreground">Objective: {objective.title}</div>
                  <div className="text-xs">
                    <strong>{kr.crossDeptApproval!.appointee}</strong> has been proposed as a co-owner by <strong>{kr.crossDeptApproval!.requestedBy}</strong>.
                  </div>
                  {rejectingCrossDeptFor === kr.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={crossDeptRejectReason}
                        onChange={e => setCrossDeptRejectReason(e.target.value)}
                        rows={2}
                        placeholder="Optional reason for the requesting HOD…"
                        className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            respondToCrossDeptAppointment(objective.id, kr.id, viewedUserName, "reject", crossDeptRejectReason.trim() || undefined, isOpsGoal);
                            setRejectingCrossDeptFor(null);
                            setCrossDeptRejectReason("");
                            toast.success(`${kr.crossDeptApproval!.requestedBy} will be notified to reappoint`);
                          }}
                          className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                        >
                          Confirm Reject
                        </button>
                        <button onClick={() => { setRejectingCrossDeptFor(null); setCrossDeptRejectReason(""); }} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { respondToCrossDeptAppointment(objective.id, kr.id, viewedUserName, "accept", undefined, isOpsGoal); toast.success("Consent recorded"); }}
                        className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                      >
                        Consent
                      </button>
                      <button onClick={() => setRejectingCrossDeptFor(kr.id)} className="px-2.5 py-1 rounded-md border border-border text-[11px]">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </div>
        )}

        {showKeyStaffChallenges && (
          <div>
            <div className="mb-5 mt-4 flex items-center gap-3 flex-wrap">
              <MascotFlourish src="/mascot/confident-smile.png" className="h-11 w-auto shrink-0" />
              <h2 className="font-display text-2xl">Key Staff Challenges</h2>
              {isDirector && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                  Aggregated across {relevantDepts.length} department{relevantDepts.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {/* Full theme-by-theme detail now lives in Feedback Corner & Insights, alongside Team
                Pulse and the Manager Self-Improvement Survey — this used to be a third standalone
                copy of the same data (Admin Console and Skills Profile each show their own too);
                a slim summary + link keeps this page from carrying a full duplicate. */}
            <Card
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSection("survey")}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {keyStaffChallenges.reduce((n, t) => n + t.count, 0)} open theme{keyStaffChallenges.reduce((n, t) => n + t.count, 0) === 1 ? "" : "s"} distilled from {isDirector ? "your departments'" : isHod ? "your team's" : "your direct reports'"} confidence challenges and goal-progress remarks.
                </p>
                <span className="text-xs font-medium text-primary shrink-0">View in Feedback Corner →</span>
              </div>
            </Card>
          </div>
        )}

        {canSeeNoGoalsSection && teamBoxes.length > 0 && (
          <div>
            <div className="mb-5 mt-4 flex items-center gap-3">
              <MascotFlourish src="/mascot/coffee-cup.png" className="h-11 w-auto shrink-0" />
              <h2 className="font-display text-2xl">Team Members With Insufficient Goals</h2>
            </div>
            <div className="space-y-4">
              {teamBoxes.map((box, i) => {
                const c = SUPERVISOR_GROUP_COLORS[i % SUPERVISOR_GROUP_COLORS.length];
                return (
                  <div key={box.leadName} className={cn("rounded-xl border border-l-4 p-4", c.border, c.accent, c.bg)}>
                    <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                      <span className={cn("size-2.5 rounded-full shrink-0", c.dot)} />
                      {editingTeamNameFor === box.leadName ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={teamNameDraft}
                            onChange={e => setTeamNameDraft(e.target.value)}
                            className="text-sm rounded-md border border-input bg-background px-2 py-1 font-display"
                          />
                          <button
                            onClick={() => { renameTeamBox(box.leadName, teamNameDraft, isOps); setEditingTeamNameFor(null); toast.success("Team name updated"); }}
                            className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditingTeamNameFor(null)} className="px-2 py-1 rounded-md border border-border text-[11px]">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className={cn("font-display text-xl", c.text)}>{box.teamName}</span>
                          {isHod && (
                            <button
                              onClick={() => { setTeamNameDraft(box.teamName); setEditingTeamNameFor(box.leadName); }}
                              title="Rename this team"
                              className="size-5 rounded grid place-items-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            >
                              <Pencil className="size-3" />
                            </button>
                          )}
                        </>
                      )}
                      <span className="text-sm font-semibold text-foreground/90">led by {box.leadName}</span>
                      {box.leadHasNoGoals && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rag-red/12 text-rag-red border border-rag-red/25">
                          {box.leadKrCount === 0 ? "No Goals Set" : `Incomplete (${box.leadKrCount}/3)`}
                        </span>
                      )}
                      {box.members.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto">{box.members.length} member{box.members.length === 1 ? "" : "s"} need{box.members.length === 1 ? "s" : ""} goals</span>
                      )}
                    </div>
                    {box.members.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {box.members.map(m => (
                          <NoGoalMemberCard
                            key={m.id}
                            m={m}
                            onOpen={setActive}
                            isClickable={isHod || m.directManager === viewedUserName}
                            ownedKrCount={keyResultsOwnedBy(m.name, departmentGoals, opsDepartmentGoals).length}
                            color={c}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Full goals drawer (opens from an Objective/KR owner name or HOD shortcuts). If it was opened
          from the Home page's "Team at a Glance" section, closing it returns the viewer to Home
          instead of stranding them on the Team OKRs page they never chose to navigate to. */}
      {active && (
        <TeamDrawer
          member={active}
          onClose={() => {
            setActive(null);
            if (teamMemberDrawerReturnHome) {
              setTeamMemberDrawerReturnHome(false);
              setSection("home");
            }
          }}
        />
      )}
    </div>
  );
}

// ── Manager input panel for team member dev goals ─────────────────────────────

function DevGoalManagerInput({ goal, memberName, memberId }: { goal: PersonalDevGoal; memberName: string; memberId: string }) {
  const { addPoints, managerInputs, saveManagerInput } = useApp();
  const inputKey = `${memberId}:${goal.id}`;
  const savedInput = managerInputs[inputKey] ?? "";

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(savedInput);
  const [drafting, setDrafting] = useState(false);
  const [activePrompt, setActivePrompt] = useState<number | null>(null);

  const hasExistingInput = !!savedInput;

  const prompts = [
    `Suggest how ${memberName} can strengthen "${goal.title}" with measurable outcomes`,
    `Recommend specific learning resources to accelerate "${goal.title}"`,
  ];

  const draftWithAI = async (idx: 0 | 1) => {
    setActivePrompt(idx);
    setDrafting(true);
    const draft = await getAiProvider().draftDevGoalFeedback(goal.title, idx);
    setText(draft);
    setDrafting(false);
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    const isFirstInput = !hasExistingInput;
    saveManagerInput(memberId, goal.id, text.trim());
    if (isFirstInput) addPoints(15);
    const msg = `Feedback saved — ${memberName} will be notified${isFirstInput ? " (+15 pts)" : ""}`;
    if (isFirstInput) pointsToast(msg); else toast.success(msg);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => { setText(savedInput); setOpen(true); }}
        className={cn(
          "mt-2 text-xs px-3 py-1.5 rounded-md border transition-colors",
          hasExistingInput
            ? "border-rag-green/30 text-rag-green bg-rag-green/10"
            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground",
        )}
      >
        {hasExistingInput ? "✓ Feedback Provided" : "Provide Feedback & Recommendations"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Feedback & Recommendations</span>
        </div>
        <button onClick={() => { setOpen(false); setText(""); }} className="size-5 rounded grid place-items-center hover:bg-muted">
          <X className="size-3 text-muted-foreground" />
        </button>
      </div>

      {/* AI prompt suggestions */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
          <Sparkles className="size-3" /> Tap on PhillipGPT to draft your feedback
        </div>
        <div className="flex flex-col gap-1.5">
          {prompts.map((p, i) => (
            <button
              key={i}
              onMouseDown={() => void draftWithAI(i as 0 | 1)}
              disabled={drafting}
              className={cn(
                "text-xs text-left px-3 py-2 rounded-lg border transition-colors disabled:opacity-60",
                activePrompt === i && !drafting
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/30 hover:bg-primary/5 text-foreground/80",
              )}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-3 text-primary shrink-0" />
                {p}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-1">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enhance the goal, suggest learning resources, or add context for the team member…"
          rows={4}
          className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        {drafting && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Work Buddy AI is drafting…
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || drafting}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Save Feedback
        </button>
        <button
          onClick={() => { setOpen(false); setText(""); }}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Team Drawer ───────────────────────────────────────────────────────────────

const MONTHS_T = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDue(dueDate: string) {
  if (!dueDate) return "";
  const [y, m] = dueDate.split("-");
  return `${MONTHS_T[parseInt(m) - 1]} ${y}`;
}

function NoGoalsFeedbackPanel({ memberName }: { memberName: string }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <div className="rounded-xl border border-rag-green/30 bg-rag-green/5 px-4 py-3 flex items-center gap-2 text-sm text-rag-green">
        <Check className="size-4 shrink-0" />
        Feedback sent to {memberName}. They will be notified to review your suggestions.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Feedback & Goal Suggestions</div>
      <p className="text-xs text-muted-foreground">
        Share recommendations to help {memberName} set meaningful performance goals aligned to department objectives.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        placeholder={`Suggest 3 performance goals for ${memberName}, e.g. "1. Complete IBF certification by Q3..."`}
        className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <button
        onClick={() => { if (text.trim()) { setSubmitted(true); toast.success(`Feedback sent to ${memberName}`); } }}
        disabled={!text.trim()}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Send Feedback
      </button>
    </div>
  );
}

function RecommendDevGoalPanel({ memberName, onSubmit, onCancel }: {
  memberName: string;
  onSubmit: (g: { title: string; description: string; dueDate: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), dueDate });
  };

  return (
    <div className="mb-4 rounded-xl border border-dashed border-amber/40 bg-amber/5 p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
      <div className="text-sm font-semibold text-amber-foreground">Recommend a Development Goal for {memberName}</div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Goal Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Complete IBF Certification"
          autoFocus
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What should they work towards, and why?"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Target Completion Date</label>
        <div className="mt-1">
          <MonthPicker value={dueDate} onChange={setDueDate} />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        {memberName} will need to acknowledge or decline this within 7 working days, or a 5-point penalty applies. It won't appear on their dashboard until acknowledged.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="text-xs px-3 py-1.5 rounded-md bg-amber text-amber-foreground hover:opacity-90 disabled:opacity-50 font-medium transition-opacity"
        >
          Recommend Goal
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

// Recommend a *performance* goal — title/description/due-date/optional linkage to an existing
// Objective or Key Result, purely for context. This never appoints the member as an owner of
// whatever it's linked to (see PerfGoalRecommendation's comment in appContext.tsx).
function RecommendPerfGoalPanel({ memberName, departmentGoals, onSubmit, onCancel }: {
  memberName: string;
  departmentGoals: DeptGoal[];
  onSubmit: (g: { title: string; description: string; dueDate: string; linkedTo: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkedTo, setLinkedTo] = useState("");
  const okrOptions = flattenOkrOptions(departmentGoals);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), dueDate, linkedTo });
  };

  return (
    <div className="mb-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
      <div className="text-sm font-semibold text-primary">Recommend a Performance Goal for {memberName}</div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Goal Name</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Lead the Q3 onboarding process review"
          autoFocus
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What should they work towards, and why?"
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Link to a Department/Team Goal or Key Result (optional)</label>
        <select
          value={linkedTo}
          onChange={e => setLinkedTo(e.target.value)}
          className="w-full mt-1 text-sm rounded-lg border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">No linkage</option>
          {okrOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
        </select>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          The linkage is for context only — it does not make {memberName.split(" ")[0]} an owner of that Objective or Key Result.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 font-medium transition-opacity"
        >
          Recommend Goal
        </button>
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function TeamDrawer({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const {
    staffDevGoals, adminDevGoals, staffMemberId, adminMemberId, tier, currentUser, teamMembers, opsMeta, teamDevGoalsById,
    pendingDevGoalRecs, declinedDevGoalRecs, recommendDevGoal, departmentGoals, opsDepartmentGoals,
    pendingPerfGoalRecs, recommendPerfGoal,
    pendingGoalEditProposals, modifyGoal, addGoalRemark, resolveGoalEditProposal,
  } = useApp();
  const [recommendingDevGoal, setRecommendingDevGoal] = useState(false);
  const [recommendingPerfGoal, setRecommendingPerfGoal] = useState(false);
  const [proposalRemarks, setProposalRemarks] = useState<Record<string, string>>({});

  // Always resolve the member's full dev goal list — not just the currently-switched-to persona —
  // so HOD/leave-supervisor drawer views show everything, including for "no goals" members.
  const memberDevGoals: PersonalDevGoal[] =
    member.id === staffMemberId ? staffDevGoals :
    member.id === adminMemberId ? adminDevGoals :
    teamDevGoalsById[member.id] ?? [];

  // Bird's-eye status for the HOD/leave supervisor — overdue once the calendar rolls one day past
  // the goal's due month (same month-index comparison used for due-soon checks elsewhere).
  const devGoalStatusCounts = memberDevGoals.reduce(
    (acc, g) => {
      if (g.completed) { acc.completed++; return acc; }
      if (g.dueDate) {
        const now = new Date();
        const curYM = now.getFullYear() * 12 + now.getMonth();
        const [y, m] = g.dueDate.split("-").map(Number);
        const dueYM = y * 12 + (m - 1);
        if (dueYM < curYM) { acc.overdue++; return acc; }
      }
      acc.inProgress++;
      return acc;
    },
    { inProgress: 0, completed: 0, overdue: 0 }
  );

  // Determine if the currently-viewed user can provide feedback (HOD or direct manager only)
  const isViewerHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const viewedMemberId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null;
  const viewedUserName = opsMeta
    ? opsMeta.user.name
    : (viewedMemberId ? (teamMembers.find(m => m.id === viewedMemberId)?.name ?? currentUser.name) : currentUser.name);
  const canProvideFeedback = isViewerHod || member.directManager === viewedUserName;

  // Staff-proposed changes to their own existing performance goals — HOD-only review (the direct
  // supervisor's role here was already served informally via the attestation step on My Goals).
  const memberSelfProposals = pendingGoalEditProposals.filter(p => p.source === "self" && p.memberId === member.id);
  const acceptSelfProposal = (proposalId: string) => {
    const proposal = memberSelfProposals.find(p => p.id === proposalId);
    if (!proposal) return;
    modifyGoal(proposal.memberId, proposal.goalId, proposal.changes, false);
    const remark = proposalRemarks[proposalId]?.trim();
    if (remark) addGoalRemark(proposal.memberId, proposal.goalId, viewedUserName, remark);
    resolveGoalEditProposal(proposalId);
    toast.success(`Change accepted — ${proposal.memberName} will be notified to acknowledge`);
  };
  const rejectSelfProposal = (proposalId: string) => {
    const proposal = memberSelfProposals.find(p => p.id === proposalId);
    if (!proposal) return;
    const remark = proposalRemarks[proposalId]?.trim();
    if (remark) addGoalRemark(proposal.memberId, proposal.goalId, viewedUserName, remark);
    resolveGoalEditProposal(proposalId);
    toast(`Change rejected for ${proposal.memberName}`);
  };

  // Recommended dev goals are held pending until the team member acknowledges or declines them —
  // they do not appear on the member's dashboard until then.
  const addRecommendedDevGoal = (g: { title: string; description: string; dueDate: string }) => {
    recommendDevGoal(member.id, { ...g, recommendedBy: viewedUserName });
    setRecommendingDevGoal(false);
    toast.success(`Recommendation sent — ${member.name} has 7 working days to acknowledge or decline`);
  };
  const memberPendingRecs: DevGoalRecommendation[] = pendingDevGoalRecs[member.id] ?? [];
  const memberDeclinedRecs = declinedDevGoalRecs[member.id] ?? [];

  // Recommended performance goals — same pending-until-acknowledged lifecycle, but never appoints
  // the member as an owner of whatever it's linked to (see PerfGoalRecommendation's comment).
  const addRecommendedPerfGoal = (g: { title: string; description: string; dueDate: string; linkedTo: string }) => {
    recommendPerfGoal(member.id, { ...g, recommendedBy: viewedUserName });
    setRecommendingPerfGoal(false);
    toast.success(`Recommendation sent — ${member.name} has 7 working days to acknowledge or decline`);
  };
  const memberPendingPerfRecs: PerfGoalRecommendation[] = pendingPerfGoalRecs[member.id] ?? [];

  // Performance goals are now Key Results owned by this member (by name), pulled straight from the
  // live Objectives — not the old individually-created Goal list. Each entry carries its parent
  // Objective so the supervisor sees the linkage at a glance. Includes Marketing Communications
  // goals too — omitting them meant a Marketing team member's own owned Key Results silently never
  // appeared in their own drawer. Compliance is deliberately excluded (out of scope for this
  // dashboard).
  const memberKeyResults = keyResultsOwnedBy(member.name, departmentGoals, opsDepartmentGoals, marketingDepartmentGoals);
  // Which real department an Objective's Key Results live under — resolved by array membership
  // rather than trusting anything on the Objective itself, so cross-department ownership (a person
  // co-owning a KR on another department's Objective) is always labelled with the *real* department,
  // not assumed from whichever roster the viewer happens to be looking at.
  const deptNameForObjective = (objective: DeptGoal): string => {
    if (departmentGoals.includes(objective)) return HCWM_DEPT_NAME;
    if (opsDepartmentGoals.includes(objective)) return CREDIT_RISK_DEPT_NAME;
    if (marketingDepartmentGoals.includes(objective)) return MARKETING_DEPT_NAME;
    return "Unknown Department";
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" />
      <div
        className="w-full sm:w-[640px] bg-background h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-secondary text-primary grid place-items-center font-medium">{member.avatar}</div>
            <div>
              <div className="font-display text-xl">{member.name}</div>
              <div className="text-xs text-muted-foreground">{member.role}</div>
              <div className="text-xs text-muted-foreground/60">Reports to: {member.directManager}</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <CheckInSection
            member={member}
            managerName={viewedUserName}
            memberKeyResults={memberKeyResults.map(({ kr }) => kr)}
            memberDevGoals={memberDevGoals}
            canLog={canProvideFeedback}
          />
          {/* ── Performance Goals (owned Key Results) ── */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-primary shrink-0" />
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Performance Goals ({memberKeyResults.length})
                </div>
              </div>
              {canProvideFeedback && !recommendingPerfGoal && (
                <button
                  onClick={() => setRecommendingPerfGoal(true)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-colors shrink-0"
                >
                  <Plus className="size-3" /> Recommend a Goal
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/70 mb-3 pl-3.5">
              Every performance goal is owned by {member.name.split(" ")[0]}, linked to a department or team Objective.
              RAG confidence is due by {formatMonthlyConfidenceDueDate()}; scoring is due by {formatGoalStatusDueDate()}.
            </p>

            {canProvideFeedback && recommendingPerfGoal && (
              <RecommendPerfGoalPanel
                memberName={member.name}
                departmentGoals={departmentGoals}
                onSubmit={addRecommendedPerfGoal}
                onCancel={() => setRecommendingPerfGoal(false)}
              />
            )}

            {/* Recommendations awaiting the team member's response — read-only status here */}
            {memberPendingPerfRecs.length > 0 && (
              <div className="space-y-2 mb-3">
                {memberPendingPerfRecs.map(rec => {
                  const daysElapsed = workingDaysSince(rec.recommendedDate);
                  const isOverdue = daysElapsed >= 7;
                  return (
                    <div key={rec.id} className={cn(
                      "rounded-lg border p-3 text-xs",
                      isOverdue ? "border-rag-red/30 bg-rag-red/5" : "border-primary/20 bg-primary/5"
                    )}>
                      <div className="font-medium">{rec.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Recommended {rec.recommendedDate} · awaiting {member.name.split(" ")[0]}'s response{isOverdue ? " (overdue)" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {memberKeyResults.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-rag-red/30 bg-rag-red/5 px-6 py-8 text-center">
                <Flag className="size-6 text-rag-red mx-auto mb-2" />
                <div className="font-medium text-rag-red">No Key Results Owned</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {member.name} is not yet the owner of any key result. A minimum of 3 is required.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {memberKeyResults.length < 3 && (
                  <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/5 px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="size-4 text-amber-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-foreground">
                      <span className="font-medium">Below minimum ({memberKeyResults.length}/3 key results owned).</span>
                    </div>
                  </div>
                )}
                {/* Grouped by Objective — a member who owns 2+ Key Results under the same Objective
                    (e.g. Diana Chang) used to get that Objective's banner repeated once per Key
                    Result, as separate full-width cards. One card per Objective, its Key Results
                    listed inside, reads as "these belong together" instead of implying 2 different
                    goals. */}
                {Object.values(
                  memberKeyResults.reduce((acc, { kr, objective }) => {
                    (acc[objective.id] ??= { objective, krs: [] }).krs.push(kr);
                    return acc;
                  }, {} as Record<string, { objective: DeptGoal; krs: KeyResult[] }>)
                ).map(({ objective, krs }) => (
                  <div key={objective.id} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                      🔗 {deptNameForObjective(objective)} · {objective.level === "team" ? `${objective.teamName ?? "Team"}-level OKR` : "Department-level OKR"} · {objective.title}
                    </div>
                    <div className="space-y-3 divide-y divide-border/50">
                      {krs.map(kr => (
                        <div key={kr.id} className={cn("pt-3 first:pt-0", isPendingAckFor(kr, member.name) && "-mx-4 px-4 rounded-lg border border-amber-300/60 bg-amber-50/40 dark:bg-amber-900/10")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm">{kr.title}</div>
                              {kr.dueDate && <div className="text-[10px] text-muted-foreground mt-1">Due {formatDueDate(kr.dueDate)}</div>}
                            </div>
                            {/* Both score types labelled distinctly — a bare RAG pill next to a bare
                                number used to leave it ambiguous which was which. Micro-labels (same
                                size the OKR editing cards already use for "Confidence"/"Score") keep
                                this from reading as two full extra lines. */}
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Monthly Confidence</span>
                                <RagPill rag={kr.ragConfidence} value={ragConfidenceValue(kr.ragConfidence)} />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Quarterly Score</span>
                                {kr.score !== undefined ? (
                                  <RagPill rag={scoreToRag(kr.score)} value={kr.score} />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Not yet scored</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isPendingAckFor(kr, member.name) && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5">⏳ Awaiting {member.name.split(" ")[0]}'s acknowledgement</div>
                          )}
                          {kr.counterProposal && (
                            <div className="rounded-md border border-violet-300/50 bg-violet-50/50 dark:bg-violet-900/10 px-2.5 py-1.5 text-[11px] text-violet-800 dark:text-violet-300 mt-1.5">
                              {member.name.split(" ")[0]} proposed
                              {kr.counterProposal.title && <> title <strong>"{kr.counterProposal.title}"</strong></>}
                              {kr.counterProposal.title && kr.counterProposal.dueDate && <> and</>}
                              {kr.counterProposal.dueDate && <> due date <strong>{formatDueDate(kr.counterProposal.dueDate)}</strong></>}
                              {" "}— resolve from the Team OKRs page
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Development Goals ── */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-amber shrink-0" />
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Development Goals ({memberDevGoals.length})
                </div>
              </div>
              {memberDevGoals.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-medium">
                  {devGoalStatusCounts.inProgress > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      <Clock className="size-2.5" /> {devGoalStatusCounts.inProgress} In Progress
                    </span>
                  )}
                  {devGoalStatusCounts.completed > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rag-green/10 text-rag-green border border-rag-green/25">
                      <CheckCircle2 className="size-2.5" /> {devGoalStatusCounts.completed} Completed
                    </span>
                  )}
                  {devGoalStatusCounts.overdue > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rag-red/10 text-rag-red border border-rag-red/25">
                      <TriangleAlert className="size-2.5" /> {devGoalStatusCounts.overdue} Overdue
                    </span>
                  )}
                </div>
              )}
              {canProvideFeedback && !recommendingDevGoal && (
                <button
                  onClick={() => setRecommendingDevGoal(true)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber/15 text-amber-foreground border border-amber/30 hover:bg-amber/25 transition-colors shrink-0"
                >
                  <Plus className="size-3" /> Recommend a Goal
                </button>
              )}
            </div>

            {canProvideFeedback && recommendingDevGoal && (
              <RecommendDevGoalPanel
                memberName={member.name}
                onSubmit={addRecommendedDevGoal}
                onCancel={() => setRecommendingDevGoal(false)}
              />
            )}

            {/* Recommendations awaiting the team member's response — read-only status for the supervisor */}
            {memberPendingRecs.length > 0 && (
              <div className="space-y-2 mb-3">
                {memberPendingRecs.map(rec => {
                  const daysElapsed = workingDaysSince(rec.recommendedDate);
                  const isOverdue = daysElapsed >= 7;
                  return (
                    <div key={rec.id} className={cn(
                      "rounded-lg border px-3 py-2.5 flex items-start gap-2.5",
                      isOverdue ? "border-rag-red/30 bg-rag-red/5" : "border-amber/30 bg-amber/5"
                    )}>
                      <GraduationCap className={cn("size-3.5 shrink-0 mt-0.5", isOverdue ? "text-rag-red" : "text-amber-foreground")} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-foreground/90">{rec.title}</div>
                        <div className={cn("text-[10px] mt-0.5", isOverdue ? "text-rag-red" : "text-muted-foreground")}>
                          {isOverdue ? "Overdue — 5-point penalty applied · " : `Awaiting response · ${7 - daysElapsed} working day${7 - daysElapsed !== 1 ? "s" : ""} left · `}
                          not yet visible on {member.name.split(" ")[0]}'s dashboard
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Declined recommendations — visible so the supervisor can see the member's response */}
            {memberDeclinedRecs.length > 0 && (
              <div className="space-y-2 mb-3">
                {memberDeclinedRecs.map(rec => (
                  <div key={rec.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-start gap-2.5">
                    <ThumbsDown className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground/90">{rec.title} — Declined</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{member.name.split(" ")[0]}'s reason: {rec.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {memberDevGoals.length === 0 && memberPendingRecs.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-rag-red/30 bg-rag-red/5 px-6 py-8 text-center">
                <Flag className="size-6 text-rag-red mx-auto mb-2" />
                <div className="font-medium text-rag-red">No Development Goals Set</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {member.name} has not set any development goals yet. A minimum of 1 is required.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {memberDevGoals.map(g => (
                  <div key={g.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={cn("font-medium text-sm", g.completed && "line-through text-muted-foreground")}>
                          {g.title}
                        </div>
                        {g.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{g.description}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {g.completed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-rag-green">
                            <CheckCircle2 className="size-3.5" /> Done
                          </span>
                        ) : g.dueDate ? (
                          <span className="text-xs text-muted-foreground">{fmtDue(g.dueDate)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                            <Clock className="size-3.5" /> In progress
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Manager input — enhance goal or recommend learning resources via AI */}
                    <DevGoalManagerInput goal={g} memberName={member.name} memberId={member.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, memberName, memberId, directManager }: {
  goal: TeamMember["goals"][number];
  memberName: string;
  memberId: string;
  directManager: string;
}) {
  const { resolveRemark, departmentGoals, currentUser, teamMembers, approveGoal: approveGoalCtx, addGoalRemark, updateGoalRag, tier, staffMemberId, adminMemberId, opsMeta } = useApp();
  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const effectiveViewId = tier === "admin" ? adminMemberId : staffMemberId;
  const effectiveManagerName = opsMeta
    ? opsMeta.user.name
    : (tier !== "manager" ? (teamMembers.find(m => m.id === effectiveViewId)?.name ?? currentUser.name) : currentUser.name);
  const isDirectReport = directManager === effectiveManagerName;

  const [display] = useState({
    description: goal.description,
    metric: goal.metric,
    linkedDept: goal.linkedDept ?? "",
    weightage: goal.weightage ?? 0,
  });
  const [approved, setApproved] = useState(goal.approved ?? false);
  const [givingFeedback, setGivingFeedback] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [updatingRag, setUpdatingRag] = useState(false);

  const linkedDeptName = departmentGoals.find(d => d.id === display.linkedDept)?.title;

  const viewSum = (() => {
    if (!display.linkedDept) return null;
    const otherSum = teamMembers
      .flatMap(m => m.goals)
      .filter(g => g.id !== goal.id && g.linkedDept === display.linkedDept)
      .reduce((s, g) => s + (g.weightage ?? 0), 0);
    return otherSum + display.weightage;
  })();
  const canApprove = viewSum === null || viewSum === 100;

  const handleApprove = () => {
    if (!canApprove) return;
    approveGoalCtx(memberId, goal.id);
    setApproved(true);
    toast.success("Goal approved");
  };

  const memberRemarks = goal.remarks.filter(r => memberName.startsWith(r.author));
  const [remarks, setRemarks] = useState(memberRemarks);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [drafting, setDrafting] = useState(false);

  const draftAI = async () => {
    setDrafting(true);
    await new Promise((r) => setTimeout(r, 1100));
    setText(`Thanks for flagging this — let's set up time on Thursday to map the blockers together. In the meantime, I've looped in L&D to share a relevant playbook, and I'll bring two stakeholder options for you to choose from. You're doing great work; this is an unblockable.`);
    setDrafting(false);
  };

  const send = (rid: string) => {
    setRemarks((rs) => rs.map((r) => (r.id === rid ? { ...r, pending: false } : r)));
    setRespondingTo(null);
    setText("");
    pointsToast("Response sent · +10 pts");
    void resolveRemark(rid);
  };

  return (
    <Card>
      {/* ── Title + approval badges ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-base leading-snug flex-1">{goal.title}</div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {approved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rag-green/10 text-rag-green border border-rag-green/30">
              <Check className="size-3" /> Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber/10 text-amber-foreground border border-amber/30">
              Pending Manager Approval
            </span>
          )}
          {approved && goal.ragPendingApproval && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber/10 text-amber-foreground border border-amber/30">
              <Clock className="size-3" /> {goal.ragPendingApproval} Status Pending Review
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{display.description}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="text-xs">
            <span className="text-muted-foreground">Department Goal: </span>
            {linkedDeptName
              ? <span className="font-medium text-foreground/85">{linkedDeptName}</span>
              : <span className="italic text-muted-foreground/60">Not linked</span>}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Key Result: </span>
            <span className="font-medium text-foreground/85">{display.metric}</span>
          </div>
        </div>
        {isHod && display.linkedDept && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Weightage:</span>
            <span className="font-medium text-foreground/85">{display.weightage}%</span>
            {viewSum !== null && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] border",
                viewSum === 100
                  ? "bg-rag-green/10 text-rag-green border-rag-green/20"
                  : "bg-rag-red/10 text-rag-red border-rag-red/20"
              )}>
                Total: {viewSum}%{viewSum !== 100 && " — must be 100%"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Quarterly RAG status — only for approved goals ── */}
      {approved ? (
        <div className="flex gap-2 mt-4">
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => {
            const item = goal.quarters.find((x) => x.q === q);
            const isPendingManagerReview = goal.ragPendingApproval === q;
            return (
              <div key={q} className="flex-1 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{q}</div>
                {isPendingManagerReview ? (
                  <div className="py-1.5 rounded-md text-[10px] font-medium border bg-amber/10 text-amber-foreground border-amber/30">
                    Pending
                  </div>
                ) : item ? (
                  <div className={cn(
                    "py-1.5 rounded-md text-xs font-medium border",
                    item.rag === "red" && "bg-rag-red/10 text-rag-red border-rag-red/30",
                    item.rag === "amber" && "bg-rag-amber/15 text-amber-foreground border-rag-amber/40",
                    item.rag === "green" && "bg-rag-green/10 text-rag-green border-rag-green/30",
                  )}>{item.rag.toUpperCase()}</div>
                ) : (
                  <div className="py-1.5 rounded-md text-xs text-muted-foreground/50 border border-dashed border-border">—</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-amber/5 border border-amber/20 px-3 py-2 flex items-center gap-2 text-xs text-amber-foreground">
          <Clock className="size-3.5 shrink-0" />
          Quarterly progress status will be visible once this goal is approved by the direct manager.
        </div>
      )}

      {/* ── Actions: Approve (supervisor) · Update Status (supervisor) · Feedback (HOD + supervisor) ── */}
      <div className="mt-4 pt-3 border-t border-border space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Approve — direct supervisor only, pending goals */}
          {isDirectReport && !approved && (
            <>
              <button
                onClick={handleApprove}
                disabled={!canApprove}
                title={!canApprove ? `Weightage total is ${viewSum}% — must be 100% to approve` : undefined}
                className={cn(
                  "text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors",
                  canApprove
                    ? "bg-rag-green/10 text-rag-green border-rag-green/30 hover:bg-rag-green/20"
                    : "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60"
                )}
              >
                <Check className="size-3" /> Approve
              </button>
              {!canApprove && (
                <span className="text-xs text-rag-red">Weightage total is {viewSum}% — must equal 100%</span>
              )}
            </>
          )}

          {/* Update quarter RAG — direct supervisor only, approved goals */}
          {approved && isDirectReport && (
            <div className="relative">
              <button
                onClick={() => setUpdatingRag(v => !v)}
                onBlur={() => setTimeout(() => setUpdatingRag(false), 150)}
                className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted border border-border hover:bg-muted/80 transition-colors"
              >
                Update {currentQuarterKey()} Status
              </button>
              {updatingRag && (
                <div className="absolute top-full mt-1 left-0 z-10 bg-popover border border-border rounded-lg shadow-lg overflow-hidden w-44">
                  {(["red", "amber", "green"] as RAG[]).map(r => (
                    <button
                      key={r}
                      onMouseDown={() => {
                        updateGoalRag(memberId, goal.id, currentQuarterKey(), r);
                        setUpdatingRag(false);
                        toast.success(`${currentQuarterKey()} → ${r.toUpperCase()} · ${memberName} notified`);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors",
                        r === "red" && "text-rag-red",
                        r === "amber" && "text-amber-foreground",
                        r === "green" && "text-rag-green",
                      )}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Provide Feedback — HOD and direct supervisor, approved goals only */}
          {approved && (isDirectReport || isHod) && (
            <button
              onClick={() => { setGivingFeedback(v => !v); setFeedbackDraft(""); }}
              className={cn(
                "text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors",
                givingFeedback
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              )}
            >
              <MessageSquareHeart className="size-3" /> {givingFeedback ? "Cancel Feedback" : "Provide Feedback"}
            </button>
          )}
        </div>

        {/* Inline feedback form */}
        {givingFeedback && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 animate-in slide-in-from-top-1 duration-150">
            <div className="text-xs font-semibold text-primary">Feedback for {memberName}</div>
            <textarea
              value={feedbackDraft}
              onChange={e => setFeedbackDraft(e.target.value)}
              rows={3}
              placeholder="Share observations, guidance, or encouragement on this goal's progress…"
              autoFocus
              className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!feedbackDraft.trim()) return;
                  addGoalRemark(memberId, goal.id, currentUser.name, feedbackDraft.trim());
                  toast.success("Feedback sent — team member will be notified");
                  setFeedbackDraft("");
                  setGivingFeedback(false);
                }}
                disabled={!feedbackDraft.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Send Feedback
              </button>
              <button
                onClick={() => { setGivingFeedback(false); setFeedbackDraft(""); }}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Remarks — only visible for approved goals ── */}
      {remarks.length > 0 && approved && (
        <div className="mt-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Remarks</div>
          {remarks.map((r) => (
            <div key={r.id} className={cn(
              "rounded-lg p-3 bg-muted/40",
              r.pending && "border border-amber/30 bg-amber/5"
            )}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{r.author}</div>
                <div className="text-xs text-muted-foreground">{r.date}</div>
              </div>
              <div className="text-sm mt-1">{r.text}</div>
              {r.pending && (
                <div className="mt-2">
                  {respondingTo === r.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        placeholder="Your response…"
                        className="w-full text-sm rounded-md border border-input bg-background p-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={draftAI}
                          disabled={drafting}
                          className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber/15 text-amber-foreground border border-amber/40 hover:bg-amber/25 disabled:opacity-50"
                        >
                          <Sparkles className="size-3" />
                          {drafting ? "Drafting…" : "Draft with AI"}
                        </button>
                        <button
                          onClick={() => send(r.id)}
                          disabled={!text.trim()}
                          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : isDirectReport ? (
                    <button
                      onClick={() => setRespondingTo(r.id)}
                      className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                    >
                      Respond
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
