import { render, screen, fireEvent } from "@testing-library/react";
import ActivityItem from "@/components/shared/ActivityItem";
import type { UnifiedActivityItem } from "@/types/activity";
import { getPermissions } from "@/types/activity";

// Mock activity-utils
jest.mock("@/lib/activity-utils", () => ({
  getActivityDescription: (activity: any, locale: string) => {
    if (locale === "zh-CN" && activity.descriptionZh) return activity.descriptionZh;
    return activity.description;
  },
  getStatusBadge: (status: string) => ({
    label: status,
    className: `badge-${status}`,
  }),
  getTypeBadge: (type: string) => ({
    label: type,
    className: `badge-${type}`,
    icon: type === "star_transaction" ? "⭐" : type === "redemption" ? "🎁" : "💳",
  }),
  formatActivityDate: (dateStr: string) => dateStr,
}));

describe("ActivityItem", () => {
  const parentPermissions = getPermissions("parent");
  const childPermissions = getPermissions("child");

  const createActivity = (
    overrides: Partial<UnifiedActivityItem> = {}
  ): UnifiedActivityItem => ({
    id: "act-1",
    type: "star_transaction",
    childId: "child-1",
    childName: "Alice",
    childAvatar: null,
    stars: 5,
    description: "Clean Room",
    descriptionZh: "打扫房间",
    icon: "🧹",
    status: "approved",
    childNote: null,
    parentResponse: null,
    source: "parent_record",
    createdAt: "2025-01-15T10:00:00Z",
    originalData: {} as any,
    questId: "quest-1",
    quests: {
      name_en: "Clean Room",
      name_zh: "打扫房间",
      icon: "🧹",
      category: "chores",
    },
    ...overrides,
  });

  const defaultProps = {
    locale: "en",
    permissions: parentPermissions,
    selectionMode: false,
    isSelected: false,
    onToggleSelection: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onResubmit: jest.fn(),
    deletingId: null,
    showChildName: true,
    variant: "list" as const,
  };

  describe("List variant rendering", () => {
    it("renders activity description", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity()}
        />
      );
      expect(screen.getByText("Clean Room")).toBeInTheDocument();
    });

    it("renders activity icon", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity()}
        />
      );
      expect(screen.getByText("🧹")).toBeInTheDocument();
    });

    it("renders positive stars", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ stars: 5 })}
        />
      );
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("renders negative stars", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ stars: -3 })}
        />
      );
      expect(screen.getByText("-3")).toBeInTheDocument();
    });

    it("renders status badge", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "approved" })}
        />
      );
      expect(screen.getByText("status.approved")).toBeInTheDocument();
    });
  });

  describe("Calendar variant rendering", () => {
    it("renders activity description in calendar variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity()}
        />
      );
      expect(screen.getByText("Clean Room")).toBeInTheDocument();
    });

    it("renders status badge in calendar variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity({ status: "approved" })}
        />
      );
      // Status badge label rendered in calendar variant
      expect(screen.getByText("approved")).toBeInTheDocument();
    });

    it("renders stars with star emoji in calendar variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity({ stars: 5 })}
        />
      );
      expect(screen.getByText("+5⭐")).toBeInTheDocument();
    });
  });

  describe("Stars color classes", () => {
    it("applies rejected styling", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "rejected", stars: 5 })}
        />
      );
      const starsElement = screen.getByText("+5");
      expect(starsElement.className).toContain("text-slate-500");
      expect(starsElement.className).toContain("line-through");
    });

    it("applies pending styling", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "pending", stars: 3 })}
        />
      );
      const starsElement = screen.getByText("+3");
      expect(starsElement.className).toContain("text-yellow-600");
    });

    it("applies positive approved styling in list variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "approved", stars: 5 })}
        />
      );
      const starsElement = screen.getByText("+5");
      expect(starsElement.className).toContain("text-success");
    });

    it("applies negative approved styling in list variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "approved", stars: -3 })}
        />
      );
      const starsElement = screen.getByText("-3");
      expect(starsElement.className).toContain("text-danger");
    });
  });

  describe("Card classes", () => {
    it("applies rejected card class in list variant", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "rejected" })}
        />
      );
      expect(container.firstChild).toHaveClass("bg-danger/5");
    });

    it("applies pending card class in list variant", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ status: "pending" })}
        />
      );
      expect(container.firstChild).toHaveClass("bg-warning/5");
    });

    it("applies redemption card class in list variant", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ type: "redemption", status: "approved" })}
        />
      );
      expect(container.firstChild).toHaveClass("bg-purple-500/10");
    });

    it("applies credit card class in list variant", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ type: "credit_transaction", status: "approved" })}
        />
      );
      expect(container.firstChild).toHaveClass("bg-blue-500/10");
    });

    it("applies positive star card class in calendar variant", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity({ status: "approved", stars: 5 })}
        />
      );
      expect(container.firstChild).toHaveClass("bg-green-500/10");
    });

    it("applies negative star card class in calendar variant", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity({ status: "approved", stars: -2 })}
        />
      );
      expect(container.firstChild).toHaveClass("bg-red-500/10");
    });
  });

  describe("Action buttons", () => {
    it("shows edit button for parent on star transaction", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity()}
        />
      );
      expect(screen.getByText(/common.edit/)).toBeInTheDocument();
    });

    it("shows delete button for parent on star transaction", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity()}
        />
      );
      expect(screen.getByText(/common.delete/)).toBeInTheDocument();
    });

    it("does not show delete button for redemptions", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ type: "redemption" })}
        />
      );
      expect(screen.queryByText(/common.delete/)).not.toBeInTheDocument();
    });

    it("does not show action buttons for child", () => {
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          activity={createActivity()}
        />
      );
      expect(screen.queryByText(/common.edit/)).not.toBeInTheDocument();
      expect(screen.queryByText(/common.delete/)).not.toBeInTheDocument();
    });

    it("does not show action buttons for credit_transaction", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ type: "credit_transaction" })}
        />
      );
      expect(screen.queryByText(/common.edit/)).not.toBeInTheDocument();
    });

    it("calls onEdit when edit button clicked", () => {
      const onEdit = jest.fn();
      render(
        <ActivityItem
          {...defaultProps}
          onEdit={onEdit}
          activity={createActivity()}
        />
      );
      fireEvent.click(screen.getByText(/common.edit/));
      expect(onEdit).toHaveBeenCalled();
    });

    it("calls onDelete when delete button clicked", () => {
      const onDelete = jest.fn();
      render(
        <ActivityItem
          {...defaultProps}
          onDelete={onDelete}
          activity={createActivity()}
        />
      );
      fireEvent.click(screen.getByText(/common.delete/));
      expect(onDelete).toHaveBeenCalled();
    });

    it("disables delete button when deleting", () => {
      render(
        <ActivityItem
          {...defaultProps}
          deletingId="act-1"
          activity={createActivity({ id: "act-1" })}
        />
      );
      const deleteBtn = screen.getByText(/common.delete/).closest("button");
      expect(deleteBtn).toBeDisabled();
    });
  });

  describe("Selection mode", () => {
    it("shows checkbox for pending star transaction in selection mode", () => {
      render(
        <ActivityItem
          {...defaultProps}
          selectionMode={true}
          activity={createActivity({ status: "pending" })}
        />
      );
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("does not show checkbox for approved items in selection mode", () => {
      render(
        <ActivityItem
          {...defaultProps}
          selectionMode={true}
          activity={createActivity({ status: "approved" })}
        />
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("does not show checkbox for redemptions in selection mode", () => {
      render(
        <ActivityItem
          {...defaultProps}
          selectionMode={true}
          activity={createActivity({ type: "redemption", status: "pending" })}
        />
      );
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("checkbox is checked when isSelected is true", () => {
      render(
        <ActivityItem
          {...defaultProps}
          selectionMode={true}
          isSelected={true}
          activity={createActivity({ status: "pending" })}
        />
      );
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("calls onToggleSelection when checkbox clicked", () => {
      const onToggle = jest.fn();
      render(
        <ActivityItem
          {...defaultProps}
          selectionMode={true}
          onToggleSelection={onToggle}
          activity={createActivity({ status: "pending" })}
        />
      );
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onToggle).toHaveBeenCalled();
    });

    it("applies selected ring class when selected", () => {
      const { container } = render(
        <ActivityItem
          {...defaultProps}
          selectionMode={true}
          isSelected={true}
          activity={createActivity({ status: "pending" })}
        />
      );
      expect(container.firstChild).toHaveClass("ring-2");
    });
  });

  describe("Child-specific features", () => {
    it("shows source info for child view", () => {
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          showChildName={false}
          activity={createActivity({ source: "parent_record" })}
        />
      );
      expect(screen.getByText("history.parentRecorded")).toBeInTheDocument();
    });

    it("shows child request source", () => {
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          showChildName={false}
          activity={createActivity({ source: "child_request" })}
        />
      );
      expect(screen.getByText("history.youRequested")).toBeInTheDocument();
    });

    it("shows child note when present", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({ childNote: "I did great!" })}
        />
      );
      expect(screen.getByText('"I did great!"')).toBeInTheDocument();
    });

    it("shows parent response for rejected items", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity({
            status: "rejected",
            parentResponse: "Not verified",
          })}
        />
      );
      expect(screen.getByText("Not verified")).toBeInTheDocument();
    });

    it("shows pending indicator for child", () => {
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          showChildName={false}
          activity={createActivity({ status: "pending" })}
        />
      );
      expect(screen.getByText("history.waitingApproval")).toBeInTheDocument();
    });

    it("shows resubmit button for rejected child requests", () => {
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          showChildName={false}
          activity={createActivity({
            status: "rejected",
            source: "child_request",
          })}
        />
      );
      expect(screen.getByText("activity.editResubmit")).toBeInTheDocument();
    });

    it("calls onResubmit when resubmit clicked", () => {
      const onResubmit = jest.fn();
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          showChildName={false}
          onResubmit={onResubmit}
          activity={createActivity({
            status: "rejected",
            source: "child_request",
          })}
        />
      );
      fireEvent.click(screen.getByText("activity.editResubmit"));
      expect(onResubmit).toHaveBeenCalled();
    });
  });

  describe("Calendar variant - parent response", () => {
    it("shows parent response in calendar variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity({ parentResponse: "Well done!" })}
        />
      );
      expect(screen.getByText(/Well done!/)).toBeInTheDocument();
    });

    it("shows child note in calendar variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          activity={createActivity({ childNote: "I did great!" })}
        />
      );
      expect(screen.getByText('"I did great!"')).toBeInTheDocument();
    });

    it("shows parent response for approved items in list variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="list"
          activity={createActivity({
            status: "approved",
            parentResponse: "Good job",
          })}
        />
      );
      expect(screen.getByText(/💬/)).toBeInTheDocument();
      expect(screen.getByText(/Good job/)).toBeInTheDocument();
    });
  });

  describe("Child name display", () => {
    it("shows child name when showChildName is true in calendar variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          variant="calendar"
          showChildName={true}
          activity={createActivity({ childName: "Alice" })}
        />
      );
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
    });
  });

  describe("Type badge display", () => {
    it("shows type badge for parent in list variant", () => {
      render(
        <ActivityItem
          {...defaultProps}
          activity={createActivity()}
        />
      );
      // Type badge with icon and label for parent
      expect(screen.getByText(/star_transaction/)).toBeInTheDocument();
    });

    it("does not show type badge for child", () => {
      render(
        <ActivityItem
          {...defaultProps}
          permissions={childPermissions}
          showChildName={false}
          activity={createActivity()}
        />
      );
      expect(screen.queryByText("star_transaction")).not.toBeInTheDocument();
    });
  });
});
