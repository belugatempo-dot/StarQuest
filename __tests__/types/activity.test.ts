import { getPermissions } from "@/types/activity";
import type { ActivityPermissions, ActivityRole } from "@/types/activity";

describe("activity types", () => {
  describe("getPermissions", () => {
    it("returns correct parent permissions", () => {
      const perms = getPermissions("parent");
      expect(perms).toEqual<ActivityPermissions>({
        canEdit: true,
        canDelete: true,
        canBatchApprove: true,
        canResubmit: false,
        canSeeAllChildren: true,
        canFilterByType: true,
        showStatistics: true,
        usePagination: false,
      });
    });

    it("returns correct child permissions", () => {
      const perms = getPermissions("child");
      expect(perms).toEqual<ActivityPermissions>({
        canEdit: false,
        canDelete: false,
        canBatchApprove: false,
        canResubmit: true,
        canSeeAllChildren: false,
        canFilterByType: false,
        showStatistics: false,
        usePagination: true,
      });
    });

    it("parent can edit and delete", () => {
      const perms = getPermissions("parent");
      expect(perms.canEdit).toBe(true);
      expect(perms.canDelete).toBe(true);
    });

    it("child cannot edit or delete", () => {
      const perms = getPermissions("child");
      expect(perms.canEdit).toBe(false);
      expect(perms.canDelete).toBe(false);
    });

    it("only child can resubmit", () => {
      expect(getPermissions("parent").canResubmit).toBe(false);
      expect(getPermissions("child").canResubmit).toBe(true);
    });

    it("only parent can batch approve", () => {
      expect(getPermissions("parent").canBatchApprove).toBe(true);
      expect(getPermissions("child").canBatchApprove).toBe(false);
    });
  });
});
