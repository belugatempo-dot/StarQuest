import {
  getSettlementNoticeSubject,
  generateSettlementNoticeHtml,
  _settlementT as t,
} from "@/lib/email/templates/settlement-notice";
import type {
  SettlementNotificationData,
  ChildSettlementData,
  InterestTierBreakdown,
} from "@/types/reports";

describe("settlement-notice email template", () => {
  const baseBreakdown: InterestTierBreakdown = {
    tierOrder: 1,
    minDebt: 0,
    maxDebt: 20,
    debtInTier: 15,
    rate: 0.05,
    interestAmount: 0.75,
  };

  const baseChild: ChildSettlementData = {
    childId: "child-1",
    name: "Alice",
    debtAmount: 30,
    interestCharged: 5,
    interestBreakdown: [baseBreakdown],
    creditLimitBefore: 50,
    creditLimitAfter: 45,
    creditLimitChange: -5,
  };

  const baseData: SettlementNotificationData = {
    familyId: "family-1",
    familyName: "Wang Family",
    locale: "en",
    settlementDate: new Date("2026-02-01T12:00:00"),
    children: [baseChild],
    totalInterestCharged: 5,
  };

  describe("getSettlementNoticeSubject", () => {
    it("generates English subject line with family name", () => {
      const subject = getSettlementNoticeSubject(baseData, "en");
      expect(subject).toContain("StarQuest Credit Settlement Notice");
      expect(subject).toContain("Wang Family");
    });

    it("generates Chinese subject line with family name", () => {
      const subject = getSettlementNoticeSubject(baseData, "zh-CN");
      expect(subject).toContain("夺星大闯关 信用结算通知");
      expect(subject).toContain("Wang Family");
    });
  });

  describe("generateSettlementNoticeHtml", () => {
    it("contains settlement date", () => {
      const html = generateSettlementNoticeHtml(baseData);
      // formatDate uses weekday: long, month: long, day: numeric, year: numeric
      expect(html).toContain("February");
      expect(html).toContain("2026");
      expect(html).toContain("Settlement Date");
    });

    it("contains total interest charged", () => {
      const html = generateSettlementNoticeHtml(baseData);
      expect(html).toContain("Total Interest Charged");
      expect(html).toContain("5");
    });

    it("contains settlement explanation text", () => {
      const html = generateSettlementNoticeHtml(baseData);
      expect(html).toContain(
        "Interest is calculated based on each child's negative balance"
      );
      expect(html).toContain(
        "Credit limits may be adjusted based on repayment history"
      );
    });

    it('shows "No interest was charged" when totalInterestCharged === 0', () => {
      const data: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 0,
        children: [baseChild],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain(
        "No interest was charged this period"
      );
    });

    it('shows "No interest was charged" when children array is empty', () => {
      const data: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 0,
        children: [],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain(
        "No interest was charged this period"
      );
    });

    it("contains child debt amount, interest charged, and credit limit info", () => {
      const html = generateSettlementNoticeHtml(baseData);
      expect(html).toContain("Alice");
      expect(html).toContain("30"); // debtAmount
      expect(html).toContain("Debt Amount");
      expect(html).toContain("-5"); // interestCharged displayed as -5
      expect(html).toContain("Interest Charged");
      expect(html).toContain("50"); // creditLimitBefore
      expect(html).toContain("Credit Limit (Before)");
      expect(html).toContain("45"); // creditLimitAfter
      expect(html).toContain("Credit Limit (After)");
      expect(html).toContain("Limit Change");
    });

    it("contains interest breakdown table when present", () => {
      const html = generateSettlementNoticeHtml(baseData);
      expect(html).toContain("Interest Breakdown");
      expect(html).toContain("Tier");
      expect(html).toContain("Debt Range");
      expect(html).toContain("Rate");
      expect(html).toContain("5.0%");
      expect(html).toContain("Debt in Tier");
      expect(html).toContain("15"); // debtInTier
    });

    it("handles null maxDebt as Unlimited", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            interestBreakdown: [
              {
                tierOrder: 1,
                minDebt: 50,
                maxDebt: null,
                debtInTier: 30,
                rate: 0.15,
                interestAmount: 4.5,
              },
            ],
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("Unlimited");
      expect(html).toContain("50 - Unlimited");
    });

    it("skips children with 0 interest and 0 credit limit change", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 5,
        children: [
          {
            ...baseChild,
            name: "SkippedChild",
            interestCharged: 0,
            creditLimitChange: 0,
          },
          {
            ...baseChild,
            name: "ShownChild",
            interestCharged: 5,
            creditLimitChange: -3,
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).not.toContain("SkippedChild");
      expect(html).toContain("ShownChild");
    });

    it("shows child when only creditLimitChange is nonzero", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 0,
        children: [],
      };
      // When totalInterestCharged is 0, it shows the no-interest message
      // But let's test with interest > 0 and a child with only limit change
      const data2: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 3,
        children: [
          {
            ...baseChild,
            name: "LimitChangeOnly",
            interestCharged: 0,
            creditLimitChange: 10,
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data2);
      expect(html).toContain("LimitChangeOnly");
    });

    it("shows positive credit limit change with success styling", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditLimitChange: 10,
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data);
      // Positive change: uses colors.success (#10B981) and + prefix
      expect(html).toContain("+10");
      expect(html).toContain("#10B981");
    });

    it("shows negative credit limit change with error styling", () => {
      const html = generateSettlementNoticeHtml(baseData);
      // baseChild has creditLimitChange: -5, uses colors.error (#EF4444)
      expect(html).toContain("-5");
      expect(html).toContain("#EF4444");
    });

    it("renders Chinese labels for zh-CN locale", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        locale: "zh-CN",
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("信用结算已完成");
      expect(html).toContain("结算日期");
      expect(html).toContain("总利息费用");
      expect(html).toContain("债务金额");
      expect(html).toContain("利息费用");
      expect(html).toContain("信用额度（之前）");
      expect(html).toContain("信用额度（之后）");
      expect(html).toContain("额度变化");
      expect(html).toContain("利息明细");
      expect(html).toContain("档位");
      expect(html).toContain("债务范围");
      expect(html).toContain("利率");
      expect(html).toContain("档位内债务");
      expect(html).toContain("夺星大闯关");
      expect(html).toContain("鲸律");
    });

    it("shows Chinese no-interest message when totalInterestCharged is 0", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        locale: "zh-CN",
        totalInterestCharged: 0,
        children: [],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("本期未收取利息。所有孩子的余额为正数或零。");
    });

    it("shows Chinese settlement explanation text", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        locale: "zh-CN",
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain(
        "利息根据结算时每个孩子的负余额（债务）计算"
      );
    });

    it("handles null maxDebt as Chinese Unlimited", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        locale: "zh-CN",
        children: [
          {
            ...baseChild,
            interestBreakdown: [
              {
                ...baseBreakdown,
                maxDebt: null,
              },
            ],
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("无限制");
    });

    it("shows zero interest with success styling", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 0,
        children: [],
      };
      const html = generateSettlementNoticeHtml(data);
      // totalInterestCharged === 0 should use colors.success (#10B981)
      expect(html).toContain("#10B981");
    });

    it("uses base layout with DOCTYPE, header, and footer", () => {
      const html = generateSettlementNoticeHtml(baseData);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("StarQuest");
      expect(html).toContain("Beluga Tempo");
      expect(html).toContain("View in App");
    });

    it("contains multiple children details", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        totalInterestCharged: 8,
        children: [
          { ...baseChild, name: "Alice", interestCharged: 5 },
          {
            ...baseChild,
            childId: "child-2",
            name: "Bob",
            debtAmount: 15,
            interestCharged: 3,
            creditLimitChange: 5,
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("Alice");
      expect(html).toContain("Bob");
    });

    it("does not show interest breakdown when breakdown array is empty", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            interestBreakdown: [],
          },
        ],
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("Alice");
      // The Interest Breakdown header should not appear for this child
      expect(html).not.toContain("Interest Breakdown");
    });

    it("falls back to English when locale has no translation entry", () => {
      const data: SettlementNotificationData = {
        ...baseData,
        locale: "fr" as any,
      };
      const html = generateSettlementNoticeHtml(data);
      expect(html).toContain("Settlement Date");
      expect(html).toContain("Total Interest Charged");
      expect(html).toContain("Debt Amount");
    });
  });

  describe("t() translation helper", () => {
    it("returns locale-specific translation for known locale", () => {
      expect(t("subject", "en")).toBe("StarQuest Credit Settlement Notice");
      expect(t("subject", "zh-CN")).toBe("夺星大闯关 信用结算通知");
    });

    it("falls back to English when locale entry is missing", () => {
      expect(t("subject", "fr" as any)).toBe("StarQuest Credit Settlement Notice");
    });

    it("returns the key itself when key does not exist in translations", () => {
      expect(t("nonexistent_key", "en")).toBe("nonexistent_key");
    });
  });
});
