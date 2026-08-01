// Work Buddy AI's reply logic — shared by the floating global assistant (AIAssistant.tsx) and the
// inline "Ask Work Buddy AI" box inside a 1:1 check-in (CheckInSection.tsx), so the same question gets
// the same answer regardless of where it's asked. No live LLM call — same deterministic, ordered
// keyword-rule pattern as every other "AI" feature in this app (see AI_REC_RULES in
// MyGoalsSection.tsx, the challenge classifier in insights.ts, generatePrepTalkingPoints in
// checkIns.ts). Once this app is wired to the company's actual LLM/chatbot system, this file is the
// single seam to swap: everything that calls mockWorkBuddyAiReply() would call the real service instead
// without any UI changes.
export function mockWorkBuddyAiReply(q: string, context?: { checkInMemberName?: string }): string {
  const t = q.toLowerCase();
  if (context?.checkInMemberName) {
    const name = context.checkInMemberName.split(" ")[0];
    if (t.includes("talking point") || t.includes("pointer") || t.includes("draft") || t.includes("agenda")) {
      return `A few pointers for your check-in with ${name}, beyond what's already in the prep brief: ask an open question first ("how's it going for you this month?") before getting into KR specifics — it surfaces context the data alone won't show. If a KR is red/amber, ask what support would actually help rather than just what's blocking it. Close by agreeing on 1-2 action items together, not assigning them.`;
    }
    if (t.includes("difficult") || t.includes("underperform") || t.includes("hard conversation") || t.includes("push back") || t.includes("pushback")) {
      return `For a harder conversation with ${name}: lead with the specific, observable gap (not a general impression), ask for their read on it before sharing yours, and separate "what happened" from "what we do next." Agree on one concrete, measurable change and a date to revisit it — vague resolutions rarely stick.`;
    }
    if (t.includes("feedback")) {
      return `When giving ${name} feedback: be specific about the situation and impact, keep the ratio of recognition to constructive feedback roughly even over the quarter (not just when something's wrong), and check they understood by asking them to reflect it back in their own words.`;
    }
    if (t.includes("career") || t.includes("growth") || t.includes("promotion")) {
      return `For a career conversation with ${name}: ask what "success" looks like to them in 12-18 months before offering your own view, then connect it to a specific stretch opportunity or skill gap you can both act on now — a vague "keep doing great work" doesn't give them anything to work toward.`;
    }
  }
  if (t.includes("marcus")) return "Marcus is currently RED on senior engineering hires (2 of 8) and time-to-hire (38 days vs 30 target). His diversity slate work is healthy. Suggested next step: a 30-min coaching session focused on pipeline triage and re-prioritising the 3 most critical roles. I can draft talking points.";
  if (t.includes("james") || t.includes("coaching plan")) return "Here's a 4-week coaching plan for James:\n\n• Week 1 — Shadow your Q3 manager training, identify 2 facilitation patterns to adopt.\n• Week 2 — Co-lead one module; structured debrief with you.\n• Week 3 — Solo cohort delivery; you observe.\n• Week 4 — Reflective journal + 360 feedback from 3 participants.\n\nWant me to schedule the touchpoints?";
  if (t.includes("parental")) return "Our 2026 parental leave policy: 20 weeks fully paid for primary caregivers, 8 weeks for secondary caregivers (regardless of gender or family structure). Can be taken in up to 3 blocks within the first 18 months. Full policy PDF lives in the Human Capital knowledge base — want me to share the link?";
  if (t.includes("survey") || t.includes("benchmark")) return "You're tracking above benchmark on 5 of 6 competencies. Mentoring & Coaching is the one gap (68 vs 81). I've curated a 4-item action plan on your Survey Insights page — completing it before Dec 31 unlocks +100 bonus pts.";
  return "Great question. Based on your team's current data and our Human Capital policies, here are three things I'd suggest: (1) prioritise a 1:1 with Marcus this week on hiring pipeline, (2) wrap up your Mentoring action plan before Q3 close, and (3) consider linking James's coaching cert to your team's L&D budget request. Want me to expand on any of these?";
}
