// A governance/audit trail of every automated ("AI") action taken in the app — what fired, for
// whom, and why. Grounded in Workday's Agent System of Record and DBS's own PURE framework
// (Purposeful, Unsurprising, Respectful, Explainable) for AI in a regulated financial institution:
// nothing here should act invisibly. Every nudge, prep-agent draft, AI-minutes generation, and
// calibration flag logs an entry here, visible to Admin.
export type AiActivityKind = "nudge" | "prep_agent" | "ai_minutes" | "calibration_flag";

export interface AiActivityLogEntry {
  id: string;
  date: string; // ISO "YYYY-MM-DD"
  kind: AiActivityKind;
  summary: string;
  targetName?: string; // who the action was about/for
  actorName?: string; // who saw/triggered it
}

export const AI_ACTIVITY_KIND_LABEL: Record<AiActivityKind, string> = {
  nudge: "Nudge",
  prep_agent: "Conversation Prep",
  ai_minutes: "AI Minutes",
  calibration_flag: "Calibration Flag",
};
