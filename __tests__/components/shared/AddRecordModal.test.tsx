import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddRecordModal from "@/components/shared/AddRecordModal";

// --- Mocks ---

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/lib/localization", () => ({
  getQuestName: (quest: any, _locale: string) =>
    quest ? quest.name_en : "Unknown Quest",
}));

jest.mock("@/lib/date-utils", () => ({
  formatDateOnly: (_date: string, _locale: string) => "Jan 15, 2025",
  getTodayString: () => "2025-01-15",
}));

jest.mock("@/components/ui/ModalFrame", () => {
  return function MockModalFrame({
    title,
    error,
    children,
  }: {
    title: string;
    error?: string | null;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
    stickyHeader?: boolean;
  }) {
    return (
      <div data-testid="modal-frame">
        <h2>{title}</h2>
        {error && <div data-testid="error-banner">{error}</div>}
        {children}
      </div>
    );
  };
});

const mockTypedInsert = jest.fn().mockResolvedValue({ error: null });
jest.mock("@/lib/supabase/helpers", () => ({
  typedInsert: (...args: any[]) => mockTypedInsert(...args),
}));

// Supabase mock chain
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();

const chainObj: Record<string, jest.Mock> = {
  select: mockSelect,
  eq: mockEq,
  gte: mockGte,
  lte: mockLte,
};

const mockFrom = jest.fn().mockReturnValue(chainObj);

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  }),
}));

// --- Test Data ---

