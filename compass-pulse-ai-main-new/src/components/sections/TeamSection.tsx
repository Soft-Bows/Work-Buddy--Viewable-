import { useState, useEffect } from "react";
import { Card, RagPill } from "@/components/ui-bits";
import { useApp } from "@/lib/appContext";
import type { TeamMember, PersonalDevGoal, RAG } from "@/lib/mockData";
import { Sparkles, X, ChevronRight, Flag, AlertCircle, Check, Pencil, CheckCircle2, Circle, Loader2, Clock, TriangleAlert, Users, ExternalLink } from "lucide-react";

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

function WatermelonSVG() {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
      <path d="M5 22 A14 14 0 0 1 29 22 Z" fill="#4ADE80"/>
      <path d="M6.5 22 A13 10 0 0 1 27.5 22 Z" fill="#F472B6"/>
      <path d="M8 22 A11 8 0 0 1 26 22 Z" fill="#FCA5A5"/>
      <circle cx="12" cy="20" r="1.2" fill="#1D4ED8"/>
      <circle cx="17" cy="19" r="1.2" fill="#1D4ED8"/>
      <circle cx="22" cy="20" r="1.2" fill="#1D4ED8"/>
      <circle cx="14.5" cy="22" r="1.2" fill="#1D4ED8"/>
      <circle cx="19.5" cy="22" r="1.2" fill="#1D4ED8"/>
    </svg>
  );
}
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Beautifully styled card for team members who have not set any goals ───────

