// ── The single seam for every "AI"-labelled feature in this app ────────────────────────────────
//
// Every AI-flavoured feature — the 1:1 Conversation Prep Agent, AI Minutes, the "Ask Work Buddy AI"
// box, challenge/score response drafting, the floating Work Buddy AI assistant — now calls through
// getAiProvider() instead of embedding its own generation logic inline. Today, ACTIVE_PROVIDER is
// ruleBasedProvider: the same deterministic, ordered keyword-rule generators this whole app has
// always used (no live LLM call anywhere — see AI_REC_RULES in MyGoalsSection.tsx and the challenge
// classifier in insights.ts for the same convention elsewhere). Nothing about the UI, the data
// model, or any call site assumes that stays true.
//
// ── How to wire in the company's real LLM/chatbot later ──
// 1. Implement a new provider matching the `AiProvider` interface below (e.g. `phillipGptProvider`
//    in a new file), making real calls to PhillipGPT / the company's LLM endpoint. Async by design —
//    every method already returns a Promise, so a real network call is a drop-in, not a rewrite.
// 2. Change the one line at the bottom of this file: `const ACTIVE_PROVIDER: AiProvider = ...`.
// 3. Every consumer (CheckInSection, the floating assistant, TeamSection/MyGoalsSection's challenge-
//    response drafting) picks up the change automatically. None of them import the rule-based
//    generators directly any more — only this module.
// 4. For a *hybrid* rollout (real LLM for free-form chat, keep the deterministic generators for
//    anything audit-sensitive like AI Minutes, matching how DBS's PURE governance framework and
//    Workday's Agent System of Record treat "explainable" vs "generative" AI differently) — same
//    approach, just don't swap draftCheckInMinutes.

import type { KeyResult, PersonalDevGoal, TeamMember, RAG } from "./mockData";
import { generatePrepTalkingPoints, generateAiMinutes, type CheckIn, type CheckInActionItem } from "./checkIns";
import { mockWorkBuddyAiReply } from "./workBuddyAiReply";
import { PULSE_QUESTIONS } from "./pulseSurvey";
import { MANAGER_BEHAVIORS } from "./managerEffectiveness";

export interface AiProvider {
  /** Conversation Prep Agent — top-5 talking points for an upcoming 1:1, from live KR/dev-goal state. */
  draftCheckInPrep(member: TeamMember, memberKeyResults: KeyResult[], memberDevGoals: PersonalDevGoal[], lastCheckIn?: CheckIn): Promise<string[]>;
  /** AI Minutes — a written summary of a check-in once it's logged, from what was actually captured. */
  draftCheckInMinutes(memberName: string, talkingPointsCovered: string[], notes: string, actionItems: CheckInActionItem[]): Promise<string>;
  /** Free-form Q&A — the floating assistant and the in-check-in "Ask Work Buddy AI" box. */
  answerQuery(query: string, context?: { checkInMemberName?: string }): Promise<string>;
  /** A HOD/objective owner's draft response to a red/amber confidence challenge or a sub-0.7 score remark. */
  draftChallengeResponse(input: { remarkText: string; urgency: RAG; kind: "confidence" | "score"; score?: number }): Promise<string>;
  /** A manager's draft feedback/recommendation on a team member's development goal, from one of two guided prompts. */
  draftDevGoalFeedback(goalTitle: string, promptIndex: 0 | 1): Promise<string>;
  /**
   * Feedback Corner's action plan — reads the current quarter's Team Pulse aggregate and the
   * current cycle's Manager Self-Improvement Survey aggregate (either may be absent) and produces
   * recommendations informed by both. The two streams are read together for context but never
   * blended into a single score — every item is labelled with which stream it came from, per the
   * "complementary data, one view, clearly labelled" pattern renowned FI/HR platforms converge on.
   */
  synthesizeActionPlan(input: { pulseAvgs?: Record<string, number>; managerAvgs?: Record<string, number>; department: string }): Promise<{ title: string; desc: string; source: "Team Pulse" | "Manager Survey" }[]>;
}

// A small, fixed "thinking" delay on every rule-based call — not fake for its own sake, but because
// removing it entirely made the UI feel like nothing happened, and a real LLM call wouldn't be
// instant either; keeping the same latency shape now means the UI won't need retuning later.
const THINKING_DELAY_MS = 900;
const delay = () => new Promise(r => setTimeout(r, THINKING_DELAY_MS));

