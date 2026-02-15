import {
  transformStarTransaction,
  transformRedemption,
  transformCreditTransaction,
  sortActivitiesByDate,
  formatActivityDate,
  formatDateShort,
  getActivityDescription,
  getStatusBadge,
  getTypeBadge,
  getDailyTotal,
  groupActivitiesByDate,
  calculateActivityStats,
} from "@/lib/activity-utils";
import type {
  UnifiedActivityItem,
  StarTransaction,
  RawRedemption,
  RawCreditTransaction,
} from "@/types/activity";

// ---- Fixtures ----

const mockStarTransaction: StarTransaction = {
  id: "st-1",
  family_id: "fam-1",
  child_id: "child-1",
  quest_id: "quest-1",
  custom_description: null,
  stars: 5,
  source: "parent_record",
  status: "approved",
  child_note: "I did it!",
  parent_response: "Good job!",
  created_by: "parent-1",
  reviewed_by: "parent-1",
  created_at: "2025-06-15T10:00:00Z",
  reviewed_at: "2025-06-15T10:05:00Z",
  quests: {
    name_en: "Brush teeth",
    name_zh: "刷牙",
    icon: "🪥",
    category: "hygiene",
  },
  children: {
    name: "Alice",
    avatar_url: "https://example.com/alice.png",
  },
};

const mockRedemption: RawRedemption = {
  id: "red-1",
  family_id: "fam-1",
  child_id: "child-1",
  reward_id: "reward-1",
  stars_spent: 50,
  status: "approved",
  child_note: "I want this!",
  parent_response: "Here you go!",
  uses_credit: false,
  credit_amount: 0,
  created_at: "2025-06-15T11:00:00Z",
  reviewed_at: "2025-06-15T11:05:00Z",
  fulfilled_at: null,
  rewards: {
    name_en: "Ice Cream",
    name_zh: "冰淇淋",
    icon: "🍦",
  },
  children: {
    name: "Alice",
    avatar_url: "https://example.com/alice.png",
  },
};

const mockCreditTransaction: RawCreditTransaction = {
  id: "ct-1",
  family_id: "fam-1",
  child_id: "child-1",
  redemption_id: "red-1",
  settlement_id: null,
  transaction_type: "credit_used",
  amount: 10,
  balance_after: 10,
  created_at: "2025-06-15T12:00:00Z",
  children: {
    name: "Alice",
    avatar_url: "https://example.com/alice.png",
  },
};

function makeActivity(overrides: Partial<UnifiedActivityItem> = {}): UnifiedActivityItem {
  return {
    id: "act-1",
    type: "star_transaction",
    childId: "child-1",
    childName: "Alice",
    childAvatar: null,
    stars: 5,
    description: "Brush teeth",
    descriptionZh: "刷牙",
    icon: "🪥",
    status: "approved",
    childNote: null,
    parentResponse: null,
    source: null,
    createdAt: "2025-06-15T10:00:00Z",
    questId: null,
    quests: null,
    ...overrides,
  };
}

// ---- Tests ----

