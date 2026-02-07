describe("lib/reports/index", () => {
  it("re-exports weekly report functions", () => {
    const exports = require("@/lib/reports/index");
    expect(exports.generateWeeklyReportData).toBeDefined();
    expect(exports.getWeekBounds).toBeDefined();
  });

  it("re-exports monthly report functions", () => {
    const exports = require("@/lib/reports/index");
    expect(exports.generateMonthlyReportData).toBeDefined();
    expect(exports.getMonthBounds).toBeDefined();
  });
});
