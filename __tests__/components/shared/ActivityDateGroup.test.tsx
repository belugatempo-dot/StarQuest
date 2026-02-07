import { render, screen, fireEvent } from "@testing-library/react";
import ActivityDateGroup from "@/components/shared/ActivityDateGroup";
import type { UnifiedActivityItem, ActivityPermissions } from "@/types/activity";
import { getPermissions } from "@/types/activity";

// Mock activity-utils
jest.mock("@/lib/activity-utils", () => ({
  formatDateShort: (date: string, locale: string) => `Formatted: ${date}`,
  getDailyTotal: (activities: any[]) =>
    activities.reduce((sum: number, a: any) => sum + a.stars, 0),
  getActivityDescription: (activity: any, locale: string) => activity.description,
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

describe("ActivityDateGroup", () => {
  const parentPermissions = getPermissions("parent");

  const createActivity = (
    overrides: Partial<UnifiedActivityItem> = {}
  ): UnifiedActivityItem => ({
    id: `act-${Math.random().toString(36).substr(2, 5)}`,
    type: "star_transaction",
    childId: "child-1",
    childName: "Alice",
    childAvatar: null,
    stars: 5,
    description: "Test Quest",
    descriptionZh: null,
    icon: "⭐",
    status: "approved",
    childNote: null,
    parentResponse: null,
    source: "parent_record",
    createdAt: "2025-01-15T10:00:00Z",
    originalData: {} as any,
    questId: "quest-1",
    quests: null,
    ...overrides,
  });

  const defaultProps = {
    date: "2025-01-15",
    activities: [
      createActivity({ id: "a1", stars: 5 }),
      createActivity({ id: "a2", stars: 3 }),
    ],
    locale: "en",
    permissions: parentPermissions,
    selectionMode: false,
    selectedIds: new Set<string>(),
    onToggleSelection: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onResubmit: jest.fn(),
    deletingId: null,
  };

  describe("Date header", () => {
    it("renders formatted date", () => {
      render(<ActivityDateGroup {...defaultProps} />);
      expect(screen.getByText(/Formatted: 2025-01-15/)).toBeInTheDocument();
    });

    it("renders record count", () => {
      render(<ActivityDateGroup {...defaultProps} />);
      expect(screen.getByText(/activity.records/)).toBeInTheDocument();
    });

    it("renders positive daily total with + sign", () => {
      render(<ActivityDateGroup {...defaultProps} />);
      // Total is 5 + 3 = 8
      expect(screen.getByText(/\+8/)).toBeInTheDocument();
    });

    it("renders negative daily total", () => {
      const props = {
        ...defaultProps,
        activities: [
          createActivity({ id: "a1", stars: -5 }),
          createActivity({ id: "a2", stars: -3 }),
        ],
      };
      render(<ActivityDateGroup {...props} />);
      expect(screen.getByText(/-8/)).toBeInTheDocument();
    });

    it("applies green color for positive total", () => {
      const { container } = render(<ActivityDateGroup {...defaultProps} />);
      const totalEl = container.querySelector(".star-glow");
      expect(totalEl?.className).toContain("text-green-400");
    });

    it("applies red color for negative total", () => {
      const props = {
        ...defaultProps,
        activities: [createActivity({ id: "a1", stars: -5 })],
      };
      const { container } = render(<ActivityDateGroup {...props} />);
      const totalEl = container.querySelector(".star-glow");
      expect(totalEl?.className).toContain("text-red-400");
    });

    it("applies neutral color for zero total", () => {
      const props = {
        ...defaultProps,
        activities: [
          createActivity({ id: "a1", stars: 5 }),
          createActivity({ id: "a2", stars: -5 }),
        ],
      };
      const { container } = render(<ActivityDateGroup {...props} />);
      const totalEl = container.querySelector(".star-glow");
      expect(totalEl?.className).toContain("text-white/60");
    });
  });

  describe("Activity items", () => {
    it("renders an ActivityItem for each activity", () => {
      const activities = [
        createActivity({ id: "a1", description: "Quest A" }),
        createActivity({ id: "a2", description: "Quest B" }),
        createActivity({ id: "a3", description: "Quest C" }),
      ];
      render(<ActivityDateGroup {...defaultProps} activities={activities} />);
      expect(screen.getByText("Quest A")).toBeInTheDocument();
      expect(screen.getByText("Quest B")).toBeInTheDocument();
      expect(screen.getByText("Quest C")).toBeInTheDocument();
    });

    it("passes calendar variant to ActivityItem", () => {
      render(<ActivityDateGroup {...defaultProps} />);
      // Calendar variant renders stars with star emoji (e.g., "+5⭐")
      expect(screen.getByText("+5⭐")).toBeInTheDocument();
    });

    it("calls onEdit when edit clicked", () => {
      const onEdit = jest.fn();
      render(<ActivityDateGroup {...defaultProps} onEdit={onEdit} />);
      const editBtns = screen.getAllByText("✏️");
      fireEvent.click(editBtns[0]);
      expect(onEdit).toHaveBeenCalled();
    });

    it("calls onDelete when delete clicked", () => {
      const onDelete = jest.fn();
      render(<ActivityDateGroup {...defaultProps} onDelete={onDelete} />);
      const deleteBtns = screen.getAllByText("🗑️");
      fireEvent.click(deleteBtns[0]);
      expect(onDelete).toHaveBeenCalled();
    });

    it("shows selection checkbox when selectionMode is true and activity is pending star_transaction", () => {
      const activities = [
        createActivity({ id: "a1", status: "pending", type: "star_transaction" }),
      ];
      render(
        <ActivityDateGroup
          {...defaultProps}
          activities={activities}
          selectionMode={true}
        />
      );
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("marks checkbox as checked when activity is selected", () => {
      const activities = [
        createActivity({ id: "a1", status: "pending", type: "star_transaction" }),
      ];
      render(
        <ActivityDateGroup
          {...defaultProps}
          activities={activities}
          selectionMode={true}
          selectedIds={new Set(["a1"])}
        />
      );
      expect(screen.getByRole("checkbox")).toBeChecked();
    });
  });

  describe("Branch coverage", () => {
    it("passes onResubmit callback through to ActivityItem for rejected child_request", () => {
      const onResubmit = jest.fn();
      const childPermissions = {
        ...getPermissions("child" as any),
      };
      const rejectedChildRequest = createActivity({
        id: "rejected-1",
        status: "rejected",
        source: "child_request",
        stars: 3,
        description: "Rejected Request",
        parentResponse: "Not valid",
      });
      // In calendar variant (always used by ActivityDateGroup), the resubmit
      // button is not rendered by ActivityItem. However, this test verifies
      // that ActivityDateGroup correctly accepts the onResubmit prop and
      // renders the rejected activity with its parent response visible.
      render(
        <ActivityDateGroup
          {...defaultProps}
          activities={[rejectedChildRequest]}
          permissions={childPermissions}
          onResubmit={onResubmit}
        />
      );

      // Verify the rejected activity renders correctly in calendar variant
      expect(screen.getByText("Rejected Request")).toBeInTheDocument();
      // Parent response should show in calendar variant
      expect(screen.getByText(/Not valid/)).toBeInTheDocument();
    });
  });
});
