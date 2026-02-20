import posthog from "posthog-js";
import {
  ANALYTICS_EVENTS,
  trackLogin,
  trackLoginFailed,
  trackRegistration,
  trackQuestStarRequested,
  trackStarRecordedByParent,
  trackRewardRedemption,
  trackApproval,
  trackReportGenerated,
} from "@/lib/analytics/events";

describe("analytics/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ANALYTICS_EVENTS constants", () => {
    it("has all expected event names", () => {
      expect(ANALYTICS_EVENTS.LOGIN_SUCCESS).toBe("login_success");
      expect(ANALYTICS_EVENTS.LOGIN_FAILED).toBe("login_failed");
      expect(ANALYTICS_EVENTS.REGISTRATION_COMPLETED).toBe("registration_completed");
      expect(ANALYTICS_EVENTS.QUEST_STAR_REQUESTED).toBe("quest_star_requested");
      expect(ANALYTICS_EVENTS.STAR_RECORDED_BY_PARENT).toBe("star_recorded_by_parent");
      expect(ANALYTICS_EVENTS.REWARD_REDEMPTION_REQUESTED).toBe("reward_redemption_requested");
      expect(ANALYTICS_EVENTS.STAR_REQUEST_APPROVED).toBe("star_request_approved");
      expect(ANALYTICS_EVENTS.STAR_REQUEST_REJECTED).toBe("star_request_rejected");
      expect(ANALYTICS_EVENTS.REDEMPTION_APPROVED).toBe("redemption_approved");
      expect(ANALYTICS_EVENTS.REDEMPTION_REJECTED).toBe("redemption_rejected");
      expect(ANALYTICS_EVENTS.REPORT_GENERATED).toBe("report_generated");
    });
  });

  describe("trackLogin", () => {
    it("captures login_success with role and locale", () => {
      trackLogin("parent", "en");
      expect(posthog.capture).toHaveBeenCalledWith("login_success", {
        role: "parent",
        locale: "en",
      });
    });
  });

  describe("trackLoginFailed", () => {
    it("captures login_failed with error type", () => {
      trackLoginFailed("email_not_confirmed");
      expect(posthog.capture).toHaveBeenCalledWith("login_failed", {
        error_type: "email_not_confirmed",
      });
    });
  });

  describe("trackRegistration", () => {
    it("captures registration_completed with locale and invite flag", () => {
      trackRegistration("zh-CN", true);
      expect(posthog.capture).toHaveBeenCalledWith("registration_completed", {
        locale: "zh-CN",
        is_invite: true,
      });
    });

    it("captures non-invite registration", () => {
      trackRegistration("en", false);
      expect(posthog.capture).toHaveBeenCalledWith("registration_completed", {
        locale: "en",
        is_invite: false,
      });
    });
  });

  describe("trackQuestStarRequested", () => {
    it("captures quest_star_requested with all properties", () => {
      trackQuestStarRequested({
        questId: "quest-123",
        questType: "bonus",
        questScope: "self",
        stars: 5,
      });
      expect(posthog.capture).toHaveBeenCalledWith("quest_star_requested", {
        quest_id: "quest-123",
        quest_type: "bonus",
        quest_scope: "self",
        stars: 5,
      });
    });

    it("handles missing questScope", () => {
      trackQuestStarRequested({
        questId: "quest-456",
        questType: "bonus",
        stars: 3,
      });
      expect(posthog.capture).toHaveBeenCalledWith("quest_star_requested", {
        quest_id: "quest-456",
        quest_type: "bonus",
        quest_scope: undefined,
        stars: 3,
      });
    });
  });

  describe("trackStarRecordedByParent", () => {
    it("captures star_recorded_by_parent with all properties", () => {
      trackStarRecordedByParent({
        childId: "child-123",
        questId: "quest-789",
        stars: 15,
        multiplier: 3,
      });
      expect(posthog.capture).toHaveBeenCalledWith("star_recorded_by_parent", {
        child_id: "child-123",
        quest_id: "quest-789",
        stars: 15,
        multiplier: 3,
      });
    });

    it("handles null questId (custom description)", () => {
      trackStarRecordedByParent({
        childId: "child-123",
        questId: null,
        stars: 5,
        multiplier: 1,
      });
      expect(posthog.capture).toHaveBeenCalledWith("star_recorded_by_parent", {
        child_id: "child-123",
        quest_id: null,
        stars: 5,
        multiplier: 1,
      });
    });
  });

  describe("trackRewardRedemption", () => {
    it("captures reward_redemption_requested", () => {
      trackRewardRedemption({
        rewardId: "reward-123",
        starsCost: 50,
        usesCredit: false,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "reward_redemption_requested",
        {
          reward_id: "reward-123",
          stars_cost: 50,
          uses_credit: false,
        }
      );
    });

    it("captures with credit usage", () => {
      trackRewardRedemption({
        rewardId: "reward-456",
        starsCost: 100,
        usesCredit: true,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "reward_redemption_requested",
        {
          reward_id: "reward-456",
          stars_cost: 100,
          uses_credit: true,
        }
      );
    });
  });

  describe("trackApproval", () => {
    it("captures single star approval", () => {
      trackApproval("star", "approved", 1);
      expect(posthog.capture).toHaveBeenCalledWith("star_request_approved");
    });

    it("captures single star rejection", () => {
      trackApproval("star", "rejected", 1);
      expect(posthog.capture).toHaveBeenCalledWith("star_request_rejected");
    });

    it("captures batch star approval with count", () => {
      trackApproval("star", "approved", 5);
      expect(posthog.capture).toHaveBeenCalledWith(
        "star_requests_batch_approved",
        { count: 5 }
      );
    });

    it("captures batch star rejection with count", () => {
      trackApproval("star", "rejected", 3);
      expect(posthog.capture).toHaveBeenCalledWith(
        "star_requests_batch_rejected",
        { count: 3 }
      );
    });

    it("captures single redemption approval", () => {
      trackApproval("redemption", "approved", 1);
      expect(posthog.capture).toHaveBeenCalledWith("redemption_approved");
    });

    it("captures single redemption rejection", () => {
      trackApproval("redemption", "rejected", 1);
      expect(posthog.capture).toHaveBeenCalledWith("redemption_rejected");
    });

    it("captures batch redemption approval with count", () => {
      trackApproval("redemption", "approved", 4);
      expect(posthog.capture).toHaveBeenCalledWith(
        "redemptions_batch_approved",
        { count: 4 }
      );
    });
  });

  describe("trackReportGenerated", () => {
    it("captures report_generated with period and locale", () => {
      trackReportGenerated("weekly", "en");
      expect(posthog.capture).toHaveBeenCalledWith("report_generated", {
        period_type: "weekly",
        locale: "en",
      });
    });
  });
});
