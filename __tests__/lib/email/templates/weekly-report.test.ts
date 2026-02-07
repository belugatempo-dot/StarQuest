import {
  getWeeklyReportSubject,
  generateWeeklyReportHtml,
  _weeklyT as t,
} from "@/lib/email/templates/weekly-report";
import type { WeeklyReportData, ChildWeeklyData } from "@/types/reports";

describe("weekly-report email template", () => {
  const baseChild: ChildWeeklyData = {
    childId: "child-1",
    name: "Alice",
    starsEarned: 25,
    starsSpent: 10,
    netStars: 15,
    currentBalance: 50,
    creditBorrowed: 0,
    creditRepaid: 0,
    topQuests: [],
    pendingRequestsCount: 0,
  };

  const baseData: WeeklyReportData = {
    familyId: "family-1",
    familyName: "Smith Family",
    locale: "en",
    periodStart: new Date("2026-01-05T12:00:00"),
    periodEnd: new Date("2026-01-11T12:00:00"),
    children: [baseChild],
    totalStarsEarned: 25,
    totalStarsSpent: 10,
  };

  describe("getWeeklyReportSubject", () => {
    it("generates English subject line with family name", () => {
      const subject = getWeeklyReportSubject(baseData, "en");
      expect(subject).toContain("StarQuest Weekly Report");
      expect(subject).toContain("Smith Family");
    });

    it("generates Chinese subject line with family name", () => {
      const subject = getWeeklyReportSubject(baseData, "zh-CN");
      expect(subject).toContain("夺星大闯关 周报");
      expect(subject).toContain("Smith Family");
    });

    it("falls back to English subject when locale is unsupported", () => {
      const subject = getWeeklyReportSubject(baseData, "fr" as any);
      expect(subject).toContain("StarQuest Weekly Report");
    });
  });

  describe("generateWeeklyReportHtml", () => {
    it("contains family name", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).toContain("Smith Family");
    });

    it("contains period dates", () => {
      const html = generateWeeklyReportHtml(baseData);
      // The dates are formatted via toLocaleDateString with month short, day, year
      expect(html).toContain("Jan");
      expect(html).toContain("2026");
    });

    it("contains total stars earned", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).toContain("+25");
    });

    it("contains total stars spent", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).toContain("-10");
    });

    it("contains child name", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).toContain("Alice");
    });

    it("contains child star stats", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).toContain("+25"); // starsEarned
      expect(html).toContain("-10"); // starsSpent
      expect(html).toContain("+15"); // netStars
      expect(html).toContain("50"); // currentBalance
    });

    it("contains credit activity when creditBorrowed > 0", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 5,
            creditRepaid: 3,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Borrowed");
      expect(html).toContain("5");
      expect(html).toContain("Repaid");
      expect(html).toContain("3");
    });

    it("does not contain credit section when no credit activity", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).not.toContain("Credit Activity");
      expect(html).not.toContain("Borrowed");
    });

    it("contains top quests when present", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            topQuests: [
              { name: "Brush Teeth", stars: 2, count: 7 },
              { name: "Read Book", stars: 3, count: 5 },
            ],
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Top Completed Quests");
      expect(html).toContain("Brush Teeth");
      expect(html).toContain("Read Book");
      // Brush Teeth: 7 times (+14 stars)
      expect(html).toContain("7 times");
      expect(html).toContain("+14 stars");
      // Read Book: 5 times (+15 stars)
      expect(html).toContain("5 times");
      expect(html).toContain("+15 stars");
    });

    it("contains pending request count when > 0", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            pendingRequestsCount: 3,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Pending Requests");
      expect(html).toContain("3");
    });

    it("does not show pending requests section when count is 0", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).not.toContain("Pending Requests");
    });

    it('shows "No activity this week" when children array is empty', () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("No activity this week");
    });

    it("uses base layout with DOCTYPE, header, and footer", () => {
      const html = generateWeeklyReportHtml(baseData);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("StarQuest");
      expect(html).toContain("Beluga Tempo");
      expect(html).toContain("View in App");
    });

    it("renders Chinese labels for zh-CN locale", () => {
      const data: WeeklyReportData = {
        ...baseData,
        locale: "zh-CN",
        children: [
          {
            ...baseChild,
            creditBorrowed: 5,
            creditRepaid: 2,
            topQuests: [{ name: "刷牙", stars: 2, count: 3 }],
            pendingRequestsCount: 1,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("每周星星汇总");
      expect(html).toContain("家庭总览");
      expect(html).toContain("总获得");
      expect(html).toContain("总消费");
      expect(html).toContain("获得星星");
      expect(html).toContain("消费星星");
      expect(html).toContain("净变化");
      expect(html).toContain("当前余额");
      expect(html).toContain("信用活动");
      expect(html).toContain("借用");
      expect(html).toContain("偿还");
      expect(html).toContain("热门完成任务");
      expect(html).toContain("待审批请求");
      expect(html).toContain("夺星大闯关");
      expect(html).toContain("鲸律");
    });

    it("renders multiple children", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          { ...baseChild, name: "Alice" },
          {
            ...baseChild,
            childId: "child-2",
            name: "Bob",
            starsEarned: 30,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Alice");
      expect(html).toContain("Bob");
    });

    it("shows credit section when only creditRepaid > 0", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 0,
            creditRepaid: 8,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Repaid");
    });

    it("shows negative net stars correctly", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            netStars: -5,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("-5");
      expect(html).toContain("text-error");
    });

    it("shows credit section with only creditBorrowed > 0 and creditRepaid = 0 (no separator)", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 10,
            creditRepaid: 0,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Borrowed");
      // Should not contain Repaid text or separator
      expect(html).not.toContain("Repaid");
    });

    it("shows credit section with both borrowed and repaid (with separator)", () => {
      const data: WeeklyReportData = {
        ...baseData,
        children: [
          {
            ...baseChild,
            creditBorrowed: 10,
            creditRepaid: 5,
          },
        ],
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Credit Activity");
      expect(html).toContain("Borrowed");
      expect(html).toContain("Repaid");
      // Separator | should be present
      expect(html).toContain(" | ");
    });

    it("falls back to English when locale has no translation entry", () => {
      const data: WeeklyReportData = {
        ...baseData,
        locale: "fr" as any,
      };
      const html = generateWeeklyReportHtml(data);
      expect(html).toContain("Weekly Star Summary");
      expect(html).toContain("Family Overview");
      expect(html).toContain("Total Earned");
    });
  });

  describe("t() translation helper", () => {
    it("returns locale-specific translation for known locale", () => {
      expect(t("subject", "en")).toBe("StarQuest Weekly Report");
      expect(t("subject", "zh-CN")).toBe("夺星大闯关 周报");
    });

    it("falls back to English when locale entry is missing", () => {
      expect(t("subject", "fr" as any)).toBe("StarQuest Weekly Report");
    });

    it("returns the key itself when key does not exist in translations", () => {
      expect(t("nonexistent_key", "en")).toBe("nonexistent_key");
    });
  });
});
