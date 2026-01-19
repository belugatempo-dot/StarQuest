import {
  formatInterestRate,
  formatDebtRange,
  calculateTotalSpendable,
  getCreditUsed,
  getAvailableCredit,
  DEFAULT_INTEREST_TIERS,
} from "@/types/credit";

describe("Credit Type Helpers", () => {
  describe("formatInterestRate", () => {
    it("formats 0.05 as 5%", () => {
      expect(formatInterestRate(0.05)).toBe("5%");
    });

    it("formats 0.10 as 10%", () => {
      expect(formatInterestRate(0.10)).toBe("10%");
    });

    it("formats 0.15 as 15%", () => {
      expect(formatInterestRate(0.15)).toBe("15%");
    });

    it("formats 0 as 0%", () => {
      expect(formatInterestRate(0)).toBe("0%");
    });

    it("formats 1.0 as 100%", () => {
      expect(formatInterestRate(1.0)).toBe("100%");
    });
  });

  describe("formatDebtRange", () => {
    it("formats range with max", () => {
      expect(formatDebtRange(0, 19)).toBe("0-19");
    });

    it("formats range with null max (unlimited)", () => {
      expect(formatDebtRange(50, null)).toBe("50+");
    });

    it("formats single value range", () => {
      expect(formatDebtRange(20, 20)).toBe("20-20");
    });
  });

  describe("calculateTotalSpendable", () => {
    it("returns balance when credit is disabled", () => {
      expect(calculateTotalSpendable(100, false, 50)).toBe(100);
    });

    it("returns 0 when balance is negative and credit is disabled", () => {
      expect(calculateTotalSpendable(-20, false, 50)).toBe(0);
    });

    it("returns balance + available credit when credit is enabled", () => {
      expect(calculateTotalSpendable(100, true, 50)).toBe(150);
    });

    it("returns only available credit when balance is 0 and credit is enabled", () => {
      expect(calculateTotalSpendable(0, true, 50)).toBe(50);
    });

    it("returns only available credit when balance is negative and credit is enabled", () => {
      expect(calculateTotalSpendable(-20, true, 30)).toBe(30);
    });
  });

  describe("getCreditUsed", () => {
    it("returns 0 when balance is positive", () => {
      expect(getCreditUsed(100)).toBe(0);
    });

    it("returns 0 when balance is 0", () => {
      expect(getCreditUsed(0)).toBe(0);
    });

    it("returns absolute value when balance is negative", () => {
      expect(getCreditUsed(-20)).toBe(20);
    });

    it("handles large negative balance", () => {
      expect(getCreditUsed(-500)).toBe(500);
    });
  });

  describe("getAvailableCredit", () => {
    it("returns 0 when credit is disabled", () => {
      expect(getAvailableCredit(100, 50, false)).toBe(0);
    });

    it("returns full credit limit when balance is positive", () => {
      expect(getAvailableCredit(100, 50, true)).toBe(50);
    });

    it("returns full credit limit when balance is 0", () => {
      expect(getAvailableCredit(0, 50, true)).toBe(50);
    });

    it("returns remaining credit when some credit is used", () => {
      expect(getAvailableCredit(-20, 50, true)).toBe(30);
    });

    it("returns 0 when credit is fully used", () => {
      expect(getAvailableCredit(-50, 50, true)).toBe(0);
    });

    it("returns 0 when debt exceeds credit limit", () => {
      expect(getAvailableCredit(-100, 50, true)).toBe(0);
    });
  });

  describe("DEFAULT_INTEREST_TIERS", () => {
    it("has 3 default tiers", () => {
      expect(DEFAULT_INTEREST_TIERS).toHaveLength(3);
    });

    it("first tier is 0-19 at 5%", () => {
      expect(DEFAULT_INTEREST_TIERS[0]).toEqual({
        tier_order: 1,
        min_debt: 0,
        max_debt: 19,
        interest_rate: 0.05,
      });
    });

    it("second tier is 20-49 at 10%", () => {
      expect(DEFAULT_INTEREST_TIERS[1]).toEqual({
        tier_order: 2,
        min_debt: 20,
        max_debt: 49,
        interest_rate: 0.10,
      });
    });

    it("third tier is 50+ at 15%", () => {
      expect(DEFAULT_INTEREST_TIERS[2]).toEqual({
        tier_order: 3,
        min_debt: 50,
        max_debt: null,
        interest_rate: 0.15,
      });
    });

    it("tiers are in ascending order", () => {
      for (let i = 1; i < DEFAULT_INTEREST_TIERS.length; i++) {
        expect(DEFAULT_INTEREST_TIERS[i].tier_order).toBeGreaterThan(
          DEFAULT_INTEREST_TIERS[i - 1].tier_order
        );
      }
    });

    it("interest rates increase with each tier", () => {
      for (let i = 1; i < DEFAULT_INTEREST_TIERS.length; i++) {
        expect(DEFAULT_INTEREST_TIERS[i].interest_rate).toBeGreaterThan(
          DEFAULT_INTEREST_TIERS[i - 1].interest_rate
        );
      }
    });
  });
});
