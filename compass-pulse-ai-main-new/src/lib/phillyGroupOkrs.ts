import type { KeyResult } from "./mockData";

// Group-level ("Philly Group") OKRs — the missing top layer above department Objectives, for the
// directors who oversee HODs across departments. Per Google's own OKR practice (3-5 objectives per
// level per cycle) and fintech cascading-OKR guidance (each level gets MORE SPECIFIC, not a mirror of
// the level above, and every Key Result has exactly one named owner — 26% higher completion than
// shared ownership) — owners here are deliberately a mix of HODs and individual contributors, since
// group-level execution doesn't have to run through department heads. A department's own DeptGoal can
// optionally link to one of these Key Results (DeptGoal.linkedPhillyGoalId/linkedPhillyKrId) to show
// how its work ladders up — some Key Results below are deliberately left unlinked, since "possible to
// link" doesn't mean "everything must be linked on day one."
export interface PhillyGroupGoal {
  id: string;
  title: string;
  description: string;
  owner: string; // the director sponsoring this group Objective
  keyResults: KeyResult[];
}

export const PHILLY_GROUP_OKR_YEAR = 2026;

export const phillyGroupGoals: PhillyGroupGoal[] = [
  {
    id: "pg1",
    title: "Grow Assets Under Management & Client Trust",
    description: "Group-wide growth in AUM and the brand/earned-media trust that supports it.",
    owner: "Elsa Ling",
    keyResults: [
      {
        id: "pg1kr1",
        title: "Grow branded digital and earned-media reach supporting AUM growth by 25%",
        owner: "Rave Tan", dueDate: "2026-12-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-19",
      },
      {
        id: "pg1kr2",
        title: "Launch 2 new AUM-growth client campaigns co-owned across Credit Risk and Marketing",
        owner: "Christabel Lin", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-20",
      },
    ],
  },
  {
    id: "pg2",
    title: "Strengthen Risk & Governance Culture",
    description: "Group-wide credit quality and AI-governance discipline, ahead of MAS expectations.",
    owner: "Ethan Lim",
    keyResults: [
      {
        id: "pg2kr1",
        title: "Cut group-wide non-performing loan ratio below 2.5%",
        owner: "Nadia Yong", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-20",
      },
      {
        id: "pg2kr2",
        title: "Achieve 100% AI-governance certification coverage for all group model owners",
        owner: "Bella Lim", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-17",
      },
    ],
  },
  {
    id: "pg3",
    title: "Build a Future-Ready, AI-Fluent Workforce",
    description: "Group-wide AI capability and succession depth, not just one department's training numbers.",
    owner: "Elsa Ling",
    keyResults: [
      {
        id: "pg3kr1",
        title: "Certify 65% of Grade 3+ staff group-wide on AI-in-Financial-Services foundational training",
        owner: "Caleb Ong", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-20",
      },
      {
        id: "pg3kr2",
        title: "Build a succession-ready bench for 100% of Grade 5+ single-point-of-failure roles group-wide",
        owner: "Bryan Goh", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-17",
      },
    ],
  },
  {
    id: "pg4",
    title: "Elevate Employee Experience & One-Phillip Culture",
    description: "A connected, recognised workforce across every network office — not just HCWM's own.",
    owner: "Ethan Lim",
    keyResults: [
      {
        id: "pg4kr1",
        title: "Achieve a top-quartile employee-connectedness pulse score group-wide",
        owner: "Marcus Teo", dueDate: "2026-12-31", ragConfidence: "green", ragConfidenceUpdatedDate: "2026-07-24",
      },
      {
        id: "pg4kr2",
        title: "Launch a cross-department recognition programme reaching 3 network offices",
        owner: "Diana Eng", dueDate: "2026-12-31", ragConfidence: "amber", ragConfidenceUpdatedDate: "2026-07-18",
      },
    ],
  },
];

export function findPhillyGoal(id: string | undefined): PhillyGroupGoal | undefined {
  return phillyGroupGoals.find(g => g.id === id);
}

export function findPhillyKr(goalId: string | undefined, krId: string | undefined): KeyResult | undefined {
  return findPhillyGoal(goalId)?.keyResults.find(k => k.id === krId);
}
