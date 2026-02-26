import {
  DEMO_USERS,
  getDemoUser,
  type DemoUserInfo,
} from "@/lib/demo/demo-users";

describe("demo-users", () => {
  describe("DEMO_USERS", () => {
    it("has exactly 3 entries", () => {
      expect(DEMO_USERS).toHaveLength(3);
    });

    it.each(DEMO_USERS)(
      "$role has all required fields",
      (user: DemoUserInfo) => {
        expect(user.role).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.nameEn).toBeDefined();
        expect(user.nameZh).toBeDefined();
        expect(user.descriptionEn).toBeDefined();
        expect(user.descriptionZh).toBeDefined();
        expect(user.emoji).toBeDefined();
        expect(user.redirectPath).toBeDefined();
      }
    );

    it("has unique roles", () => {
      const roles = DEMO_USERS.map((u) => u.role);
      expect(new Set(roles).size).toBe(roles.length);
      expect(roles).toEqual(
        expect.arrayContaining(["parent", "alisa", "alexander"])
      );
    });

    it("all emails end with @starquest.app", () => {
      for (const user of DEMO_USERS) {
        expect(user.email).toMatch(/@starquest\.app$/);
      }
    });

    it("parent redirects to activities", () => {
      const parent = DEMO_USERS.find((u) => u.role === "parent");
      expect(parent?.redirectPath).toBe("activities");
    });

    it("children redirect to activities", () => {
      const children = DEMO_USERS.filter((u) => u.role !== "parent");
      for (const child of children) {
        expect(child.redirectPath).toBe("activities");
      }
    });
  });

  describe("getDemoUser", () => {
    it('returns parent info for "parent"', () => {
      const user = getDemoUser("parent");
      expect(user).toBeDefined();
      expect(user!.role).toBe("parent");
      expect(user!.email).toBe("demo@starquest.app");
    });

    it('returns Alisa info for "alisa"', () => {
      const user = getDemoUser("alisa");
      expect(user).toBeDefined();
      expect(user!.role).toBe("alisa");
      expect(user!.nameEn).toBe("Alisa");
    });

    it('returns Alexander info for "alexander"', () => {
      const user = getDemoUser("alexander");
      expect(user).toBeDefined();
      expect(user!.role).toBe("alexander");
      expect(user!.nameEn).toBe("Alexander");
    });

    it("returns undefined for invalid role", () => {
      expect(getDemoUser("invalid")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(getDemoUser("")).toBeUndefined();
    });
  });
});
