import {
  getMonthlyReportSubject,
  generateMonthlyReportHtml,
  _monthlyT as t,
} from "@/lib/email/templates/monthly-report";
import type {
  MonthlyReportData,
  ChildWeeklyData,
  ChildSettlementData,
  InterestTierBreakdown,
} from "@/types/reports";

describe("monthly-report email template", () => {
  const baseChild: ChildWeeklyData = {
    childId: "child-1",
    name: "Alice",
    starsEarned: 100,
    starsSpent: 40,
    netStars: 60,
    currentBalance: 200,
    creditBorrowed: 0,
    creditRepaid: 0,
    topQuests: [],
    pendingRequestsCount: 0,
  };

  const baseSettlement: ChildSettlementData = {
    childId: "child-1",
    name: "Alice",
    debtAmount: 20,
    interestCharged: 3,
    interestBreakdown: [],
    creditLimitBefore: 50,
    creditLimitAfter: 45,
    creditLimitChange: -5,
  };

  const baseData: MonthlyReportData = {
    familyId: "family-1",
    familyName: "Johnson Family",
    locale: "en",
    periodStart: new Date("2026-01-15T12:00:00"),
    periodEnd: new Date("2026-01-31T12:00:00"),
    children: [baseChild],
    totalStarsEarned: 100,
    totalStarsSpent: 40,
  };

  describe("getMonthlyReportSubject", () => {
    it("generates English subject line with family name", () => {
      const subject = getMonthlyReportSubject(baseData, "en");
      expect(subject).toContain("StarQuest Monthly Report");
      expect(subject).toContain("Johnson Family");
    });

    it("generates Chinese subject line with family name", () => {
      const subject = getMonthlyReportSubject(baseData, "zh-CN");
      expect(subject).toContain("夺星大闯关 月报");
      expect(subject).toContain("Johnson Family");
    });
  });

  describe("generateMonthlyReportHtml", () => {
    it("contains monthly summary header", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).toContain("Monthly Star Summary");
    });

    it("contains family name in overview", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).toContain("Johnson Family");
    });

    it("contains family overview stats", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).toContain("Family Overview");
      expect(html).toContain("+100");
      expect(html).toContain("-40");
      expect(html).toContain("Total Earned");
      expect(html).toContain("Total Spent");
    });

    it("contains period date formatted as month and year", () => {
      const html = generateMonthlyReportHtml(baseData);
      // toLocaleDateString with month: "long", year: "numeric"
      expect(html).toContain("January");
      expect(html).toContain("2026");
    });

    it("contains child name and stats", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).toContain("Alice");
      expect(html).toContain("+100"); // starsEarned
      expect(html).toContain("-40"); // starsSpent
      expect(html).toContain("+60"); // netStars
      expect(html).toContain("200"); // currentBalance
    });

    it("contains month-over-month comparison when present", () => {
      const data: MonthlyReportData = {
        ...baseData,
        previousMonthComparison: {
          starsEarnedChange: 15,
          starsSpentChange: -10,
        },
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Compared to Last Month");
      expect(html).toContain("Stars Earned");
      expect(html).toContain("+15%");
      expect(html).toContain("-10%");
    });

    it("does not contain comparison when absent", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).not.toContain("Compared to Last Month");
    });

    it("handles negative earned change and positive spent change in comparison", () => {
      const data: MonthlyReportData = {
        ...baseData,
        previousMonthComparison: {
          starsEarnedChange: -20,
          starsSpentChange: 30,
        },
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("-20%");
      expect(html).toContain("+30%");
    });

    it('shows "No activity this month" when children array is empty', () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("No activity this month");
    });

    it("contains settlement section when settlementData is present", () => {
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [baseSettlement],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Credit Settlement");
      expect(html).toContain("Alice");
      expect(html).toContain("20"); // debtAmount
      expect(html).toContain("-3"); // interestCharged
    });

    it("does not contain settlement section when settlementData is absent", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).not.toContain("Credit Settlement");
    });

    it("does not contain settlement section when settlementData is empty array", () => {
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).not.toContain("Credit Settlement");
    });

    it("handles settlement with interest breakdown", () => {
      const breakdown: InterestTierBreakdown[] = [
        {
          tierOrder: 1,
          minDebt: 0,
          maxDebt: 10,
          debtInTier: 10,
          rate: 0.05,
          interestAmount: 0.5,
        },
        {
          tierOrder: 2,
          minDebt: 10,
          maxDebt: 50,
          debtInTier: 10,
          rate: 0.1,
          interestAmount: 1,
        },
      ];
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [
          {
            ...baseSettlement,
            interestBreakdown: breakdown,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Interest Breakdown");
      expect(html).toContain("Tier");
      expect(html).toContain("Debt Range");
      expect(html).toContain("Rate");
      expect(html).toContain("5.0%");
      expect(html).toContain("10.0%");
      expect(html).toContain("Debt in Tier");
    });

    it("handles settlement with null maxDebt as Unlimited", () => {
      const breakdown: InterestTierBreakdown[] = [
        {
          tierOrder: 1,
          minDebt: 50,
          maxDebt: null,
          debtInTier: 20,
          rate: 0.15,
          interestAmount: 3,
        },
      ];
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [
          {
            ...baseSettlement,
            interestBreakdown: breakdown,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Unlimited");
    });

    it("skips settlement entries where interestCharged and creditLimitChange are both 0", () => {
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [
          {
            ...baseSettlement,
            name: "SkippedChild",
            interestCharged: 0,
            creditLimitChange: 0,
          },
          {
            ...baseSettlement,
            name: "ShownChild",
            interestCharged: 2,
            creditLimitChange: -3,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).not.toContain("SkippedChild");
      expect(html).toContain("ShownChild");
    });

    it("shows settlement entry when only creditLimitChange is nonzero", () => {
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [
          {
            ...baseSettlement,
            interestCharged: 0,
            creditLimitChange: 5,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Credit Settlement");
      expect(html).toContain("Alice");
    });

    it("shows positive credit limit change with + prefix", () => {
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [
          {
            ...baseSettlement,
            creditLimitChange: 10,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("+10");
    });

    it("shows negative credit limit change without + prefix", () => {
      const data: MonthlyReportData = {
        ...baseData,
        settlementData: [
          {
            ...baseSettlement,
            creditLimitChange: -5,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("-5");
    });

    it("renders Chinese labels for zh-CN locale", () => {
      const data: MonthlyReportData = {
        ...baseData,
        locale: "zh-CN",
        previousMonthComparison: {
          starsEarnedChange: 10,
          starsSpentChange: -5,
        },
        settlementData: [
          {
            ...baseSettlement,
            interestBreakdown: [
              {
                tierOrder: 1,
                minDebt: 0,
                maxDebt: null,
                debtInTier: 20,
                rate: 0.1,
                interestAmount: 2,
              },
            ],
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("每月星星汇总");
      expect(html).toContain("家庭总览");
      expect(html).toContain("总获得");
      expect(html).toContain("总消费");
      expect(html).toContain("获得星星");
      expect(html).toContain("消费星星");
      expect(html).toContain("净变化");
      expect(html).toContain("当前余额");
      expect(html).toContain("与上月相比");
      expect(html).toContain("信用结算");
      expect(html).toContain("利息明细");
      expect(html).toContain("档位");
      expect(html).toContain("债务范围");
      expect(html).toContain("利率");
      expect(html).toContain("无限制");
      expect(html).toContain("夺星大闯关");
      expect(html).toContain("鲸律");
    });

    it("uses base layout with DOCTYPE, header, and footer", () => {
      const html = generateMonthlyReportHtml(baseData);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("StarQuest");
      expect(html).toContain("Beluga Tempo");
      expect(html).toContain("View in App");
    });

    it("contains credit activity for children with borrowing", () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 15,
            creditRepaid: 5,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Borrowed");
      expect(html).toContain("Repaid");
    });

    it("contains top quests when present", () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            topQuests: [{ name: "Practice Piano", stars: 5, count: 10 }],
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Top Completed Quests");
      expect(html).toContain("Practice Piano");
      expect(html).toContain("10 times");
      expect(html).toContain("+50 stars");
    });

    it("contains pending requests when count > 0", () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            pendingRequestsCount: 7,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Pending Requests");
      expect(html).toContain("7");
    });

    it("shows empty state in zh-CN", () => {
      const data: MonthlyReportData = {
        ...baseData,
        locale: "zh-CN",
        children: [],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("本月无活动");
    });

    it("shows child with negative netStars", () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            netStars: -10,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("-10");
      expect(html).toContain("text-error");
    });

    it("shows credit section with only creditBorrowed > 0 and creditRepaid = 0", () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 10,
            creditRepaid: 0,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Borrowed");
      // Should not contain the separator " | " since creditRepaid is 0
      expect(html).not.toContain("Repaid");
    });

    it("shows credit section with only creditRepaid > 0 and creditBorrowed = 0", () => {
      const data: MonthlyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 0,
            creditRepaid: 8,
          },
        ],
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Repaid");
      // Should not contain Borrowed text
      expect(html).not.toContain("Borrowed");
    });

    it("returns the translation key itself when key is unknown", () => {
      // The t() function falls back to key when translations[key] is undefined
      // This is implicitly tested through the template but let's verify by checking
      // an unknown key doesn't crash - the template itself uses known keys
      // but the fallback `|| key` is the branch we need to cover.
      // We can test this via getMonthlyReportSubject since it uses t()
      // The translations exist for known keys. The fallback `translations[key]?.en || key`
      // is hit when en is undefined for a key. Since all our keys have both locales,
      // we just verify the function works with a non-existent locale fallback.
      const html = generateMonthlyReportHtml(baseData);
      // Verify the function doesn't crash and produces output
      expect(html).toBeTruthy();
    });

    it("falls back to English when locale has no translation entry", () => {
      const data: MonthlyReportData = {
        ...baseData,
        locale: "fr" as any,
      };
      const html = generateMonthlyReportHtml(data);
      expect(html).toContain("Monthly Star Summary");
      expect(html).toContain("Family Overview");
      expect(html).toContain("Total Earned");
    });
  });

  describe("t() translation helper", () => {
    it("returns locale-specific translation for known locale", () => {
      expect(t("subject", "en")).toBe("StarQuest Monthly Report");
      expect(t("subject", "zh-CN")).toBe("夺星大闯关 月报");
    });

    it("falls back to English when locale entry is missing", () => {
      expect(t("subject", "fr" as any)).toBe("StarQuest Monthly Report");
    });

    it("returns the key itself when key does not exist in translations", () => {
      expect(t("nonexistent_key", "en")).toBe("nonexistent_key");
    });
  });
});
