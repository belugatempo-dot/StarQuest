import posthog from "posthog-js";

// Event name constants — prevents typos and enables autocomplete
export const ANALYTICS_EVENTS = {
  // Auth
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  REGISTRATION_COMPLETED: "registration_completed",
  DEMO_LOGIN: "demo_login",

  // Quests & Stars
  QUEST_STAR_REQUESTED: "quest_star_requested",
  STAR_RECORDED_BY_PARENT: "star_recorded_by_parent",
  STAR_REQUEST_APPROVED: "star_request_approved",
  STAR_REQUEST_REJECTED: "star_request_rejected",
  STAR_REQUESTS_BATCH_APPROVED: "star_requests_batch_approved",
  STAR_REQUESTS_BATCH_REJECTED: "star_requests_batch_rejected",

  // Rewards & Redemptions
  REWARD_REDEMPTION_REQUESTED: "reward_redemption_requested",
  REDEMPTION_APPROVED: "redemption_approved",
  REDEMPTION_REJECTED: "redemption_rejected",
  REDEMPTIONS_BATCH_APPROVED: "redemptions_batch_approved",

  // Reports
  REPORT_GENERATED: "report_generated",
} as const;

// Typed capture helpers

export function trackDemoLogin(role: string, locale: string): void {
  posthog.capture(ANALYTICS_EVENTS.DEMO_LOGIN, { role, locale });
}

export function trackLogin(role: string, locale: string): void {
  posthog.capture(ANALYTICS_EVENTS.LOGIN_SUCCESS, { role, locale });
}

export function trackLoginFailed(errorType: string): void {
  posthog.capture(ANALYTICS_EVENTS.LOGIN_FAILED, { error_type: errorType });
}

export function trackRegistration(locale: string, isInvite: boolean): void {
  posthog.capture(ANALYTICS_EVENTS.REGISTRATION_COMPLETED, {
    locale,
    is_invite: isInvite,
  });
}

export function trackQuestStarRequested(props: {
  questId: string;
  questType: string;
  questScope?: string;
  stars: number;
}): void {
  posthog.capture(ANALYTICS_EVENTS.QUEST_STAR_REQUESTED, {
    quest_id: props.questId,
    quest_type: props.questType,
    quest_scope: props.questScope,
    stars: props.stars,
  });
}

export function trackStarRecordedByParent(props: {
  childId: string;
  questId?: string | null;
  stars: number;
  multiplier: number;
}): void {
  posthog.capture(ANALYTICS_EVENTS.STAR_RECORDED_BY_PARENT, {
    child_id: props.childId,
    quest_id: props.questId,
    stars: props.stars,
    multiplier: props.multiplier,
  });
}

export function trackRewardRedemption(props: {
  rewardId: string;
  starsCost: number;
  usesCredit: boolean;
}): void {
  posthog.capture(ANALYTICS_EVENTS.REWARD_REDEMPTION_REQUESTED, {
    reward_id: props.rewardId,
    stars_cost: props.starsCost,
    uses_credit: props.usesCredit,
  });
}

export function trackApproval(
  type: "star" | "redemption",
  action: "approved" | "rejected",
  count: number
): void {
  if (count > 1) {
    const event =
      type === "star"
        ? action === "approved"
          ? ANALYTICS_EVENTS.STAR_REQUESTS_BATCH_APPROVED
          : ANALYTICS_EVENTS.STAR_REQUESTS_BATCH_REJECTED
        : ANALYTICS_EVENTS.REDEMPTIONS_BATCH_APPROVED;
    posthog.capture(event, { count });
  } else {
    const event =
      type === "star"
        ? action === "approved"
          ? ANALYTICS_EVENTS.STAR_REQUEST_APPROVED
          : ANALYTICS_EVENTS.STAR_REQUEST_REJECTED
        : action === "approved"
          ? ANALYTICS_EVENTS.REDEMPTION_APPROVED
          : ANALYTICS_EVENTS.REDEMPTION_REJECTED;
    posthog.capture(event);
  }
}

export function trackReportGenerated(
  periodType: string,
  locale: string
): void {
  posthog.capture(ANALYTICS_EVENTS.REPORT_GENERATED, {
    period_type: periodType,
    locale,
  });
}
