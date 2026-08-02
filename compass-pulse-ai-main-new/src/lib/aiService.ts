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
   * Beyond the single lowest-scoring item per stream, also flags a manager-survey item that's
   * meaningfully below company average and one that's regressed vs the manager's own last cycle —
   * item-level, not category-level, per 360-feedback research (specific behaviours are more
   * actionable than broad competency labels) — each tagged with which rule triggered it. Also
   * surfaces 1-2 "reinforce this strength" items for the manager's own top-scoring behaviours —
   * several renowned FIs (DBS's Gallup-based follow-up practice among them) pair "fix the gaps" action
   * plans with "double down on what's already working," not weaknesses alone.
   */
  synthesizeActionPlan(input: {
    pulseAvgs?: Record<string, number>;
    managerAvgs?: Record<string, number>;
    managerCompanyAvgs?: Record<string, number>;
    managerLastYearAvgs?: Record<string, number>;
    department: string;
  }): Promise<{ title: string; desc: string; source: "Team Pulse" | "Manager Survey"; trigger: "lowest score" | "below company average" | "below last year" | "reinforce strength" }[]>;
  /**
   * Sentiment on a batch of free-text responses (e.g. the Manager Survey's 2 open questions) — a
   * keyword-scored classifier, same no-live-LLM convention as everything else here. Returns counts
   * (not percentages) so the caller can decide how to present small samples honestly.
   */
  analyzeSentiment(texts: string[]): Promise<{ positive: number; neutral: number; negative: number; summary: string }>;
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
  async synthesizeActionPlan({ pulseAvgs, managerAvgs, managerCompanyAvgs, managerLastYearAvgs, department }) {
    await delay();
    // "Needs attention" threshold — below the midpoint of the 1-5 scale's upper half, so a merely
    // decent 3.5-4 score doesn't generate noise; only genuinely lagging items surface as action items.
    const ATTENTION_THRESHOLD = 3.5;
    // Minimum gap before a comparison (vs company, vs last year) counts as "meaningfully" behind —
    // a 0.1 wobble shouldn't generate an action item, only a real gap should.
    const GAP_THRESHOLD = 0.3;
    type Item = { title: string; desc: string; source: "Team Pulse" | "Manager Survey"; trigger: "lowest score" | "below company average" | "below last year" | "reinforce strength" };
    // A "proven strength" per DBS-style reinforcement — meaningfully above the general 4.0/5 bar, not
    // just this manager's own best-of-a-mediocre-bunch item.
    const STRENGTH_THRESHOLD = 4.2;
    const items: Item[] = [];
    const usedManagerItemIds = new Set<string>();

    if (pulseAvgs) {
      const lowest = PULSE_QUESTIONS
        .map(q => ({ q, score: pulseAvgs[q.id] }))
        .filter(x => x.score !== undefined)
        .sort((a, b) => a.score - b.score)[0];
      if (lowest && lowest.score < ATTENTION_THRESHOLD) {
        items.push({
          title: `Address "${lowest.q.text}" (${lowest.score.toFixed(1)}/5)`,
          desc: `${department}'s lowest Team Pulse score this quarter. Suggest a short team discussion on what's driving this, and 1-2 concrete changes to try before next quarter's pulse.`,
          source: "Team Pulse", trigger: "lowest score",
        });
      }
    }
    if (managerAvgs) {
      const lowest = MANAGER_BEHAVIORS
        .map(b => ({ b, score: managerAvgs[b.id] }))
        .filter(x => x.score !== undefined)
        .sort((a, b) => a.score - b.score)[0];
      if (lowest && lowest.score < ATTENTION_THRESHOLD) {
        usedManagerItemIds.add(lowest.b.id);
        items.push({
          title: `Focus area: "${lowest.b.text}" (${lowest.score.toFixed(1)}/5)`,
          desc: `The lowest-rated behaviour in this cycle's Manager Self-Improvement Survey (${lowest.b.leadershipArea}). Consider raising it with your own manager as a coaching focus, and revisiting it at next cycle.`,
          source: "Manager Survey", trigger: "lowest score",
        });
      }
      if (managerCompanyAvgs) {
        const worstVsCompany = MANAGER_BEHAVIORS
          .filter(b => !usedManagerItemIds.has(b.id))
          .map(b => ({ b, score: managerAvgs[b.id], company: managerCompanyAvgs[b.id] }))
          .filter((x): x is { b: typeof MANAGER_BEHAVIORS[number]; score: number; company: number } => x.score !== undefined && x.company !== undefined)
          .map(x => ({ ...x, gap: x.company - x.score }))
          .sort((a, b) => b.gap - a.gap)[0];
        if (worstVsCompany && worstVsCompany.gap >= GAP_THRESHOLD) {
          usedManagerItemIds.add(worstVsCompany.b.id);
          items.push({
            title: `"${worstVsCompany.b.text}" trails the company average (${worstVsCompany.score.toFixed(1)} vs ${worstVsCompany.company.toFixed(1)})`,
            desc: `${worstVsCompany.b.leadershipArea} — this is where the gap to company average is widest this cycle. Worth a specific conversation with your own manager on what peers are doing differently here.`,
            source: "Manager Survey", trigger: "below company average",
          });
        }
      }
      if (managerLastYearAvgs) {
        const worstVsLastYear = MANAGER_BEHAVIORS
          .filter(b => !usedManagerItemIds.has(b.id))
          .map(b => ({ b, score: managerAvgs[b.id], lastYear: managerLastYearAvgs[b.id] }))
          .filter((x): x is { b: typeof MANAGER_BEHAVIORS[number]; score: number; lastYear: number } => x.score !== undefined && x.lastYear !== undefined)
          .map(x => ({ ...x, gap: x.lastYear - x.score }))
          .sort((a, b) => b.gap - a.gap)[0];
        if (worstVsLastYear && worstVsLastYear.gap >= GAP_THRESHOLD) {
          items.push({
            title: `"${worstVsLastYear.b.text}" has slipped since last cycle (${worstVsLastYear.lastYear.toFixed(1)} → ${worstVsLastYear.score.toFixed(1)})`,
            desc: `${worstVsLastYear.b.leadershipArea} — the largest year-over-year decline this cycle. Worth checking whether something specific changed (workload, team composition, priorities) since last year's survey.`,
            source: "Manager Survey", trigger: "below last year",
          });
        }
      }
      // DBS-style strength reinforcement — the manager's own top 1-2 behaviours, provided they
      // clear a genuine "proven strength" bar (not just this cycle's relative best). Deliberately
      // capped at 2 so the plan doesn't read as "everything's an action item."
      const strengths = MANAGER_BEHAVIORS
        .filter(b => !usedManagerItemIds.has(b.id))
        .map(b => ({ b, score: managerAvgs[b.id] }))
        .filter((x): x is { b: typeof MANAGER_BEHAVIORS[number]; score: number } => x.score !== undefined && x.score >= STRENGTH_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
      for (const { b, score } of strengths) {
        items.push({
          title: `Keep leaning on: "${b.text}" (${score.toFixed(1)}/5)`,
          desc: `${b.leadershipArea} — a proven strength this cycle. Worth naming explicitly with your team and finding one more place to apply it, not just protecting it.`,
          source: "Manager Survey", trigger: "reinforce strength",
        });
      }
    }
    return items;
  },
  async analyzeSentiment(texts) {
    await delay();
    const clean = texts.filter(t => t.trim());
    if (clean.length === 0) return { positive: 0, neutral: 0, negative: 0, summary: "No free-text responses yet." };
    // Deliberately simple keyword scoring, not a real model — matches every other "AI" feature in
    // this app. Each response is scored on the balance of positive vs negative marker words it
    // contains; ties (or responses with no markers either way) count as neutral.
    const POSITIVE_WORDS = ["excellent", "great", "strong", "clear", "supportive", "fair", "consistent", "decisive", "backs", "trust", "helpful", "good", "genuine", "effective"];
    const NEGATIVE_WORDS = ["unclear", "lacking", "could improve", "struggle", "concern", "behind", "slow", "inconsistent", "unfair", "poor", "delay", "gap", "harder", "worse"];
    let positive = 0, neutral = 0, negative = 0;
    for (const text of clean) {
      const lower = text.toLowerCase();
      const posHits = POSITIVE_WORDS.filter(w => lower.includes(w)).length;
      const negHits = NEGATIVE_WORDS.filter(w => lower.includes(w)).length;
      if (posHits > negHits) positive++;
      else if (negHits > posHits) negative++;
      else neutral++;
    }
    const total = clean.length;
    // A plain "positive >= negative → leans positive" rule is genuinely too coarse — e.g. 1 positive
    // out of 2 responses is a 50/50 split, not a "lean." This buckets on the actual share of
    // favourable-vs-unfavourable responses (ignoring neutral, which by definition doesn't lean either
    // way) and is explicit about small samples, where a single response can swing the whole picture.
    // Genuinely nuanced sentiment (sarcasm, negation, mixed sentiment within one sentence) is exactly
    // the kind of judgement call a real LLM would do better than keyword-matching — this stays behind
    // the AiProvider seam specifically so a live model can be dropped in later without touching any
    // caller.
    const leaning = positive + negative;
    let summary: string;
    if (leaning === 0) {
      summary = `No clear lean — ${total} response${total === 1 ? "" : "s"}, none read strongly positive or negative.`;
    } else {
      const positiveShare = positive / leaning;
      const sampleCaveat = total < 5 ? ` (small sample — ${total} response${total === 1 ? "" : "s"})` : "";
      if (positiveShare >= 0.7) summary = `Predominantly positive — ${positive} of ${total} responses read favourably${sampleCaveat}.`;
      else if (positiveShare >= 0.55) summary = `Leans positive, with notable dissent — ${positive} of ${total} favourable, ${negative} flag a concern${sampleCaveat}.`;
      else if (positiveShare > 0.45) summary = `Mixed views — roughly split between ${positive} favourable and ${negative} concerned out of ${total}${sampleCaveat}.`;
      else if (positiveShare > 0.3) summary = `Leans negative, with some positives — ${negative} of ${total} flag a concern, ${positive} favourable${sampleCaveat}.`;
      else summary = `Predominantly negative — ${negative} of ${total} responses flag a concern${sampleCaveat}.`;
    }
    return { positive, neutral, negative, summary };
  },
};

// ── Swap this one line when the real integration lands ──
const ACTIVE_PROVIDER: AiProvider = ruleBasedProvider;

export function getAiProvider(): AiProvider {
  return ACTIVE_PROVIDER;
}
