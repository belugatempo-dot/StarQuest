import {
  generateMarkdownReport,
  type MarkdownReportData,
} from "@/lib/reports/markdown-formatter";

function makeData(overrides: Partial<MarkdownReportData> = {}): MarkdownReportData {
  return {
    familyName: "Demo Family",
    locale: "en",
    periodType: "weekly",
    periodStart: new Date(Date.UTC(2026, 1, 9)),
    periodEnd: new Date(Date.UTC(2026, 1, 15, 23, 59, 59)),
    generatedAt: new Date(Date.UTC(2026, 1, 16, 10, 0, 0)),
    children: [
      {
        childId: "c1",
        name: "Emma",
        starsEarned: 80,
        starsSpent: 30,
        netStars: 50,
        currentBalance: 45,
        creditBorrowed: 10,
        creditRepaid: 5,
        topQuests: [
          { name: "Homework", stars: 5, count: 12 },
          { name: "Chores", stars: 3, count: 8 },
        ],
        pendingRequestsCount: 3,
      },
      {
        childId: "c2",
        name: "Lucas",
        starsEarned: 40,
        starsSpent: 20,
        netStars: 20,
        currentBalance: 30,
        creditBorrowed: 0,
        creditRepaid: 0,
        topQuests: [{ name: "Reading", stars: 4, count: 6 }],
        pendingRequestsCount: 0,
      },
    ],
    totalEarned: 120,
    totalSpent: 50,
    previousPeriod: {
      totalEarned: 100,
      totalSpent: 60,
    },
    ...overrides,
  };
}

describe("markdown-formatter", () => {
  describe("generateMarkdownReport", () => {
    it("includes family name in title", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("# StarQuest Family Report — Demo Family");
    });

    it("includes period info line", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("Weekly");
      expect(md).toContain("2026");
    });

    it("includes generated timestamp", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("Generated:");
    });

    it("includes family overview table with total earned/spent", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("## Family Overview");
      expect(md).toContain("+120");
      expect(md).toContain("-50");
      expect(md).toContain("+70"); // net
    });

    it("includes period-over-period comparison when previous data exists", () => {
      const md = generateMarkdownReport(makeData());
      // 120 vs 100 = +20%
      expect(md).toMatch(/\+20\.0%/);
      // 50 vs 60 = -16.7%
      expect(md).toMatch(/-16\.7%/);
    });

    it("omits comparison when no previous period data", () => {
      const md = generateMarkdownReport(makeData({ previousPeriod: undefined }));
      expect(md).not.toContain("vs. Previous Period");
    });

    it("renders each child section with name heading", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("## Emma");
      expect(md).toContain("## Lucas");
    });

    it("includes child balance", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("45");
    });

    it("includes child star metrics", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("+80"); // Emma earned
      expect(md).toContain("-30"); // Emma spent
      expect(md).toContain("+50"); // Emma net
    });

    it("includes credit info only when non-zero", () => {
      const md = generateMarkdownReport(makeData());
      // Emma has credit
      expect(md).toContain("10"); // borrowed
      expect(md).toContain("5"); // repaid
    });

    it("skips credit rows for children with zero credit activity", () => {
      const md = generateMarkdownReport(makeData());
      // Lucas section should not have credit rows
      const lucasSection = md.split("## Lucas")[1];
      expect(lucasSection).toBeDefined();
      // Lucas's section ends at the next "---" or end of file
      const sectionEnd = lucasSection.indexOf("\n---");
      const section = sectionEnd >= 0 ? lucasSection.slice(0, sectionEnd) : lucasSection;
      // Should not contain "Credit Borrowed" label in Lucas's section
      expect(section).not.toMatch(/Credit Borrowed|信用借出/);
    });

    it("includes top quests table", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("### Top Quests");
      expect(md).toContain("Homework");
      expect(md).toContain("12"); // count
      expect(md).toContain("Chores");
    });

    it("shows pending requests warning when count > 0", () => {
      const md = generateMarkdownReport(makeData());
      expect(md).toContain("3 pending");
    });

    it("does not show pending warning when count is 0", () => {
      const md = generateMarkdownReport(makeData());
      const lucasSection = md.split("## Lucas")[1];
      expect(lucasSection).not.toMatch(/pending/i);
    });

    it("renders in Chinese when locale is zh-CN", () => {
      const md = generateMarkdownReport(makeData({ locale: "zh-CN" }));
      expect(md).toContain("StarQuest 家庭报告");
      expect(md).toContain("家庭概览");
      expect(md).toContain("热门任务");
    });

    it("handles empty children array", () => {
      const md = generateMarkdownReport(
        makeData({ children: [], totalEarned: 0, totalSpent: 0, previousPeriod: undefined })
      );
      expect(md).toContain("Family Overview");
      expect(md).not.toContain("## Emma");
    });

    it("handles child with empty topQuests", () => {
      const md = generateMarkdownReport(
        makeData({
          children: [
            {
              childId: "c1",
              name: "Emma",
              starsEarned: 0,
              starsSpent: 0,
              netStars: 0,
              currentBalance: 0,
              creditBorrowed: 0,
              creditRepaid: 0,
              topQuests: [],
              pendingRequestsCount: 0,
            },
          ],
        })
      );
      expect(md).toContain("## Emma");
      expect(md).not.toContain("### Top Quests");
    });

    it("formats period type label correctly for each type", () => {
      for (const pt of ["daily", "weekly", "monthly", "quarterly", "yearly"] as const) {
        const md = generateMarkdownReport(makeData({ periodType: pt }));
        const capitalized = pt.charAt(0).toUpperCase() + pt.slice(1);
        expect(md).toContain(capitalized);
      }
    });

    it("shows upward arrow for increases and downward arrow for decreases", () => {
      const md = generateMarkdownReport(makeData());
      // Earned went up
      expect(md).toMatch(/↑.*earned|earned.*↑/i);
      // Spent went down
      expect(md).toMatch(/↓.*spent|spent.*↓/i);
    });

    it("correctly calculates percentage changes", () => {
      const data = makeData({
        totalEarned: 150,
        totalSpent: 50,
        previousPeriod: { totalEarned: 100, totalSpent: 100 },
      });
      const md = generateMarkdownReport(data);
      expect(md).toContain("+50.0%"); // earned up 50%
      expect(md).toContain("-50.0%"); // spent down 50%
    });

    it("handles zero previous period gracefully (no division by zero)", () => {
      const data = makeData({
        totalEarned: 100,
        totalSpent: 50,
        previousPeriod: { totalEarned: 0, totalSpent: 0 },
      });
      const md = generateMarkdownReport(data);
      // Should not crash, should handle the edge case
      expect(md).toContain("vs. Previous Period");
    });
  });
});
