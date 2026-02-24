import {
  DEMO_PARENT_EMAIL,
  DEMO_FAMILY_NAME,
  DEMO_PARENT_NAME,
  DEMO_CHILDREN,
  DEMO_START_DATE,
  DEMO_HISTORY_DAYS,
  type DemoChildProfile,
} from "@/lib/demo/demo-config";

describe("demo-config", () => {
  describe("constants", () => {
    it("DEMO_PARENT_EMAIL is demo@starquest.app", () => {
      expect(DEMO_PARENT_EMAIL).toBe("demo@starquest.app");
    });

    it("DEMO_FAMILY_NAME is defined", () => {
      expect(DEMO_FAMILY_NAME).toBe("Demo Family");
    });

    it("DEMO_PARENT_NAME is defined", () => {
      expect(DEMO_PARENT_NAME).toBe("Demo Parent");
    });

    it("DEMO_START_DATE is a valid Date", () => {
      expect(DEMO_START_DATE).toBeInstanceOf(Date);
      expect(DEMO_START_DATE.getTime()).not.toBeNaN();
    });

    it("DEMO_HISTORY_DAYS equals 30", () => {
      expect(DEMO_HISTORY_DAYS).toBe(30);
    });
  });

  describe("DEMO_CHILDREN", () => {
    it("has exactly 2 entries", () => {
      expect(DEMO_CHILDREN).toHaveLength(2);
    });

    it("Alisa profile has correct fields", () => {
      const alisa = DEMO_CHILDREN.find((c) => c.name === "Alisa");
      expect(alisa).toBeDefined();
      expect(alisa!.email).toBe("alisa.demo@starquest.app");
      expect(alisa!.locale).toBe("en");
      expect(alisa!.target.creditEnabled).toBe(false);
    });

    it("Alexander profile has correct fields", () => {
      const alex = DEMO_CHILDREN.find((c) => c.name === "Alexander");
      expect(alex).toBeDefined();
      expect(alex!.email).toBe("alexander.demo@starquest.app");
      expect(alex!.locale).toBe("zh-CN");
      expect(alex!.target.creditEnabled).toBe(true);
      expect(alex!.target.creditLimit).toBe(100);
    });

    it.each(DEMO_CHILDREN)(
      "$name has a non-empty password",
      (child: DemoChildProfile) => {
        expect(child.password).toBeTruthy();
        expect(child.password.length).toBeGreaterThan(0);
      }
    );

    it.each(DEMO_CHILDREN)(
      "$name has behavior rates between 0 and 1",
      (child: DemoChildProfile) => {
        const { behavior } = child;
        expect(behavior.dutyMissRate).toBeGreaterThanOrEqual(0);
        expect(behavior.dutyMissRate).toBeLessThanOrEqual(1);
        expect(behavior.childRequestRate).toBeGreaterThanOrEqual(0);
        expect(behavior.childRequestRate).toBeLessThanOrEqual(1);
        expect(behavior.pendingRate).toBeGreaterThanOrEqual(0);
        expect(behavior.pendingRate).toBeLessThanOrEqual(1);
        expect(behavior.rejectedRate).toBeGreaterThanOrEqual(0);
        expect(behavior.rejectedRate).toBeLessThanOrEqual(1);
        expect(behavior.violationRate).toBeGreaterThanOrEqual(0);
        expect(behavior.violationRate).toBeLessThanOrEqual(1);
      }
    );

    it.each(DEMO_CHILDREN)(
      "$name bonusesPerDay min < max",
      (child: DemoChildProfile) => {
        const [min, max] = child.behavior.bonusesPerDay;
        expect(min).toBeLessThan(max);
      }
    );

    it.each(DEMO_CHILDREN)(
      "$name multiplierDist probabilities sum to ~1.0",
      (child: DemoChildProfile) => {
        const sum = Object.values(child.behavior.multiplierDist).reduce(
          (a, b) => a + b,
          0
        );
        expect(sum).toBeCloseTo(1.0, 2);
      }
    );
  });
});
