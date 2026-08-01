import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  loadAllData,
  resolveRemark,
  addPendingSkill,
  redeemReward,
  toggleActionPlanItem,
  logCompliment,
  updateDepartmentGoals,
  endorseTeamMemberSkill,
  rejectPendingSkill,
  getRedeemedRewards,
  disableStaffAccount,
  enableStaffAccount,
  getStaffPointsLog,
  getOrgNetPoints,
  loginUser,
  setNewPassword,
  getAuthStatus,
  applyPasswordResetPenalty,
  getUserProfile,
} from "../csvData.server";
import { scrapePhillipJobs } from "../phillipCareers.server";

export const getAppData = createServerFn({ method: "GET" }).handler(async () => {
  return loadAllData();
});

export const resolveRemarkFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ remarkId: z.string() }))
  .handler(async ({ data }) => {
    resolveRemark(data.remarkId);
  });

export const addPendingSkillFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), skill: z.string() }))
  .handler(async ({ data }) => {
    addPendingSkill(data.userId, data.skill);
  });

export const redeemRewardFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), cost: z.number(), name: z.string() }))
  .handler(async ({ data }) => {
    redeemReward(data.userId, data.cost, data.name);
  });

export const toggleActionPlanFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), done: z.boolean() }))
  .handler(async ({ data }) => {
    toggleActionPlanItem(data.id, data.done);
  });

export const logComplimentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ senderId: z.string(), recipient: z.string() }))
  .handler(async ({ data }) => {
    logCompliment(data.senderId, data.recipient);
  });

export const endorseTeamMemberSkillFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ memberId: z.string(), skill: z.string() }))
  .handler(async ({ data }) => {
    endorseTeamMemberSkill(data.memberId, data.skill);
  });

export const rejectPendingSkillFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ memberId: z.string(), skill: z.string() }))
  .handler(async ({ data }) => {
    rejectPendingSkill(data.memberId, data.skill);
  });

export const fetchPhillipJobsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    keyword: z.string(),
    userGrade: z.number(),
    userSkills: z.array(z.string()),
    userDesignation: z.string().optional(),
    scoreEnabled: z.boolean().optional(),
    devGoalKeywords: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }) => {
    return scrapePhillipJobs(
      data.keyword,
      data.userGrade,
      data.userSkills,
      data.userDesignation ?? "",
      data.scoreEnabled !== false, // default true; explore mode passes false
      data.devGoalKeywords ?? [],
    );
  });

export const getRedeemedRewardsFn = createServerFn({ method: "GET" }).handler(async () => {
  return getRedeemedRewards();
});

export const disableStaffFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => { disableStaffAccount(data.userId); });

export const enableStaffFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => { enableStaffAccount(data.userId); });

export const getStaffPointsLogFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => getStaffPointsLog(data.userId));

export const getOrgNetPointsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ yearMonth: z.string().optional() }))
  .handler(async ({ data }) => getOrgNetPoints(data.yearMonth));

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string(), password: z.string() }))
  .handler(async ({ data }) => loginUser(data.email, data.password));

export const setNewPasswordFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), currentPassword: z.string(), newPassword: z.string() }))
  .handler(async ({ data }) => setNewPassword(data.userId, data.currentPassword, data.newPassword));

export const getAuthStatusFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => getAuthStatus(data.userId));

export const applyPasswordResetPenaltyFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => applyPasswordResetPenalty(data.userId));

export const getUserProfileFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => getUserProfile(data.userId));

export const updateDepartmentGoalsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    goals: z.array(z.object({
      id: z.string(),
      title: z.string(),
      owner: z.string(),
      progress: z.number(),
      weightage: z.number(),
      dueDate: z.string().optional(),
      ragQ1: z.string().optional(),
      ragQ2: z.string().optional(),
      ragQ3: z.string().optional(),
      ragQ4: z.string().optional(),
    })),
  }))
  .handler(async ({ data }) => {
    updateDepartmentGoals(data.goals);
  });