const ruleBasedProvider: AiProvider = {
  async draftCheckInPrep(member, memberKeyResults, memberDevGoals, lastCheckIn) {
    return generatePrepTalkingPoints(member, memberKeyResults, memberDevGoals, lastCheckIn);
  },
  async draftCheckInMinutes(memberName, talkingPointsCovered, notes, actionItems) {
    return generateAiMinutes(memberName, talkingPointsCovered, notes, actionItems);
  },
  async answerQuery(query, context) {
    await delay();
    return mockWorkBuddyAiReply(query, context);
  },
  async draftChallengeResponse({ remarkText, urgency, kind, score }) {
    await delay();
    const snippet = remarkText.length > 70 ? `${remarkText.slice(0, 70)}…` : remarkText;
    if (kind === "confidence") {
      const urgent = urgency === "red";
      return `Thanks for flagging this${urgent ? " — since this is Red, let's prioritise unblocking it this week" : ", let's get ahead of it before it slips further"}. On "${snippet}": suggest (1) a short sync to unpack the specific blocker, (2) naming the one thing that would unstick it fastest, and (3) revisiting confidence once that's resolved. Let me know if you need me to loop in anyone else.`;
    }
    const scoreLabel = score !== undefined ? `the ${score.toFixed(1)} score` : "this score";
    return `Thanks for the context on ${scoreLabel}. On "${snippet}": suggest (1) a short retro on what specifically fell short this quarter, (2) agreeing 1-2 concrete support actions before next quarter's cycle, and (3) a check-in mid-quarter so this doesn't repeat. Let me know if you need me to loop in anyone else.`;
  },
  async draftDevGoalFeedback(goalTitle, promptIndex) {
    await new Promise(r => setTimeout(r, 1400));
    return promptIndex === 0
      ? `Great initiative! To make this goal more impactful, consider adding a measurable milestone — e.g., "achieve IBF-certified proficiency by Q4 2026" or "apply this skill in at least 2 live projects this year." I'd suggest linking it to a specific department initiative so progress is visible to the team. Let's discuss the scope in our next 1:1 to agree on a realistic timeline.`
      : `For "${goalTitle}", here are 3 targeted resources: (1) IBF-accredited e-learning on the SkillsFuture portal — free for Singapore residents; (2) Request an internal mentor via the P&C coaching marketplace; (3) The L&D team's curated reading list is available on the intranet under P&C > Development Resources. I'm also happy to connect you with a colleague who has completed this pathway.`;
  },
  async synthesizeActionPlan({ pulseAvgs, managerAvgs, department }) {
    await delay();
    // "Needs attention" threshold — below the midpoint of the 1-5 scale's upper half, so a merely
    // decent 3.5-4 score doesn't generate noise; only genuinely lagging items surface as action items.
    const ATTENTION_THRESHOLD = 3.5;
    const items: { title: string; desc: string; source: "Team Pulse" | "Manager Survey" }[] = [];

    if (pulseAvgs) {
      const lowest = PULSE_QUESTIONS
        .map(q => ({ q, score: pulseAvgs[q.id] }))
        .filter(x => x.score !== undefined)
        .sort((a, b) => a.score - b.score)[0];
      if (lowest && lowest.score < ATTENTION_THRESHOLD) {
        items.push({
          title: `Address "${lowest.q.text}" (${lowest.score.toFixed(1)}/5)`,
          desc: `${department}'s lowest Team Pulse score this quarter. Suggest a short team discussion on what's driving this, and 1-2 concrete changes to try before next quarter's pulse.`,
          source: "Team Pulse",
        });
      }
    }
    if (managerAvgs) {
      const lowest = MANAGER_BEHAVIORS
        .map(b => ({ b, score: managerAvgs[b.id] }))
        .filter(x => x.score !== undefined)
        .sort((a, b) => a.score - b.score)[0];
      if (lowest && lowest.score < ATTENTION_THRESHOLD) {
        items.push({
          title: `Focus area: "${lowest.b.text}" (${lowest.score.toFixed(1)}/5)`,
          desc: `The lowest-rated behaviour in this cycle's Manager Self-Improvement Survey. Consider raising it with your own leave supervisor as a coaching focus, and revisiting it at next cycle.`,
          source: "Manager Survey",
        });
      }
    }
    return items;
  },
};

// ── Swap this one line when the real integration lands ──
const ACTIVE_PROVIDER: AiProvider = ruleBasedProvider;

export function getAiProvider(): AiProvider {
  return ACTIVE_PROVIDER;
}
