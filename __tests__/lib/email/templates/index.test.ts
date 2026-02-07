describe("lib/email/templates/index", () => {
  it("re-exports base-layout functions", () => {
    const exports = require("@/lib/email/templates/index");
    expect(exports.baseLayout).toBeDefined();
    expect(exports.t).toBeDefined();
    expect(exports.colors).toBeDefined();
  });

  it("re-exports weekly-report functions", () => {
    const exports = require("@/lib/email/templates/index");
    expect(exports.generateWeeklyReportHtml).toBeDefined();
    expect(exports.getWeeklyReportSubject).toBeDefined();
  });

  it("re-exports monthly-report functions", () => {
    const exports = require("@/lib/email/templates/index");
    expect(exports.generateMonthlyReportHtml).toBeDefined();
    expect(exports.getMonthlyReportSubject).toBeDefined();
  });

  it("re-exports settlement-notice functions", () => {
    const exports = require("@/lib/email/templates/index");
    expect(exports.generateSettlementNoticeHtml).toBeDefined();
    expect(exports.getSettlementNoticeSubject).toBeDefined();
  });

  it("re-exports invite-parent functions", () => {
    const exports = require("@/lib/email/templates/index");
    expect(exports.generateInviteParentHtml).toBeDefined();
  });
});
