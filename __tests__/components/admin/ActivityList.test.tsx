import { render, screen } from "@testing-library/react";
import ActivityList from "@/components/admin/ActivityList";

// Capture props passed to UnifiedActivityList
let capturedProps: any = null;

jest.mock("@/components/shared/UnifiedActivityList", () => {
  return function MockUnifiedActivityList(props: any) {
    capturedProps = props;
    return (
      <div data-testid="unified-activity-list">
        <span data-testid="activity-count">{props.activities.length}</span>
        <span data-testid="locale">{props.locale}</span>
        <span data-testid="role">{props.role}</span>
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

  beforeEach(() => {
    capturedProps = null;
  });

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

  describe("field-level transformation", () => {
    it("maps note to childNote and response to parentResponse", () => {
      render(<ActivityList activities={[mockActivity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.childNote).toBe("Done!");
      expect(transformed.parentResponse).toBe("Good job");
    });

    it("sets source to null", () => {
      render(<ActivityList activities={[mockActivity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.source).toBeNull();
    });

    it("extracts questId from originalData.quest_id", () => {
      render(<ActivityList activities={[mockActivity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.questId).toBe("quest-1");
    });

    it("extracts quests from originalData.quests", () => {
      render(<ActivityList activities={[mockActivity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.quests).toEqual({
        name_en: "Brush teeth",
        name_zh: "刷牙",
        icon: "🪥",
        category: "hygiene",
      });
    });

    it("preserves all passthrough fields unchanged", () => {
      render(<ActivityList activities={[mockActivity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.id).toBe("act-1");
      expect(transformed.type).toBe("star_transaction");
      expect(transformed.childId).toBe("child-1");
      expect(transformed.childName).toBe("Alice");
      expect(transformed.childAvatar).toBeNull();
      expect(transformed.stars).toBe(5);
      expect(transformed.description).toBe("Brush teeth");
      expect(transformed.descriptionZh).toBe("刷牙");
      expect(transformed.icon).toBe("🪥");
      expect(transformed.status).toBe("approved");
      expect(transformed.createdAt).toBe("2025-06-15T10:00:00Z");
    });

    it("passes originalData through as-is", () => {
      render(<ActivityList activities={[mockActivity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.originalData).toBe(mockActivity.originalData);
    });

    it("sets questId to null when originalData is undefined", () => {
      const activity = { ...mockActivity, originalData: undefined };
      render(<ActivityList activities={[activity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.questId).toBeNull();
      expect(transformed.quests).toBeNull();
    });

    it("sets questId to null when originalData lacks quest_id", () => {
      const activity = { ...mockActivity, originalData: { other: "data" } };
      render(<ActivityList activities={[activity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.questId).toBeNull();
      expect(transformed.quests).toBeNull();
    });

    it("maps null note and response correctly", () => {
      const activity = { ...mockActivity, note: null, response: null };
      render(<ActivityList activities={[activity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.childNote).toBeNull();
      expect(transformed.parentResponse).toBeNull();
    });

    it("handles childAvatar when provided", () => {
      const activity = { ...mockActivity, childAvatar: "https://example.com/avatar.png" };
      render(<ActivityList activities={[activity]} locale="en" />);
      const transformed = capturedProps.activities[0];
      expect(transformed.childAvatar).toBe("https://example.com/avatar.png");
    });
  });
});
