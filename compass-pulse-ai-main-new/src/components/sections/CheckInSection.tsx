import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/appContext";
import { generatePrepTalkingPoints, generateAiMinutes, daysSinceLastCheckIn, CHECK_IN_CADENCE_DAYS, type CheckInActionItem } from "@/lib/checkIns";
import { mockPulseAiReply } from "@/lib/pulseAiReply";
import type { TeamMember, KeyResult, PersonalDevGoal } from "@/lib/mockData";
import { ChevronDown, ChevronUp, Sparkles, MessageCircle, Plus, X, Check, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// 1:1 check-ins, collapsed by default — a Conversation Prep Agent drafts talking points from the
// member's live KR/dev-goal state before logging, and AI Minutes are auto-written once it's saved
// (Lattice's "joins the 1:1 and writes it up" pattern, minus the live meeting-join this app has no
// video integration for — the manager's own notes/action items stand in for the transcript).
// Deliberately a single collapsed section rather than a new page: this already lives inside the
// Team OKRs member drawer, which is dense enough without another permanent block.
export function CheckInSection({
  member, managerName, memberKeyResults, memberDevGoals, canLog,
}: {
  member: TeamMember;
  managerName: string;
  memberKeyResults: KeyResult[];
  memberDevGoals: PersonalDevGoal[];
  canLog: boolean;
}) {
  const { checkIns, addCheckIn, toggleCheckInActionItem, logAiActivity } = useApp();
  const memberCheckIns = checkIns
    .filter(c => c.memberName === member.name && c.managerName === managerName)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastCheckIn = memberCheckIns[0];
  const daysSince = daysSinceLastCheckIn(checkIns, managerName, member.name);
  const overdue = daysSince !== null && daysSince > CHECK_IN_CADENCE_DAYS;

  const [expanded, setExpanded] = useState(false);
  const [logging, setLogging] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [actionItems, setActionItems] = useState<CheckInActionItem[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);
  const [askOpen, setAskOpen] = useState(false);
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const startLogging = () => {
    const points = generatePrepTalkingPoints(member, memberKeyResults, memberDevGoals, lastCheckIn);
    setTalkingPoints(points);
    setNotes("");
    setActionItems([]);
    setActionDraft("");
    setAskOpen(false);
    setAskQuery("");
    setAskAnswer(null);
    setLogging(true);
    logAiActivity({
      date: new Date().toISOString().slice(0, 10), kind: "prep_agent",
      summary: `Prep brief drafted for ${member.name}'s check-in`, targetName: member.name, actorName: managerName,
    });
  };

  const addActionItem = () => {
    if (!actionDraft.trim()) return;
    setActionItems(prev => [...prev, { id: `tmp${Date.now()}`, text: actionDraft.trim(), done: false }]);
    setActionDraft("");
  };

  // Free-form, on top of the auto-drafted prep brief above — for anything the top-5 talking points
  // don't cover (how to open a hard conversation, how to phrase feedback, etc.). Same rule-based
  // reply engine as the floating Pulse AI assistant (pulseAiReply.ts), just asked in-context here so
  // the manager doesn't have to leave the check-in flow to get it.
  const askPulseAi = async () => {
    if (!askQuery.trim()) return;
    setAsking(true);
    const query = askQuery.trim();
    await new Promise(r => setTimeout(r, 900));
    setAskAnswer(mockPulseAiReply(query, { checkInMemberName: member.name }));
    setAsking(false);
    logAiActivity({
      date: new Date().toISOString().slice(0, 10), kind: "prep_agent",
      summary: `Pulse AI asked for help with ${member.name}'s check-in: "${query.length > 60 ? `${query.slice(0, 60)}…` : query}"`,
      targetName: member.name, actorName: managerName,
    });
  };

  const saveCheckIn = () => {
    const aiMinutes = generateAiMinutes(member.name, talkingPoints, notes, actionItems);
    addCheckIn({
      managerName, memberName: member.name, date: new Date().toISOString().slice(0, 10),
      talkingPoints, notes, actionItems, aiMinutes,
    });
    setLogging(false);
    setHistoryOpen(true);
    toast.success(`Check-in logged for ${member.name} — AI minutes generated`);
  };

  return (
    <div className="rounded-xl border border-sky-200/70 dark:border-sky-800/40 bg-sky-50/40 dark:bg-sky-950/10 overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-sm font-semibold">1:1 Check-ins</span>
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
            overdue ? "bg-rag-amber/20 text-amber-800 dark:text-amber-400" : "bg-muted text-muted-foreground",
          )}>
            {daysSince === null ? "No check-ins yet" : `${daysSince}d ago`}
          </span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3">
          {!logging ? (
            <div className="flex items-center gap-2 flex-wrap">
              {canLog && (
                <button onClick={startLogging} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  Log a check-in
                </button>
              )}
              {memberCheckIns.length > 0 && (
                <button onClick={() => setHistoryOpen(v => !v)} className="px-3 py-1.5 rounded-md border border-border text-xs">
                  {historyOpen ? "Hide" : "View"} history ({memberCheckIns.length})
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
                <Sparkles className="size-3" /> Prep brief
              </div>
              <ul className="space-y-1">
                {talkingPoints.map((p, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
                    <span className="text-primary shrink-0">•</span>{p}
                  </li>
                ))}
              </ul>

              {/* Ask Pulse AI — on top of the top-5 auto-drafted points above, for anything else:
                  how to phrase feedback, open a hard conversation, etc. */}
              <div className="border-t border-primary/15 pt-2">
                {!askOpen ? (
                  <button onClick={() => setAskOpen(true)} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                    <MessageCircle className="size-3" /> Ask Pulse AI for more help
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-muted-foreground">Ask Pulse AI — e.g. "how do I bring up a hard topic with {member.name.split(" ")[0]}?"</label>
                    <div className="flex gap-1.5">
                      <input
                        value={askQuery} onChange={e => setAskQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void askPulseAi(); } }}
                        placeholder="Ask anything about this check-in…"
                        className="flex-1 text-xs rounded-md border border-input bg-background px-2 py-1.5"
                      />
                      <button onClick={() => void askPulseAi()} disabled={asking || !askQuery.trim()} className="size-7 rounded-md border border-border grid place-items-center shrink-0 disabled:opacity-40">
                        <Send className="size-3.5" />
                      </button>
                    </div>
                    {asking && <div className="text-[11px] text-muted-foreground">Thinking…</div>}
                    {askAnswer && !asking && (
                      <p className="text-xs text-foreground/85 leading-relaxed bg-background rounded-md border border-border p-2">{askAnswer}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground">Notes from the conversation</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="What came up? Key context for next time…"
                  className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Action items</label>
                <div className="flex gap-1.5 mt-0.5">
                  <input
                    value={actionDraft} onChange={e => setActionDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addActionItem(); } }}
                    placeholder="e.g. Follow up with IT on the automation ticket"
                    className="flex-1 text-xs rounded-md border border-input bg-background px-2 py-1.5"
                  />
                  <button onClick={addActionItem} className="size-7 rounded-md border border-border grid place-items-center shrink-0">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                {actionItems.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {actionItems.map(a => (
                      <li key={a.id} className="flex items-center justify-between gap-2 text-xs bg-background rounded-md border border-border px-2 py-1">
                        <span>{a.text}</span>
                        <button onClick={() => setActionItems(prev => prev.filter(x => x.id !== a.id))} className="text-muted-foreground hover:text-destructive shrink-0">
                          <X className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-1.5 pt-1">
                <button onClick={saveCheckIn} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  Save check-in
                </button>
                <button onClick={() => setLogging(false)} className="px-3 py-1.5 rounded-md border border-border text-xs">Cancel</button>
              </div>
            </div>
          )}

          {historyOpen && (
            <div className="space-y-1.5">
              {memberCheckIns.map(ci => (
                <div key={ci.id} className="rounded-lg border border-border/60 bg-background/70">
                  <button
                    onClick={() => setExpandedHistoryId(v => (v === ci.id ? null : ci.id))}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left"
                  >
                    <span className="text-xs flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground shrink-0" />
                      {new Date(ci.date).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{ci.actionItems.filter(a => !a.done).length} open action item{ci.actionItems.filter(a => !a.done).length === 1 ? "" : "s"}</span>
                  </button>
                  {expandedHistoryId === ci.id && (
                    <div className="px-2.5 pb-2.5 space-y-2">
                      <div className="rounded-md bg-primary/5 border border-primary/15 p-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary"><Sparkles className="size-2.5" /> AI Minutes</div>
                        <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed">{ci.aiMinutes}</p>
                      </div>
                      {ci.actionItems.length > 0 && (
                        <ul className="space-y-1">
                          {ci.actionItems.map(a => (
                            <li key={a.id} className="flex items-center gap-2 text-xs">
                              <button
                                onClick={() => toggleCheckInActionItem(ci.id, a.id)}
                                className={cn("size-4 rounded border shrink-0 grid place-items-center", a.done ? "bg-rag-green border-rag-green text-white" : "border-border")}
                              >
                                {a.done && <Check className="size-2.5" />}
                              </button>
                              <span className={cn(a.done && "line-through text-muted-foreground")}>{a.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
