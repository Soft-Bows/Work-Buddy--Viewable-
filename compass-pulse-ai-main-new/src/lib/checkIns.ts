// 1:1 check-in records — the missing "conversation object" every leading performance platform
// (15Five, Betterworks, Lattice) treats as the atomic unit of manager-report engagement. Adds:
//   - a Conversation Prep Agent (generatePrepTalkingPoints) that drafts talking points from a
//     member's recent KR/dev-goal activity before the conversation — same rule-based "AI" approach
//     as every other AI feature in this app (see AI_REC_RULES in MyGoalsSection.tsx, the challenge
//     classifier in insights.ts) — no live LLM call, deliberately.
//   - AI Minutes (generateAiMinutes) — an auto-captured summary once the check-in is logged, the
//     Lattice-style "joins the 1:1 and writes it up" pattern, templated from what was actually
//     entered rather than invented.
import type { KeyResult, PersonalDevGoal, TeamMember } from "./mockData";
import { isKrOverdue } from "./utils";

export interface CheckInActionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CheckIn {
  id: string;
  managerName: string;
  memberName: string;
  date: string; // "YYYY-MM-DD"
  talkingPoints: string[]; // Conversation Prep Agent output, captured at log time
  notes: string; // the manager's own free-text notes from the conversation
  actionItems: CheckInActionItem[];
  aiMinutes: string; // auto-generated summary — see generateAiMinutes
}

// How many calendar days define "recent" for a KR/dev-goal signal to still be worth raising in a
// prep brief — anything older is stale news by the time the conversation happens.
const RECENT_WINDOW_DAYS = 30;
const daysSince = (iso?: string): number => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : Infinity);

// Drafts up to the top 5 talking points for an upcoming check-in from the member's live KR/dev-goal
// state — the same inputs a manager would otherwise have to reassemble by hand from Team OKRs
// before every 1:1. Ordered by what most helps the member's actual performance: open risks first
// (the thing most likely to need course-correction), then overdue items, then genuine wins worth
// reinforcing, then a followed-up action item from the last check-in, falling back to a generic
// prompt if nothing else applies. Capped at 5, not 6 — a prep brief long enough to need scrolling
// stops being a quick pre-read.
export function generatePrepTalkingPoints(
  member: TeamMember,
  memberKeyResults: KeyResult[],
  memberDevGoals: PersonalDevGoal[],
  lastCheckIn?: CheckIn,
): string[] {
  const points: string[] = [];

  for (const kr of memberKeyResults) {
    if (kr.ragConfidence === "red" || kr.ragConfidence === "amber") {
      const base = `"${kr.title}" is currently ${kr.ragConfidence.toUpperCase()}`;
      points.push(kr.challengeRemark ? `${base} — they flagged: "${kr.challengeRemark.text}"` : `${base} — ask what's needed to get it back on track.`);
    }
  }
  for (const kr of memberKeyResults) {
    if (isKrOverdue(kr)) points.push(`"${kr.title}" is past its scoring due date — check what's blocking it.`);
  }
  for (const kr of memberKeyResults) {
    if (kr.score !== undefined && kr.score >= 0.85 && daysSince(kr.scoreSubmittedDate) <= RECENT_WINDOW_DAYS) {
      points.push(`Celebrate: "${kr.title}" scored ${kr.score.toFixed(1)} — worth calling out.`);
    }
  }
  for (const g of memberDevGoals) {
    if (g.completed && daysSince(g.completedDate) <= RECENT_WINDOW_DAYS) {
      points.push(`"${g.title}" was just completed — a good moment to talk about what's next.`);
    } else if (!g.completed && g.dueDate) {
      const [y, m] = g.dueDate.split("-").map(Number);
      const dueYM = y * 12 + (m - 1);
      const nowYM = new Date().getFullYear() * 12 + new Date().getMonth();
      if (dueYM < nowYM) points.push(`Development goal "${g.title}" is overdue — see if it's still the right priority.`);
    }
  }
  if (lastCheckIn) {
    for (const item of lastCheckIn.actionItems) {
      if (!item.done) points.push(`Follow up on last time's action item: "${item.text}"`);
    }
  }
  if (points.length === 0) {
    points.push("No open risks or overdue items right now — a good check-in for workload, priorities, and career development.");
  }
  return points.slice(0, 5);
}

// Templated "minutes" from what was actually captured — not invented content. Mirrors Lattice's
// "auto-captures the summary, action items, and next meeting's agenda" pattern, minus the live
// meeting-join (this app has no video/audio integration) — the manager fills in notes/action items
// during or after the conversation, and this turns that into a short written record.
export function generateAiMinutes(
  memberName: string,
  talkingPointsCovered: string[],
  notes: string,
  actionItems: CheckInActionItem[],
): string {
  const parts: string[] = [];
  parts.push(`Check-in with ${memberName}.`);
  if (talkingPointsCovered.length > 0) {
    parts.push(`Covered ${talkingPointsCovered.length} topic${talkingPointsCovered.length === 1 ? "" : "s"} from the prep brief, including ${talkingPointsCovered.length > 1 ? "the first" : "it"}: "${talkingPointsCovered[0]}"${talkingPointsCovered.length > 1 ? ` and ${talkingPointsCovered.length - 1} more.` : "."}`);
  }
  if (notes.trim()) {
    parts.push(`Notes: ${notes.trim()}`);
  }
  if (actionItems.length > 0) {
    parts.push(`${actionItems.length} action item${actionItems.length === 1 ? "" : "s"} agreed: ${actionItems.map(a => a.text).join("; ")}.`);
  } else {
    parts.push("No action items were logged this time.");
  }
  parts.push("Next check-in recommended within 30 days.");
  return parts.join(" ");
}

// "Needs a check-in" nudge threshold — 30 days, the same cadence generatePrepTalkingPoints and
// generateAiMinutes both reference, so the nudge and the copy agree with each other.
export const CHECK_IN_CADENCE_DAYS = 30;

export function daysSinceLastCheckIn(checkIns: CheckIn[], managerName: string, memberName: string): number | null {
  const relevant = checkIns.filter(c => c.managerName === managerName && c.memberName === memberName);
  if (relevant.length === 0) return null;
  const mostRecent = relevant.reduce((latest, c) => (c.date > latest ? c.date : latest), relevant[0].date);
  return daysSince(mostRecent);
}