describe("activity-utils", () => {
  describe("transformStarTransaction", () => {
    it("transforms a star transaction to unified format", () => {
      const result = transformStarTransaction(mockStarTransaction);
      expect(result.id).toBe("st-1");
      expect(result.type).toBe("star_transaction");
      expect(result.childId).toBe("child-1");
      expect(result.childName).toBe("Alice");
      expect(result.childAvatar).toBe("https://example.com/alice.png");
      expect(result.stars).toBe(5);
      expect(result.description).toBe("Brush teeth");
      expect(result.descriptionZh).toBe("刷牙");
      expect(result.icon).toBe("🪥");
      expect(result.status).toBe("approved");
      expect(result.childNote).toBe("I did it!");
      expect(result.parentResponse).toBe("Good job!");
      expect(result.source).toBe("parent_record");
      expect(result.createdAt).toBe("2025-06-15T10:00:00Z");
      expect(result.originalData).toBe(mockStarTransaction);
      expect(result.questId).toBe("quest-1");
    });

    it("uses quest icon when available", () => {
      const result = transformStarTransaction(mockStarTransaction);
      expect(result.icon).toBe("🪥");
    });

    it("defaults icon to ⭐ for positive stars when no quest icon", () => {
      const tx = { ...mockStarTransaction, quests: null, stars: 3 };
      const result = transformStarTransaction(tx);
      expect(result.icon).toBe("⭐");
    });

    it("defaults icon to ⚠️ for negative stars when no quest icon", () => {
      const tx = { ...mockStarTransaction, quests: null, stars: -3 };
      const result = transformStarTransaction(tx);
      expect(result.icon).toBe("⚠️");
    });

    it("uses quest icon even when quest icon is empty-ish but defined", () => {
      const tx = {
        ...mockStarTransaction,
        quests: { name_en: "Test", name_zh: null, icon: null, category: null },
      };
      const result = transformStarTransaction(tx);
      // icon is null, falls through to stars-based default
      expect(result.icon).toBe("⭐");
    });

    it("uses custom_description when available", () => {
      const tx = { ...mockStarTransaction, custom_description: "Custom task" };
      const result = transformStarTransaction(tx);
      expect(result.description).toBe("Custom task");
    });

    it("falls back to quest name_en when no custom_description", () => {
      const result = transformStarTransaction(mockStarTransaction);
      expect(result.description).toBe("Brush teeth");
    });

    it("falls back to 'Unknown quest' when no quest and no custom_description", () => {
      const tx = { ...mockStarTransaction, custom_description: null, quests: null };
      const result = transformStarTransaction(tx);
      expect(result.description).toBe("Unknown quest");
    });

    it("excludes child info when includeChildInfo is false", () => {
      const result = transformStarTransaction(mockStarTransaction, false);
      expect(result.childName).toBe("");
      expect(result.childAvatar).toBeNull();
    });

    it("includes child info by default", () => {
      const result = transformStarTransaction(mockStarTransaction);
      expect(result.childName).toBe("Alice");
      expect(result.childAvatar).toBe("https://example.com/alice.png");
    });

    it("handles missing children relation", () => {
      const tx = { ...mockStarTransaction, children: undefined };
      const result = transformStarTransaction(tx);
      expect(result.childName).toBe("Unknown");
      expect(result.childAvatar).toBeNull();
    });

    it("handles null child_note and parent_response", () => {
      const tx = { ...mockStarTransaction, child_note: null, parent_response: null };
      const result = transformStarTransaction(tx);
      expect(result.childNote).toBeNull();
      expect(result.parentResponse).toBeNull();
    });

    it("handles null source", () => {
      const tx = { ...mockStarTransaction, source: null as any };
      const result = transformStarTransaction(tx);
      expect(result.source).toBeNull();
    });

    it("handles null quest_id", () => {
      const tx = { ...mockStarTransaction, quest_id: null };
      const result = transformStarTransaction(tx);
      expect(result.questId).toBeNull();
    });

    it("passes quests relation through", () => {
      const result = transformStarTransaction(mockStarTransaction);
      expect(result.quests).toEqual(mockStarTransaction.quests);
    });

    it("handles null quests relation", () => {
      const tx = { ...mockStarTransaction, quests: null };
      const result = transformStarTransaction(tx);
      expect(result.quests).toBeNull();
      expect(result.descriptionZh).toBeNull();
    });
  });

  describe("transformRedemption", () => {
    it("transforms a redemption to unified format", () => {
      const result = transformRedemption(mockRedemption);
      expect(result.id).toBe("red-1");
      expect(result.type).toBe("redemption");
      expect(result.childId).toBe("child-1");
      expect(result.childName).toBe("Alice");
      expect(result.stars).toBe(-50); // negative
      expect(result.description).toBe("Ice Cream");
      expect(result.descriptionZh).toBe("冰淇淋");
      expect(result.icon).toBe("🍦");
      expect(result.status).toBe("approved");
      expect(result.source).toBeNull();
      expect(result.questId).toBeNull();
      expect(result.quests).toBeNull();
    });

    it("makes stars negative (spending)", () => {
      const result = transformRedemption(mockRedemption);
      expect(result.stars).toBe(-50);
    });

    it("defaults icon to 🎁 when no reward icon", () => {
      const redemption = {
        ...mockRedemption,
        rewards: { name_en: "Prize", name_zh: null, icon: null },
      };
      const result = transformRedemption(redemption);
      expect(result.icon).toBe("🎁");
    });

    it("falls back to 'Unknown reward' when no rewards relation", () => {
      const redemption = { ...mockRedemption, rewards: undefined };
      const result = transformRedemption(redemption);
      expect(result.description).toBe("Unknown reward");
    });

    it("excludes child info when includeChildInfo is false", () => {
      const result = transformRedemption(mockRedemption, false);
      expect(result.childName).toBe("");
      expect(result.childAvatar).toBeNull();
    });

    it("handles missing children relation", () => {
      const redemption = { ...mockRedemption, children: undefined };
      const result = transformRedemption(redemption);
      expect(result.childName).toBe("Unknown");
      expect(result.childAvatar).toBeNull();
    });

    it("handles null child_note and parent_response", () => {
      const redemption = {
        ...mockRedemption,
        child_note: null,
        parent_response: null,
      };
      const result = transformRedemption(redemption);
      expect(result.childNote).toBeNull();
      expect(result.parentResponse).toBeNull();
    });
  });

  describe("transformCreditTransaction", () => {
    it("transforms credit_used transaction", () => {
      const result = transformCreditTransaction(mockCreditTransaction);
      expect(result.id).toBe("ct-1");
      expect(result.type).toBe("credit_transaction");
      expect(result.description).toBe("Credit borrowed");
      expect(result.descriptionZh).toBe("借用信用");
      expect(result.icon).toBe("💳");
      expect(result.stars).toBe(-10); // negative for borrowing
      expect(result.status).toBe("approved");
    });

    it("transforms credit_repaid transaction", () => {
      const ct = { ...mockCreditTransaction, transaction_type: "credit_repaid" as const, amount: 10 };
      const result = transformCreditTransaction(ct);
      expect(result.description).toBe("Credit repaid");
      expect(result.descriptionZh).toBe("信用偿还");
      expect(result.icon).toBe("💰");
      expect(result.stars).toBe(10); // positive
    });

    it("transforms interest_charged transaction", () => {
      const ct = { ...mockCreditTransaction, transaction_type: "interest_charged" as const, amount: 2 };
      const result = transformCreditTransaction(ct);
      expect(result.description).toBe("Interest charged");
      expect(result.descriptionZh).toBe("利息扣除");
      expect(result.icon).toBe("📈");
      expect(result.stars).toBe(-2); // negative
    });

    it("excludes child info when includeChildInfo is false", () => {
      const result = transformCreditTransaction(mockCreditTransaction, false);
      expect(result.childName).toBe("");
      expect(result.childAvatar).toBeNull();
    });

    it("handles missing children relation", () => {
      const ct = { ...mockCreditTransaction, children: undefined };
      const result = transformCreditTransaction(ct);
      expect(result.childName).toBe("Unknown");
      expect(result.childAvatar).toBeNull();
    });

    it("always has approved status", () => {
      const result = transformCreditTransaction(mockCreditTransaction);
      expect(result.status).toBe("approved");
    });

    it("has null childNote and parentResponse", () => {
      const result = transformCreditTransaction(mockCreditTransaction);
      expect(result.childNote).toBeNull();
      expect(result.parentResponse).toBeNull();
    });

    it("has null source, questId, quests", () => {
      const result = transformCreditTransaction(mockCreditTransaction);
      expect(result.source).toBeNull();
      expect(result.questId).toBeNull();
      expect(result.quests).toBeNull();
    });
  });

  describe("sortActivitiesByDate", () => {
    it("sorts activities in descending order by date", () => {
      const activities = [
        makeActivity({ id: "1", createdAt: "2025-06-10T10:00:00Z" }),
        makeActivity({ id: "2", createdAt: "2025-06-15T10:00:00Z" }),
        makeActivity({ id: "3", createdAt: "2025-06-12T10:00:00Z" }),
      ];
      const sorted = sortActivitiesByDate(activities);
      expect(sorted.map((a) => a.id)).toEqual(["2", "3", "1"]);
    });

    it("does not mutate the original array", () => {
      const activities = [
        makeActivity({ id: "1", createdAt: "2025-06-10T10:00:00Z" }),
        makeActivity({ id: "2", createdAt: "2025-06-15T10:00:00Z" }),
      ];
      const original = [...activities];
      sortActivitiesByDate(activities);
      expect(activities.map((a) => a.id)).toEqual(original.map((a) => a.id));
    });

    it("handles empty array", () => {
      expect(sortActivitiesByDate([])).toEqual([]);
    });

    it("handles single item", () => {
      const activities = [makeActivity({ id: "1" })];
      const sorted = sortActivitiesByDate(activities);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe("1");
    });
  });

  describe("formatActivityDate", () => {
    it("formats date for English locale", () => {
      const result = formatActivityDate("2025-06-15T14:30:00Z", "en");
      expect(result).toBeTruthy();
      expect(result).toContain("2025");
    });

    it("formats date for zh-CN locale", () => {
      const result = formatActivityDate("2025-06-15T14:30:00Z", "zh-CN");
      expect(result).toBeTruthy();
      expect(result).toContain("2025");
    });
  });

  describe("formatDateShort", () => {
    it("formats date short for English locale", () => {
      const result = formatDateShort("2025-06-15", "en");
      expect(result).toBeTruthy();
    });

    it("formats date short for zh-CN locale", () => {
      const result = formatDateShort("2025-06-15", "zh-CN");
      expect(result).toBeTruthy();
    });
  });

  describe("getActivityDescription", () => {
    it("returns English description for 'en' locale", () => {
      const activity = makeActivity({ description: "Brush teeth", descriptionZh: "刷牙" });
      expect(getActivityDescription(activity, "en")).toBe("Brush teeth");
    });

    it("returns Chinese description for 'zh-CN' locale", () => {
      const activity = makeActivity({ description: "Brush teeth", descriptionZh: "刷牙" });
      expect(getActivityDescription(activity, "zh-CN")).toBe("刷牙");
    });

    it("falls back to English when descriptionZh is null", () => {
      const activity = makeActivity({ description: "Brush teeth", descriptionZh: null });
      expect(getActivityDescription(activity, "zh-CN")).toBe("Brush teeth");
    });

    it("falls back to English when descriptionZh is empty", () => {
      const activity = makeActivity({ description: "Brush teeth", descriptionZh: "" });
      // empty string is falsy, so falls back
      expect(getActivityDescription(activity, "zh-CN")).toBe("Brush teeth");
    });
  });

  describe("getStatusBadge", () => {
    it("returns approved badge", () => {
      const badge = getStatusBadge("approved", "en");
      expect(badge.label).toBe("Approved");
      expect(badge.className).toContain("bg-success");
    });

    it("returns approved badge in Chinese", () => {
      const badge = getStatusBadge("approved", "zh-CN");
      expect(badge.label).toBe("已批准");
    });

    it("returns fulfilled badge", () => {
      const badge = getStatusBadge("fulfilled", "en");
      expect(badge.label).toBe("Fulfilled");
      expect(badge.className).toContain("bg-blue-500/15");
    });

    it("returns fulfilled badge in Chinese", () => {
      const badge = getStatusBadge("fulfilled", "zh-CN");
      expect(badge.label).toBe("已完成");
    });

    it("returns pending badge", () => {
      const badge = getStatusBadge("pending", "en");
      expect(badge.label).toBe("Pending");
      expect(badge.className).toContain("bg-warning");
    });

    it("returns pending badge in Chinese", () => {
      const badge = getStatusBadge("pending", "zh-CN");
      expect(badge.label).toBe("待审批");
    });

    it("returns rejected badge", () => {
      const badge = getStatusBadge("rejected", "en");
      expect(badge.label).toBe("Rejected");
      expect(badge.className).toContain("bg-danger");
    });

    it("returns rejected badge in Chinese", () => {
      const badge = getStatusBadge("rejected", "zh-CN");
      expect(badge.label).toBe("已拒绝");
    });

    it("returns default badge for unknown status", () => {
      const badge = getStatusBadge("unknown_status", "en");
      expect(badge.label).toBe("unknown_status");
      expect(badge.className).toContain("bg-white/10");
    });
  });

  describe("getTypeBadge", () => {
    it("returns star_transaction badge", () => {
      const badge = getTypeBadge("star_transaction", "en");
      expect(badge.label).toBe("Stars");
      expect(badge.icon).toBe("⭐");
      expect(badge.className).toContain("bg-yellow-500/15");
    });

    it("returns star_transaction badge in Chinese", () => {
      const badge = getTypeBadge("star_transaction", "zh-CN");
      expect(badge.label).toBe("星星");
    });

    it("returns redemption badge", () => {
      const badge = getTypeBadge("redemption", "en");
      expect(badge.label).toBe("Redeem");
      expect(badge.icon).toBe("🎁");
      expect(badge.className).toContain("bg-purple-500/15");
    });

    it("returns redemption badge in Chinese", () => {
      const badge = getTypeBadge("redemption", "zh-CN");
      expect(badge.label).toBe("兑换");
    });

    it("returns credit_transaction badge", () => {
      const badge = getTypeBadge("credit_transaction", "en");
      expect(badge.label).toBe("Credit");
      expect(badge.icon).toBe("💳");
      expect(badge.className).toContain("bg-blue-500/15");
    });

    it("returns credit_transaction badge in Chinese", () => {
      const badge = getTypeBadge("credit_transaction", "zh-CN");
      expect(badge.label).toBe("信用");
    });

    it("returns default badge for unknown type", () => {
      const badge = getTypeBadge("unknown_type", "en");
      expect(badge.label).toBe("unknown_type");
      expect(badge.icon).toBe("📝");
      expect(badge.className).toContain("bg-white/10");
    });
  });

  describe("getDailyTotal", () => {
    it("sums stars of approved activities", () => {
      const activities = [
        makeActivity({ stars: 5, status: "approved" }),
        makeActivity({ stars: 3, status: "approved" }),
        makeActivity({ stars: -2, status: "approved" }),
      ];
      expect(getDailyTotal(activities)).toBe(6);
    });

    it("includes fulfilled activities", () => {
      const activities = [
        makeActivity({ stars: 5, status: "fulfilled" }),
        makeActivity({ stars: 3, status: "approved" }),
      ];
      expect(getDailyTotal(activities)).toBe(8);
    });

    it("excludes pending activities", () => {
      const activities = [
        makeActivity({ stars: 5, status: "approved" }),
        makeActivity({ stars: 10, status: "pending" }),
      ];
      expect(getDailyTotal(activities)).toBe(5);
    });

    it("excludes rejected activities", () => {
      const activities = [
        makeActivity({ stars: 5, status: "approved" }),
        makeActivity({ stars: 10, status: "rejected" }),
      ];
      expect(getDailyTotal(activities)).toBe(5);
    });

    it("returns 0 for empty array", () => {
      expect(getDailyTotal([])).toBe(0);
    });

    it("handles all-pending activities", () => {
      const activities = [
        makeActivity({ stars: 5, status: "pending" }),
        makeActivity({ stars: 3, status: "pending" }),
      ];
      expect(getDailyTotal(activities)).toBe(0);
    });
  });

  describe("groupActivitiesByDate", () => {
    it("groups activities by date", () => {
      const activities = [
        makeActivity({ id: "1", createdAt: "2025-06-15T10:00:00Z" }),
        makeActivity({ id: "2", createdAt: "2025-06-15T14:00:00Z" }),
        makeActivity({ id: "3", createdAt: "2025-06-14T10:00:00Z" }),
      ];
      const groups = groupActivitiesByDate(activities);
      expect(groups.length).toBe(2);
    });

    it("sorts groups in descending date order", () => {
      const activities = [
        makeActivity({ id: "1", createdAt: "2025-06-10T10:00:00Z" }),
        makeActivity({ id: "2", createdAt: "2025-06-15T10:00:00Z" }),
        makeActivity({ id: "3", createdAt: "2025-06-12T10:00:00Z" }),
      ];
      const groups = groupActivitiesByDate(activities);
      // Groups should be sorted newest first
      const dates = groups.map(([date]) => date);
      expect(dates).toEqual([...dates].sort().reverse());
    });

    it("handles empty array", () => {
      const groups = groupActivitiesByDate([]);
      expect(groups).toEqual([]);
    });

    it("handles single activity", () => {
      const activities = [makeActivity({ id: "1", createdAt: "2025-06-15T10:00:00Z" })];
      const groups = groupActivitiesByDate(activities);
      expect(groups.length).toBe(1);
      expect(groups[0][1].length).toBe(1);
    });
  });

  describe("calculateActivityStats", () => {
    it("calculates stats correctly", () => {
      const activities = [
        makeActivity({ id: "1", stars: 5, status: "approved" }),
        makeActivity({ id: "2", stars: 3, status: "approved" }),
        makeActivity({ id: "3", stars: -2, status: "approved" }),
        makeActivity({ id: "4", stars: 10, status: "pending" }),
        makeActivity({ id: "5", stars: -5, status: "rejected" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.totalRecords).toBe(5);
      expect(stats.all).toBe(5);
      expect(stats.positiveRecords).toBe(2); // 5 and 3
      expect(stats.negativeRecords).toBe(1); // -2
      expect(stats.totalStarsGiven).toBe(8); // 5 + 3
      expect(stats.totalStarsDeducted).toBe(-2);
      expect(stats.starsRedeemed).toBe(0); // no redemptions
      expect(stats.netStars).toBe(6); // 8 + (-2)
      expect(stats.approved).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.rejected).toBe(1);
    });

    it("handles empty array", () => {
      const stats = calculateActivityStats([]);
      expect(stats.totalRecords).toBe(0);
      expect(stats.positiveRecords).toBe(0);
      expect(stats.negativeRecords).toBe(0);
      expect(stats.totalStarsGiven).toBe(0);
      expect(stats.totalStarsDeducted).toBe(0);
      expect(stats.starsRedeemed).toBe(0);
      expect(stats.netStars).toBe(0);
    });

    it("includes fulfilled in approved stats calculations", () => {
      const activities = [
        makeActivity({ id: "1", stars: 5, status: "fulfilled" }),
        makeActivity({ id: "2", stars: 3, status: "approved" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.positiveRecords).toBe(2);
      expect(stats.totalStarsGiven).toBe(8);
    });

    it("excludes pending/rejected from star calculations", () => {
      const activities = [
        makeActivity({ id: "1", stars: 100, status: "pending" }),
        makeActivity({ id: "2", stars: -50, status: "rejected" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.positiveRecords).toBe(0);
      expect(stats.negativeRecords).toBe(0);
      expect(stats.totalStarsGiven).toBe(0);
      expect(stats.totalStarsDeducted).toBe(0);
      expect(stats.netStars).toBe(0);
    });

    it("separates starsRedeemed from totalStarsDeducted", () => {
      const activities = [
        makeActivity({ id: "1", stars: 10, status: "approved" }),
        makeActivity({ id: "2", stars: -3, status: "approved", type: "star_transaction" }),
        makeActivity({ id: "3", stars: -50, status: "approved", type: "redemption" }),
        makeActivity({ id: "4", stars: -20, status: "fulfilled", type: "redemption" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.totalStarsGiven).toBe(10);
      expect(stats.totalStarsDeducted).toBe(-3); // only star_transaction deductions
      expect(stats.starsRedeemed).toBe(70); // |−50| + |−20| = 70
      expect(stats.netStars).toBe(10 + (-3) + (-50) + (-20)); // -63
    });

    it("excludes pending redemptions from starsRedeemed", () => {
      const activities = [
        makeActivity({ id: "1", stars: -50, status: "pending", type: "redemption" }),
        makeActivity({ id: "2", stars: -20, status: "approved", type: "redemption" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.starsRedeemed).toBe(20); // only approved
    });

    it("handles zero-star activities", () => {
      const activities = [
        makeActivity({ id: "1", stars: 0, status: "approved" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.positiveRecords).toBe(0);
      expect(stats.negativeRecords).toBe(0);
      expect(stats.totalStarsGiven).toBe(0);
      expect(stats.totalStarsDeducted).toBe(0);
      expect(stats.netStars).toBe(0);
    });
  });
});
