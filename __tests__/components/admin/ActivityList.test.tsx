import { render, screen } from "@testing-library/react";
import ActivityList from "@/components/admin/ActivityList";

// Mock the UnifiedActivityList component
jest.mock("@/components/shared/UnifiedActivityList", () => {
  return function MockUnifiedActivityList({ activities, locale, role }: any) {
    return (
      <div data-testid="unified-activity-list">
        <span data-testid="activity-count">{activities.length}</span>
        <span data-testid="locale">{locale}</span>
        <span data-testid="role">{role}</span>
      </div>
    );
  };
});

describe("ActivityList", () => {
  const mockActivity = {
    id: "act-1",
    type: "star_transaction" as const,
    childId: "child-1",
    childName: "Alice",
    childAvatar: null,
    stars: 5,
    description: "Brush teeth",
    descriptionZh: "刷牙",
    icon: "🪥",
    status: "approved" as const,
    note: "Done!",
    response: "Good job",
    createdAt: "2025-06-15T10:00:00Z",
    originalData: { quest_id: "quest-1", quests: { name_en: "Brush teeth", name_zh: "刷牙", icon: "🪥", category: "hygiene" } },
  };

  it("renders UnifiedActivityList with transformed activities", () => {
    render(<ActivityList activities={[mockActivity]} locale="en" />);
    expect(screen.getByTestId("unified-activity-list")).toBeInTheDocument();
    expect(screen.getByTestId("activity-count")).toHaveTextContent("1");
  });

  it("passes locale to UnifiedActivityList", () => {
    render(<ActivityList activities={[mockActivity]} locale="zh-CN" />);
    expect(screen.getByTestId("locale")).toHaveTextContent("zh-CN");
  });

  it("passes parent role to UnifiedActivityList", () => {
    render(<ActivityList activities={[mockActivity]} locale="en" />);
    expect(screen.getByTestId("role")).toHaveTextContent("parent");
  });

  it("renders with empty activities", () => {
    render(<ActivityList activities={[]} locale="en" />);
    expect(screen.getByTestId("activity-count")).toHaveTextContent("0");
  });

  it("transforms multiple activities", () => {
    const activities = [
      mockActivity,
      { ...mockActivity, id: "act-2", type: "redemption" as const },
    ];
    render(<ActivityList activities={activities} locale="en" />);
    expect(screen.getByTestId("activity-count")).toHaveTextContent("2");
  });

  it("handles activities without originalData (quest_id and quests fallback to null)", () => {
    const activityNoOriginal = {
      ...mockActivity,
      id: "act-3",
      originalData: undefined,
    };
    render(<ActivityList activities={[activityNoOriginal]} locale="en" />);
    expect(screen.getByTestId("activity-count")).toHaveTextContent("1");
  });

  it("handles originalData without quest_id or quests properties", () => {
    const activityPartialOriginal = {
      ...mockActivity,
      id: "act-4",
      originalData: { some_field: "value" },
    };
    render(<ActivityList activities={[activityPartialOriginal]} locale="en" />);
    expect(screen.getByTestId("activity-count")).toHaveTextContent("1");
  });
});