function NoGoalMemberCard({ m, onOpen, isClickable }: {
  m: TeamMember;
  onOpen: (m: TeamMember) => void;
  isClickable: boolean;
}) {
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={() => isClickable && onOpen(m)}
      onKeyDown={e => { if (isClickable && (e.key === "Enter" || e.key === " ")) onOpen(m); }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all select-none",
        isClickable
          ? "cursor-pointer hover:shadow-lg hover:border-rag-red/50 active:scale-[0.99]"
          : "cursor-default",
        "border-rag-red/30 shadow-sm"
      )}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rag-red/8 via-card to-card pointer-events-none" />
      {/* Decorative circles */}
      <div className="absolute -top-5 -right-5 size-24 rounded-full bg-rag-red/6 pointer-events-none" />
      <div className="absolute bottom-0 right-8 size-10 rounded-full bg-rag-red/4 pointer-events-none" />

      <div className="relative p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="size-14 rounded-2xl bg-gradient-to-br from-rag-red/30 to-rag-red/10 text-rag-red grid place-items-center font-bold text-lg shrink-0 border border-rag-red/25 shadow-sm">
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

            {/* Status badges */}
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rag-red/12 text-rag-red border border-rag-red/25">
                <Flag className="size-2.5" /> No Goals Set
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-medium">Min. 3 required</span>
            </div>
          </div>
        </div>

        {/* Bottom action row for clickable cards */}
        {isClickable && (
          <div className="mt-4 pt-3 border-t border-rag-red/15 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Open to provide feedback &amp; suggest goals</span>
            <span className="text-xs font-semibold text-primary">View →</span>
          </div>
        )}
        {!isClickable && (
          <div className="mt-4 pt-3 border-t border-rag-red/10">
            <span className="text-[10px] text-muted-foreground/50 italic">Goal-setting action required by {m.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dept-goal group card (HOD view) ───────────────────────────────────────────

type DeptGoal = {
  id: string; title: string; owner: string; progress: number; weightage?: number;
  dueDate?: string; ragQ1?: string; ragQ2?: string; ragQ3?: string; ragQ4?: string;
};

function currentQuarterKey(): "Q1" | "Q2" | "Q3" | "Q4" {
  const m = new Date().getMonth();
  if (m <= 2) return "Q1"; if (m <= 5) return "Q2"; if (m <= 8) return "Q3"; return "Q4";
}

function formatDueDate(ym: string) {
  const [y, mo] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(mo) - 1]} ${y}`;
}

function DeptGoalGroupView({
  deptGoal,
  contributors,
  onOpenContributionModal,
  isHod,
  viewedUserName,
}: {
  deptGoal: DeptGoal;
  contributors: Array<{ member: TeamMember; goal: TeamMember["goals"][number] }>;
  onOpenContributionModal: () => void;
  isHod: boolean;
  viewedUserName: string;
}) {
  const ownerNames = deptGoal.owner ? deptGoal.owner.split(",").map(s => s.trim()).filter(Boolean) : [];

  // Contribution sum validation
  const totalContribution = contributors.reduce((sum, { goal }) => sum + (goal.weightage ?? 0), 0);
  const hasNewlyLinked = contributors.some(({ goal }) => (goal.weightage ?? 0) === 0);
  const hasWeightageIssue = contributors.length > 0 && totalContribution !== 100;

  const qKey = currentQuarterKey();
  const ragKey = `rag${qKey}` as keyof DeptGoal;
  const storedRag = deptGoal[ragKey] as string | undefined;
  const isConfirmed = Boolean(storedRag && ["red","amber","green"].includes(storedRag as string));
  const rags = contributors
    .map(({ goal }) => goal.quarters?.find((q: { q: string; rag: RAG }) => q.q === qKey)?.rag)
    .filter(Boolean) as RAG[];
  const uniqueRags = [...new Set(rags)];
  const consensusRag = uniqueRags.length === 1 ? uniqueRags[0] : null;
  const isMixed = rags.length > 0 && uniqueRags.length > 1;
  const displayRag = isConfirmed ? (storedRag as RAG) : (consensusRag ?? null);

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden shadow-sm transition-colors",
      hasWeightageIssue
        ? "border-rag-amber/60 shadow-amber/5"
        : "border-border"
    )}>
      {/* ── Weightage-sum alert banner (HOD only, shown above header) ── */}
      {hasWeightageIssue && isHod && (
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-rag-amber/12 border-b border-rag-amber/30">
          <div className="flex items-center gap-2 min-w-0">
            <TriangleAlert className="size-3.5 text-amber-foreground shrink-0" />
            <span className="text-xs text-amber-foreground">
              {hasNewlyLinked
                ? <>Newly linked goal needs a % contribution — click any member to open and adjust weightages (total: <strong>{totalContribution}%</strong> / 100%)</>
                : <>Contributions total <strong>{totalContribution}%</strong> — must equal 100%. Click any member to adjust.</>
              }
            </span>
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-foreground bg-rag-amber/20 border border-rag-amber/40 px-2 py-0.5 rounded-full">
            Action required
          </span>
        </div>
      )}

      {/* ── Stylish subheader ── */}
      <div className="bg-gradient-to-r from-primary/8 via-primary/5 to-transparent border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg leading-snug text-foreground">{deptGoal.title}</h3>
            {ownerNames.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-0.5">Owners</span>
                {ownerNames.map(n => (
                  <span key={n} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right min-w-0">
            <div className="text-xs font-semibold text-foreground mb-1.5">Overall {qKey} Progress Status</div>
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {displayRag ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "size-2.5 rounded-full shrink-0",
                      displayRag === "green" ? "bg-rag-green" : displayRag === "amber" ? "bg-rag-amber" : "bg-rag-red"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold",
                      displayRag === "green" ? "text-rag-green" : displayRag === "amber" ? "text-amber-foreground" : "text-rag-red"
                    )}>
                      {displayRag === "green" ? "Green" : displayRag === "amber" ? "Amber" : "Red"}
                    </span>
                  </div>
                  {deptGoal.dueDate && (
                    <span className="text-[10px] text-muted-foreground">· Due {formatDueDate(deptGoal.dueDate)}</span>
                  )}
                </>
              ) : isMixed ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber/10 text-amber-foreground border border-amber/30">Pending confirmation</span>
                  {deptGoal.dueDate && (
                    <span className="text-[10px] text-muted-foreground">· Due {formatDueDate(deptGoal.dueDate)}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[10px] text-muted-foreground">{`No ${qKey} data yet`}</span>
                  {deptGoal.dueDate && (
                    <span className="text-[10px] text-muted-foreground">· Due {formatDueDate(deptGoal.dueDate)}</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contributors ── */}
      <div className="divide-y divide-border/50">
        {contributors.map(({ member, goal }) => {
          const canClick = isHod || member.directManager === viewedUserName;
          const pct = goal.weightage ?? 0;
          const isNewlyLinkedRow = pct === 0;
          const rowContent = (
            <>
              <div className="size-8 rounded-full bg-secondary text-primary grid place-items-center font-medium text-sm shrink-0">{member.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-sm font-semibold", canClick ? "text-primary" : "text-foreground")}>
                    {member.name}
                  </span>
                  {!goal.approved && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber/10 text-amber-foreground border border-amber/30">Pending</span>
                  )}
                  {isNewlyLinkedRow ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-500/40">
                      Needs weighting
                    </span>
                  ) : (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full border",
                      hasWeightageIssue
                        ? "bg-rag-amber/10 text-amber-foreground border-rag-amber/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                      {pct}% contribution
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{goal.title}</div>
              </div>
              <RagPill rag={member.rag} />
            </>
          );
          return canClick ? (
            <button
              key={`${member.id}-${goal.id}`}
              onClick={onOpenContributionModal}
              className={cn(
                "flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/40 transition-colors",
                isNewlyLinkedRow && "bg-orange-50/60 dark:bg-orange-900/10"
              )}
            >
              {rowContent}
            </button>
          ) : (
            <div
              key={`${member.id}-${goal.id}`}
              className={cn("flex items-center gap-3 px-4 py-3", isNewlyLinkedRow && "bg-orange-50/60 dark:bg-orange-900/10")}
            >
              {rowContent}
            </div>
          );
        })}

        {contributors.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">No goals linked to this department objective yet.</div>
        )}

        {/* ── Contribution sum footer — visible to all, styled by status ── */}
        {contributors.length > 0 && (
          <div className={cn(
            "flex items-center justify-between px-4 py-2.5 text-xs",
            totalContribution === 100
              ? "bg-rag-green/5 border-t border-rag-green/20"
              : "bg-rag-amber/8 border-t border-rag-amber/25"
          )}>
            <div className="flex items-center gap-2">
              <Users className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">{contributors.length} contributing member{contributors.length !== 1 ? "s" : ""}</span>
            </div>
            <span className={cn(
              "font-semibold",
              totalContribution === 100 ? "text-rag-green" : "text-amber-foreground"
            )}>
              {totalContribution === 100 ? "✓ 100% accounted" : `${totalContribution}% / 100%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contribution Overview Dialog ──────────────────────────────────────────────
// First pop-up: shows all contributors for a dept-goal.
// HODs can click a member's name to inline-edit their contribution details.
// Leave supervisors click their direct reports' names to open the full goals drawer.

function ContributionOverviewDialog({
  deptGoal,
  contributors,
  onClose,
  onOpenMember,
  isHod,
  viewedUserName,
}: {
  deptGoal: DeptGoal;
  contributors: Array<{ member: TeamMember; goal: TeamMember["goals"][number] }>;
  onClose: () => void;
  onOpenMember: (m: TeamMember) => void;
  isHod: boolean;
  viewedUserName: string;
}) {
  const { modifyGoal, departmentGoals } = useApp();

  // HOD: one always-visible draft per contributor, keyed "memberId-goalId"
  const [hodDrafts, setHodDrafts] = useState<Record<string, {
    description: string; metric: string; linkedDept: string; weightage: number;
  }>>({});

  useEffect(() => {
    if (!isHod) return;
    setHodDrafts(prev => {
      const next = { ...prev };
      contributors.forEach(({ member, goal }) => {
        const k = `${member.id}-${goal.id}`;
        if (!(k in next)) {
          next[k] = { description: goal.description, metric: goal.metric, linkedDept: goal.linkedDept ?? "", weightage: goal.weightage ?? 0 };
        }
      });
      return next;
    });
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
    toast.success(`Changes saved — ${memberName} will be notified to acknowledge`);
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
  const saveEdit = (memberId: string, goalId: string, memberName: string) => {
    if (!editDraft) return;
    modifyGoal(memberId, goalId, editDraft, false);
    toast.success(`Goal updated — ${memberName} will be notified to acknowledge`);
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
        </div>

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
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className={cn("text-[10px] font-semibold uppercase tracking-widest", isNewlyLinked ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
                              % Contribution{isNewlyLinked ? " *" : ""}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={hodDraft.weightage}
                              onChange={e => updateHodDraft(k, "weightage", Math.max(0, Math.min(100, Number(e.target.value))))}
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
                              {departmentGoals.map(dg => (
                                <option key={dg.id} value={dg.id}>{dg.title}</option>
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

                        <button
                          onClick={() => saveHodEdit(member.id, goal.id, member.name)}
                          className={cn(
                            "text-sm font-medium px-4 py-2 rounded-lg transition-opacity",
                            isNewlyLinked
                              ? "bg-orange-500 text-white hover:opacity-90"
                              : "bg-primary text-primary-foreground hover:opacity-90"
                          )}
                        >
                          Save Changes
                        </button>
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
                              {departmentGoals.map(dg => (
                                <option key={dg.id} value={dg.id}>{dg.title}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => saveEdit(member.id, goal.id, member.name)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                            >
                              Save Changes
                            </button>
                            <button onClick={cancelEdit} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                              Cancel
                            </button>
                            <span className="text-[10px] text-muted-foreground ml-1">{member.name} will be notified.</span>
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

export function TeamSection() {
  const { teamMembers, tier, currentUser, focusedTeamMemberId, setFocusedTeamMemberId, departmentGoals, staffMemberId, adminMemberId, opsMeta } = useApp();
  const [active, setActive] = useState<TeamMember | null>(null);

  // Store only the dept-goal ID so the dialog always reads fresh contributor data from live state.
  const [contributionModalGoalId, setContributionModalGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedTeamMemberId) {
      const member = teamMembers.find(m => m.id === focusedTeamMemberId) ?? null;
      setActive(member);
      setFocusedTeamMemberId(null);
    }
  }, [focusedTeamMemberId]);

  const isHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const viewedMemberId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null;
  const viewedUserName = opsMeta
    ? opsMeta.user.name
    : (viewedMemberId ? (teamMembers.find(m => m.id === viewedMemberId)?.name ?? currentUser.name) : currentUser.name);

  const visibleMembers = teamMembers;

  // Dept-goal grouped view, sorted by weightage desc. All linked goals appear (incl. 0% newly linked).
  const deptGoalGroups = [...departmentGoals]
    .sort((a, b) => (b.weightage ?? 0) - (a.weightage ?? 0))
    .map(dg => ({
      deptGoal: dg,
      contributors: visibleMembers.flatMap(m =>
        m.goals
          .filter(g => g.linkedDept === dg.id)
          .map(g => ({ member: m, goal: g }))
      ),
    }))
    .filter(g => g.contributors.length > 0);

  const membersWithNoGoals = visibleMembers.filter(m => m.goals.length === 0);

  // Derived from live state so HOD edits in the dialog are immediately reflected.
  const contributionModalData = contributionModalGoalId
    ? deptGoalGroups.find(g => g.deptGoal.id === contributionModalGoalId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* ── Top banner header ── */}
      <div className="rounded-2xl overflow-hidden">
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 55%, #8B5CF6 100%)" }}
        >
          <div className="flex items-center gap-3">
            <TeamSVG />
            <div>
              <h2 className="font-display text-2xl text-white">Team Goals</h2>
            </div>
          </div>
        </div>
      </div>

      {/* ── Team Goals & Progress subheader ── */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <WatermelonSVG />
          <h2 className="font-display text-2xl">Team Goals & Progress</h2>
        </div>
      </div>

      <div className="space-y-4">
        {deptGoalGroups.map(({ deptGoal, contributors }) => (
          <DeptGoalGroupView
            key={deptGoal.id}
            deptGoal={deptGoal}
            contributors={contributors}
            onOpenContributionModal={() => setContributionModalGoalId(deptGoal.id)}
            isHod={isHod}
            viewedUserName={viewedUserName}
          />
        ))}

        {membersWithNoGoals.length > 0 && (
          <div>
            <div className="mb-5 mt-4">
              <div className="flex items-center gap-3">
                <Flag className="size-7 text-rag-red/70 shrink-0" />
                <h2 className="font-display text-2xl">Team Members Without Goals</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                These team members have yet to set performance goals. Click a member to view their profile — direct managers and HODs can also provide feedback and suggest goals.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {membersWithNoGoals.map(m => (
                <NoGoalMemberCard
                  key={m.id}
                  m={m}
                  onOpen={setActive}
                  isClickable={isHod || m.directManager === viewedUserName}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contribution overview modal (opens when name clicked in dept-goal card) */}
      {contributionModalData && (
        <ContributionOverviewDialog
          deptGoal={contributionModalData.deptGoal}
          contributors={contributionModalData.contributors}
          onClose={() => setContributionModalGoalId(null)}
          onOpenMember={m => { setContributionModalGoalId(null); setActive(m); }}
          isHod={isHod}
          viewedUserName={viewedUserName}
        />
      )}

      {/* Full goals drawer (opens from contribution overview or directly from HOD shortcuts) */}
      {active && <TeamDrawer member={active} onClose={() => setActive(null)} />}
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

  const draftWithAI = async (idx: number) => {
    setActivePrompt(idx);
    setDrafting(true);
    await new Promise(r => setTimeout(r, 1400));
    setText(idx === 0
      ? `Great initiative! To make this goal more impactful, consider adding a measurable milestone — e.g., "achieve IBF-certified proficiency by Q4 2026" or "apply this skill in at least 2 live projects this year." I'd suggest linking it to a specific department initiative so progress is visible to the team. Let's discuss the scope in our next 1:1 to agree on a realistic timeline.`
      : `For "${goal.title}", here are 3 targeted resources: (1) IBF-accredited e-learning on the SkillsFuture portal — free for Singapore residents; (2) Request an internal mentor via the P&C coaching marketplace; (3) The L&D team's curated reading list is available on the intranet under P&C > Development Resources. I'm also happy to connect you with a colleague who has completed this pathway.`
    );
    setDrafting(false);
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    const isFirstInput = !hasExistingInput;
    saveManagerInput(memberId, goal.id, text.trim());
    if (isFirstInput) addPoints(15);
    toast.success(`Feedback saved — ${memberName} will be notified${isFirstInput ? " (+15 pts)" : ""}`);
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
          <Sparkles className="size-3" /> Ask Pulse AI to draft your feedback
        </div>
        <div className="flex flex-col gap-1.5">
          {prompts.map((p, i) => (
            <button
              key={i}
              onMouseDown={() => draftWithAI(i)}
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
            <Loader2 className="size-3 animate-spin" /> Pulse AI is drafting…
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

export function TeamDrawer({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { staffDevGoals, adminDevGoals, staffMemberId, adminMemberId, tier, currentUser, teamMembers, opsMeta, teamDevGoalsById } = useApp();

  // Always resolve the member's full dev goal list — not just the currently-switched-to persona —
  // so HOD/leave-supervisor drawer views show everything, including for "no goals" members.
  const memberDevGoals: PersonalDevGoal[] =
    member.id === staffMemberId ? staffDevGoals :
    member.id === adminMemberId ? adminDevGoals :
    teamDevGoalsById[member.id] ?? [];

  // Determine if the currently-viewed user can provide feedback (HOD or direct manager only)
  const isViewerHod = (tier === "manager" && currentUser.hod) || tier === "ops_hod";
  const viewedMemberId = tier === "staff" ? staffMemberId : tier === "admin" ? adminMemberId : null;
  const viewedUserName = opsMeta
    ? opsMeta.user.name
    : (viewedMemberId ? (teamMembers.find(m => m.id === viewedMemberId)?.name ?? currentUser.name) : currentUser.name);
  const canProvideFeedback = isViewerHod || member.directManager === viewedUserName;

  // Pending-approval goals shown first, approved goals below
  const pendingGoals = member.goals.filter(g => !g.approved);
  const approvedGoals = member.goals.filter(g => g.approved);

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" />
      <div
        className="w-[640px] bg-background h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
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
          {/* ── Performance Goals ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="size-1.5 rounded-full bg-primary shrink-0" />
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Performance Goals ({member.goals.length})
              </div>
            </div>

            {member.goals.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-rag-red/30 bg-rag-red/5 px-6 py-8 text-center">
                  <Flag className="size-6 text-rag-red mx-auto mb-2" />
                  <div className="font-medium text-rag-red">No Goals Set</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {member.name} has not set any goals yet. A minimum of 3 goals is required.
                  </div>
                </div>
                {canProvideFeedback && <NoGoalsFeedbackPanel memberName={member.name} />}
              </div>
            ) : (
              <div className="space-y-4">
                {member.goals.length < 3 && (
                  <div className="rounded-lg border border-rag-amber/40 bg-rag-amber/5 px-4 py-3 flex items-start gap-2">
                    <AlertCircle className="size-4 text-amber-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-foreground">
                      <span className="font-medium">Incomplete goals ({member.goals.length}/3 minimum).</span>{" "}
                      {member.name} must set at least 3 goals.
                    </div>
                  </div>
                )}
                {/* Pending approval goals first */}
                {pendingGoals.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-widest text-amber-foreground/80 font-semibold pl-1">Pending Approval</div>
                    {pendingGoals.map((g) => (
                      <GoalCard key={g.id} goal={g} memberName={member.name} memberId={member.id} directManager={member.directManager} />
                    ))}
                  </div>
                )}
                {/* Approved goals below */}
                {approvedGoals.length > 0 && (
                  <div className="space-y-3">
                    {pendingGoals.length > 0 && (
                      <div className="text-[10px] uppercase tracking-widest text-rag-green/80 font-semibold pl-1">Approved</div>
                    )}
                    {approvedGoals.map((g) => (
                      <GoalCard key={g.id} goal={g} memberName={member.name} memberId={member.id} directManager={member.directManager} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Development Goals ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="size-1.5 rounded-full bg-amber shrink-0" />
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Development Goals ({memberDevGoals.length})
              </div>
            </div>
            {memberDevGoals.length === 0 ? (
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
                            <Circle className="size-3.5" /> In progress
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
    toast.success("Response sent · +10 pts");
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
              <Sparkles className="size-3" /> {givingFeedback ? "Cancel Feedback" : "Provide Feedback"}
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