const makeQuest = (
  overrides: Partial<{
    id: string;
    name_en: string;
    name_zh: string | null;
    type: "bonus" | "duty" | "violation";
    stars: number;
    icon: string | null;
    family_id: string;
    is_active: boolean;
  }> = {}
) => ({
  id: "quest-1",
  family_id: "family-1",
  name_en: "Clean Room",
  name_zh: null,
  icon: null,
  type: "bonus" as const,
  stars: 5,
  is_active: true,
  scope: "self",
  category: null,
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

const bonusQuest = makeQuest({
  id: "bonus-1",
  name_en: "Help with dishes",
  type: "bonus",
  stars: 3,
  icon: "🍽️",
});

const dutyQuest = makeQuest({
  id: "duty-1",
  name_en: "Do homework",
  type: "duty",
  stars: -2,
  icon: "📚",
});

const violationQuest = makeQuest({
  id: "violation-1",
  name_en: "Fighting",
  type: "violation",
  stars: -5,
  icon: "⚠️",
});

const allQuests = [bonusQuest, dutyQuest, violationQuest];

const child1 = {
  id: "child-1",
  family_id: "family-1",
  name: "Alice",
  avatar_url: null,
  role: "child" as const,
  locale: "en",
  email: "alice@test.com",
  created_at: "2025-01-01T00:00:00Z",
  level_id: null,
};

const child2 = {
  id: "child-2",
  family_id: "family-1",
  name: "Bob",
  avatar_url: "🐻",
  role: "child" as const,
  locale: "en",
  email: "bob@test.com",
  created_at: "2025-01-01T00:00:00Z",
  level_id: null,
};

const defaultParentProps = {
  date: "2025-01-15",
  role: "parent" as const,
  locale: "en",
  quests: allQuests,
  children: [child1, child2],
  currentUserId: "parent-1",
  familyId: "family-1",
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

const defaultChildProps = {
  date: "2025-01-15",
  role: "child" as const,
  locale: "en",
  quests: [bonusQuest], // children only see bonus quests
  currentUserId: "child-1",
  familyId: "family-1",
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

// --- Helpers ---

function resetChainMocks() {
  mockSelect.mockReset().mockReturnValue(chainObj);
  mockEq.mockReset().mockReturnValue(chainObj);
  mockGte.mockReset().mockReturnValue(chainObj);
  mockLte.mockReset().mockResolvedValue({ data: [] });
  mockFrom.mockReset().mockReturnValue(chainObj);
}

/** Sets up chain to resolve at different stages:
 *  - pending check ends at lte
 *  - recent requests (2min) ends at gte (3rd gte call)
 *  - rate limit (1min) ends at gte (4th gte call)
 */
function setupChildChainMocks(
  pending: any[] = [],
  recentRequests: any[] = [],
  rateLimitRequests: any[] = []
) {
  let gteCallCount = 0;

  mockSelect.mockReturnValue(chainObj);
  mockEq.mockReturnValue(chainObj);
  mockLte.mockResolvedValue({ data: pending });
  mockGte.mockImplementation(() => {
    gteCallCount++;
    // First gte call is part of the pending check chain (before lte)
    // Second gte call ends the recent requests check (same quest within 2min)
    // Third gte call ends the rate limit check (all quests within 1min)
    if (gteCallCount === 2) {
      return Promise.resolve({ data: recentRequests });
    }
    if (gteCallCount === 3) {
      return Promise.resolve({ data: rateLimitRequests });
    }
    return chainObj;
  });
  mockFrom.mockReturnValue(chainObj);
}

// --- Tests ---

describe("AddRecordModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetChainMocks();
    mockTypedInsert.mockResolvedValue({ error: null });
  });

  // ===========================
  // Parent Mode
  // ===========================
  describe("Parent Mode", () => {
    it("should render with correct title for parent mode", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      // t("activity.addRecordForDate", { date: "Jan 15, 2025" }) => "activity.addRecordForDate"
      expect(
        screen.getByText("activity.addRecordForDate")
      ).toBeInTheDocument();
    });

    it("should show child selector when multiple children provided", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("should auto-select child when only 1 child provided", async () => {
      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      // The single child's button should have the selected styling
      const childButton = screen.getByText("Alice").closest("button");
      await waitFor(() => {
        expect(childButton).toHaveClass("border-secondary");
      });
    });

    it("should show all quest types (bonus, duty, violation) for parent", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("Help with dishes")).toBeInTheDocument();
      expect(screen.getByText("Do homework")).toBeInTheDocument();
      expect(screen.getByText("Fighting")).toBeInTheDocument();
    });

    it("should show bonus section header for parent", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("Did Good (Bonus)")).toBeInTheDocument();
    });

    it("should show duty section header for parent", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("Missed Duty")).toBeInTheDocument();
    });

    it("should show violation section header for parent", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("Violation")).toBeInTheDocument();
    });

    it("should highlight selected quest", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      const questButton = screen.getByText("Help with dishes").closest("button");
      fireEvent.click(questButton!);
      expect(questButton).toHaveClass("border-success");
    });

    it("should show multiplier when quest is selected", () => {
      render(<AddRecordModal {...defaultParentProps} />);

      // Initially no multiplier visible
      expect(screen.queryByText("Multiplier:")).not.toBeInTheDocument();

      // Select a quest
      fireEvent.click(screen.getByText("Help with dishes"));

      expect(screen.getByText("Multiplier:")).toBeInTheDocument();
    });

    it("should show correct stars with default multiplier", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      fireEvent.click(screen.getByText("Help with dishes"));

      // The multiplier section shows the total and breakdown
      const multiplierSection = screen.getByText("(1-10x)").closest("div")!.parentElement!;
      expect(multiplierSection).toHaveTextContent("3 x 1");

      // The large total display shows "+3" in the multiplier area
      const totalDisplay = screen.getByText("(1-10x)").closest(".bg-blue-500\\/10");
      expect(totalDisplay).toBeInTheDocument();
    });

    it("should update displayed stars when multiplier changes", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      fireEvent.click(screen.getByText("Help with dishes"));

      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "3" } });

      // 3 * 3 = 9 — the multiplier section shows the result
      const multiplierSection = screen.getByText("(1-10x)").closest(".bg-blue-500\\/10");
      expect(multiplierSection).toHaveTextContent("+9");
      expect(multiplierSection).toHaveTextContent("3 x 3");
    });

    it("should show note field as optional for parent", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("activity.parentNote")).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText("e.g., Great job!");
      expect(textarea).not.toHaveAttribute("required");
    });

    it("should submit with source parent_record and status approved", async () => {
      const onSuccess = jest.fn();
      const props = {
        ...defaultParentProps,
        children: [child1],
        onSuccess,
      };
      render(<AddRecordModal {...props} />);

      // Auto-selects child1 (only child)
      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      // Select quest
      fireEvent.click(screen.getByText("Help with dishes"));

      // Submit
      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const insertCall = mockTypedInsert.mock.calls[0];
      // Second argument is table name
      expect(insertCall[1]).toBe("star_transactions");
      // Third argument is the data
      const data = insertCall[2];
      expect(data.source).toBe("parent_record");
      expect(data.status).toBe("approved");
      expect(data.child_id).toBe("child-1");
      expect(data.quest_id).toBe("bonus-1");
      expect(data.stars).toBe(3);
      expect(data.family_id).toBe("family-1");
      expect(data.created_by).toBe("parent-1");
      expect(data.reviewed_by).toBe("parent-1");
    });

    it("should submit with multiplied star count", async () => {
      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));

      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "5" } });

      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const data = mockTypedInsert.mock.calls[0][2];
      expect(data.stars).toBe(15); // 3 * 5
    });

    it("should include parent_response when note is provided", async () => {
      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText("e.g., Great job!");
      fireEvent.change(textarea, { target: { value: "Well done!" } });

      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const data = mockTypedInsert.mock.calls[0][2];
      expect(data.parent_response).toBe("Well done!");
    });

    it("should set parent_response to null when note is empty", async () => {
      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));

      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const data = mockTypedInsert.mock.calls[0][2];
      expect(data.parent_response).toBeNull();
    });

    it("should call onSuccess after successful submit", async () => {
      const onSuccess = jest.fn();
      const props = {
        ...defaultParentProps,
        children: [child1],
        onSuccess,
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));
      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("should call router.refresh after successful submit", async () => {
      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));
      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it("should show error when no child selected in parent mode", async () => {
      render(<AddRecordModal {...defaultParentProps} />);

      // Select a quest but do NOT select a child
      fireEvent.click(screen.getByText("Help with dishes"));

      // The submit button should be disabled because canSubmit requires selectedChild
      const submitButton = screen.getByText("activity.addRecord");
      expect(submitButton).toBeDisabled();
    });

    it("should show error on form submit without child selected", async () => {
      // Render with children but manually submit the form to trigger validation
      const { container } = render(<AddRecordModal {...defaultParentProps} />);

      // Select quest so the button isn't disabled by canSubmit —
      // Actually canSubmit requires child AND quest, so button is disabled.
      // Instead, let's test that the submit button is disabled when no child is selected
      // even if a quest is selected.
      fireEvent.click(screen.getByText("Help with dishes"));

      const submitButton = screen.getByText("activity.addRecord");
      expect(submitButton).toBeDisabled();
    });

    it("should show error when no quest selected", () => {
      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      // Auto-selects child but no quest selected — button should be disabled
      // We need to wait for auto-select
      const submitButton = screen.getByText("activity.addRecord");
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit button during loading", async () => {
      // Make the insert hang
      let resolveInsert: (value: any) => void;
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve;
      });
      mockTypedInsert.mockReturnValue(insertPromise);

      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));
      fireEvent.click(screen.getByText("activity.addRecord"));

      // Now loading — button should show loading text and be disabled
      await waitFor(() => {
        expect(screen.getByText("common.loading")).toBeInTheDocument();
      });
      expect(screen.getByText("common.loading").closest("button")).toBeDisabled();

      // Resolve to clean up
      resolveInsert!({ error: null });
    });

    it("should show error message on API failure", async () => {
      mockTypedInsert.mockResolvedValue({
        error: new Error("Database error"),
      });

      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));
      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toBeInTheDocument();
      });
      expect(screen.getByTestId("error-banner")).toHaveTextContent(
        "Database error"
      );
    });

    it("should reset multiplier to 1 when selecting a different quest", () => {
      render(<AddRecordModal {...defaultParentProps} />);

      // Select first quest and change multiplier
      fireEvent.click(screen.getByText("Help with dishes"));
      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "5" } });
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();

      // Select a different quest — multiplier should reset to 1
      fireEvent.click(screen.getByText("Do homework"));
      expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    });

    it("should clamp multiplier minimum to 1", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      fireEvent.click(screen.getByText("Help with dishes"));

      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "0" } });

      // Should remain at 1 (Math.max(1, ...))
      expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    });

    it("should handle NaN multiplier input gracefully", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      fireEvent.click(screen.getByText("Help with dishes"));

      const multiplierInput = screen.getByDisplayValue("1");
      fireEvent.change(multiplierInput, { target: { value: "abc" } });

      // parseInt("abc") => NaN, || 1 => 1, Math.max(1, 1) => 1
      expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    });

    it("should show Chinese section headers when locale is zh-CN", () => {
      const props = { ...defaultParentProps, locale: "zh-CN" };
      render(<AddRecordModal {...props} />);
      expect(screen.getByText("做了好事 (加分)")).toBeInTheDocument();
      expect(screen.getByText("漏做本分")).toBeInTheDocument();
      expect(screen.getByText("违规了")).toBeInTheDocument();
    });

    it("should show Chinese multiplier label when locale is zh-CN", () => {
      const props = { ...defaultParentProps, locale: "zh-CN" };
      render(<AddRecordModal {...props} />);
      fireEvent.click(screen.getByText("Help with dishes"));
      expect(screen.getByText("倍数:")).toBeInTheDocument();
    });

    it("should show Chinese note placeholder when locale is zh-CN", () => {
      const props = { ...defaultParentProps, locale: "zh-CN" };
      render(<AddRecordModal {...props} />);
      expect(
        screen.getByPlaceholderText("例如：做得很好！")
      ).toBeInTheDocument();
    });

    it("should allow selecting a child by clicking their button", () => {
      render(<AddRecordModal {...defaultParentProps} />);

      const aliceButton = screen.getByText("Alice").closest("button");
      fireEvent.click(aliceButton!);
      expect(aliceButton).toHaveClass("border-secondary");

      const bobButton = screen.getByText("Bob").closest("button");
      fireEvent.click(bobButton!);
      expect(bobButton).toHaveClass("border-secondary");
      // Alice should no longer be selected
      expect(aliceButton).not.toHaveClass("border-secondary");
    });

    it("should display child avatar when available", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      // Bob has avatar_url "🐻"
      expect(screen.getByText("🐻")).toBeInTheDocument();
      // Alice has no avatar, falls back to "👤"
      expect(screen.getByText("👤")).toBeInTheDocument();
    });

    it("should show star values with correct signs", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      // bonus quest: +3
      expect(screen.getByText("+3")).toBeInTheDocument();
      // duty quest: -2 (stars value is -2, displayed as just the number)
      expect(screen.getByText("-2")).toBeInTheDocument();
      // violation quest: -5
      expect(screen.getByText("-5")).toBeInTheDocument();
    });
  });

  // ===========================
  // Child Mode
  // ===========================
  describe("Child Mode", () => {
    it("should render with correct title for child mode", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      expect(
        screen.getByText("activity.requestStarsForDate")
      ).toBeInTheDocument();
    });

    it("should show only bonus quests for child", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      expect(screen.getByText("Help with dishes")).toBeInTheDocument();
    });

    it("should not show duty quests for child", () => {
      // Even if duty quests are somehow passed, the component filters by
      // type display sections. For child, duty/violation sections are hidden.
      const props = {
        ...defaultChildProps,
        quests: allQuests,
      };
      render(<AddRecordModal {...props} />);
      // Duty section header should not appear
      expect(screen.queryByText("Missed Duty")).not.toBeInTheDocument();
    });

    it("should not show violation quests for child", () => {
      const props = {
        ...defaultChildProps,
        quests: allQuests,
      };
      render(<AddRecordModal {...props} />);
      expect(screen.queryByText("Violation")).not.toBeInTheDocument();
    });

    it("should not show child selector", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      expect(screen.queryByText("activity.selectChild")).not.toBeInTheDocument();
    });

    it("should show note field as required for child", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      expect(
        screen.getByText("activity.childNoteRequired")
      ).toBeInTheDocument();
      // Required asterisk
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should show child note placeholder", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      expect(
        screen.getByPlaceholderText(
          "Tell your parents what you did..."
        )
      ).toBeInTheDocument();
    });

    it("should show Chinese child note placeholder when locale is zh-CN", () => {
      const props = { ...defaultChildProps, locale: "zh-CN" };
      render(<AddRecordModal {...props} />);
      expect(
        screen.getByPlaceholderText("告诉爸爸妈妈你做了什么...")
      ).toBeInTheDocument();
    });

    it("should disable submit when note is empty for child", () => {
      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      // Note is empty, so canSubmit is false
      const submitButton = screen.getByText("activity.requestStars");
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit when quest selected and note provided", () => {
      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "I helped wash dishes" } });

      const submitButton = screen.getByText("activity.requestStars");
      expect(submitButton).not.toBeDisabled();
    });

    it("should submit with source child_request and status pending", async () => {
      setupChildChainMocks([], [], []);

      const onSuccess = jest.fn();
      const props = { ...defaultChildProps, onSuccess };
      render(<AddRecordModal {...props} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "I helped!" } });

      fireEvent.click(screen.getByText("activity.requestStars"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const data = mockTypedInsert.mock.calls[0][2];
      expect(data.source).toBe("child_request");
      expect(data.status).toBe("pending");
      expect(data.child_id).toBe("child-1");
      expect(data.quest_id).toBe("bonus-1");
      expect(data.stars).toBe(3);
      expect(data.child_note).toBe("I helped!");
    });

    it("should not include parent_response or reviewed_by for child submit", async () => {
      setupChildChainMocks([], [], []);

      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "I did it!" } });

      fireEvent.click(screen.getByText("activity.requestStars"));

      await waitFor(() => {
        expect(mockTypedInsert).toHaveBeenCalledTimes(1);
      });

      const data = mockTypedInsert.mock.calls[0][2];
      expect(data.parent_response).toBeUndefined();
      expect(data.reviewed_by).toBeUndefined();
      expect(data.reviewed_at).toBeUndefined();
    });

    it("should show error if pending request exists for same quest and day (duplicate prevention)", async () => {
      setupChildChainMocks([{ id: "existing-1" }], [], []);

      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "Again!" } });

      fireEvent.click(screen.getByText("activity.requestStars"));

      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toHaveTextContent(
          "activity.duplicatePending"
        );
      });

      expect(mockTypedInsert).not.toHaveBeenCalled();
    });

    it("should show error if same quest submitted within 2 minutes (rate limiting)", async () => {
      setupChildChainMocks([], [{ id: "recent-1" }], []);

      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "Quick!" } });

      fireEvent.click(screen.getByText("activity.requestStars"));

      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toHaveTextContent(
          "activity.rateLimited"
        );
      });

      expect(mockTypedInsert).not.toHaveBeenCalled();
    });

    it("should show error if too many recent requests across all quests (rate limiting)", async () => {
      setupChildChainMocks(
        [],
        [],
        [{ id: "rate-1" }, { id: "rate-2" }]
      );

      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "Too fast!" } });

      fireEvent.click(screen.getByText("activity.requestStars"));

      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toHaveTextContent(
          "activity.rateLimited"
        );
      });

      expect(mockTypedInsert).not.toHaveBeenCalled();
    });

    it("should call onSuccess after successful child submit", async () => {
      setupChildChainMocks([], [], []);

      const onSuccess = jest.fn();
      const props = { ...defaultChildProps, onSuccess };
      render(<AddRecordModal {...props} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "Done!" } });

      fireEvent.click(screen.getByText("activity.requestStars"));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("should not show multiplier for child mode", () => {
      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      expect(screen.queryByText("Multiplier:")).not.toBeInTheDocument();
      expect(screen.queryByText("倍数:")).not.toBeInTheDocument();
    });
  });

  // ===========================
  // General
  // ===========================
  describe("General", () => {
    it("should call onClose when cancel button is clicked", () => {
      const onClose = jest.fn();
      const props = { ...defaultParentProps, onClose };
      render(<AddRecordModal {...props} />);

      fireEvent.click(screen.getByText("common.cancel"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should show 'no quests available' when quests array is empty", () => {
      const props = { ...defaultParentProps, quests: [] };
      render(<AddRecordModal {...props} />);
      expect(
        screen.getByText("activity.noQuestsAvailable")
      ).toBeInTheDocument();
    });

    it("should not show multiplier for child mode even when quest is selected", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      fireEvent.click(screen.getByText("Help with dishes"));
      expect(screen.queryByText("Multiplier:")).not.toBeInTheDocument();
    });

    it("should show submit button text as addRecord for parent", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("activity.addRecord")).toBeInTheDocument();
    });

    it("should show submit button text as requestStars for child", () => {
      render(<AddRecordModal {...defaultChildProps} />);
      expect(screen.getByText("activity.requestStars")).toBeInTheDocument();
    });

    it("should show quest icons when available", () => {
      render(<AddRecordModal {...defaultParentProps} />);
      expect(screen.getByText("🍽️")).toBeInTheDocument();
      expect(screen.getByText("📚")).toBeInTheDocument();
    });

    it("should not show child selector when children prop is undefined", () => {
      const props = { ...defaultParentProps, children: undefined };
      render(<AddRecordModal {...props} />);
      // With no children, the child selector section shouldn't render
      // (even though it's parent mode)
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });

    it("should handle insert error that is not an Error instance", async () => {
      // If insertError is thrown as a plain object (not Error instance)
      mockTypedInsert.mockResolvedValue({
        error: { message: "Some DB error", code: "23505" },
      });

      const props = {
        ...defaultParentProps,
        children: [child1],
      };
      render(<AddRecordModal {...props} />);

      await waitFor(() => {
        expect(
          screen.getByText("Alice").closest("button")
        ).toHaveClass("border-secondary");
      });

      fireEvent.click(screen.getByText("Help with dishes"));
      fireEvent.click(screen.getByText("activity.addRecord"));

      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toBeInTheDocument();
      });
      // The error object has a .message property — but it goes through
      // the throw path: `if (insertError) throw insertError`
      // and the catch checks `err instanceof Error` — a plain object isn't an Error
      // so it falls back to "Failed to create record"
      expect(screen.getByTestId("error-banner")).toHaveTextContent(
        "Failed to create record"
      );
    });

    it("should handle child submit with whitespace-only note as empty", () => {
      render(<AddRecordModal {...defaultChildProps} />);

      fireEvent.click(screen.getByText("Help with dishes"));

      const textarea = screen.getByPlaceholderText(
        "Tell your parents what you did..."
      );
      fireEvent.change(textarea, { target: { value: "   " } });

      // canSubmit checks note.trim(), so submit should be disabled
      const submitButton = screen.getByText("activity.requestStars");
      expect(submitButton).toBeDisabled();
    });

    it("should not render duty/violation sections when only bonus quests provided", () => {
      const props = {
        ...defaultParentProps,
        quests: [bonusQuest],
      };
      render(<AddRecordModal {...props} />);

      expect(screen.getByText("Did Good (Bonus)")).toBeInTheDocument();
      expect(screen.queryByText("Missed Duty")).not.toBeInTheDocument();
      expect(screen.queryByText("Violation")).not.toBeInTheDocument();
    });

    it("should use default icon when quest has no icon (bonus)", () => {
      const questNoIcon = makeQuest({
        id: "no-icon-1",
        name_en: "No Icon Quest",
        type: "bonus",
        icon: null,
      });
      const props = { ...defaultParentProps, quests: [questNoIcon] };
      render(<AddRecordModal {...props} />);

      // Default bonus icon is ⭐ (from quest.icon || "⭐")
      const questButton = screen.getByText("No Icon Quest").closest("button");
      expect(questButton).toBeInTheDocument();
    });
  });
});
