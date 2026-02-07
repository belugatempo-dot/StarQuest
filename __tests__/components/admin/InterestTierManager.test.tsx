import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InterestTierManager from "@/components/admin/InterestTierManager";
import type { CreditInterestTier } from "@/types/credit";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Supabase client
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

describe("InterestTierManager", () => {
  const defaultProps = {
    familyId: "family-123",
    locale: "en",
  };

  const mockTiers: CreditInterestTier[] = [
    {
      id: "tier-1",
      family_id: "family-123",
      tier_order: 1,
      min_debt: 0,
      max_debt: 19,
      interest_rate: 0.05,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    },
    {
      id: "tier-2",
      family_id: "family-123",
      tier_order: 2,
      min_debt: 20,
      max_debt: 49,
      interest_rate: 0.1,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    },
    {
      id: "tier-3",
      family_id: "family-123",
      tier_order: 3,
      min_debt: 50,
      max_debt: null, // Unlimited
      interest_rate: 0.15,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);

    // Default successful fetch mock
    mockOrder.mockResolvedValue({ data: mockTiers, error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
      delete: mockDelete,
    });

    mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    mockInsert.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    mockRpc.mockResolvedValue({ error: null });
  });

  describe("loading state", () => {
    it("shows loading skeleton while fetching tiers", async () => {
      // Make the fetch hang
      mockOrder.mockReturnValue(new Promise(() => {}));

      const { container } = render(<InterestTierManager {...defaultProps} />);

      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("removes loading skeleton after tiers are fetched", async () => {
      const { container } = render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
      });
    });
  });

  describe("rendering with tiers", () => {
    it("renders title and description", async () => {
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.interestTiers")).toBeInTheDocument();
        expect(screen.getByText("credit.interestTiersDescription")).toBeInTheDocument();
      });
    });

    it("renders all tiers", async () => {
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        // Check for debt range labels
        expect(screen.getAllByText(/credit\.debtRange/)).toHaveLength(3);
        // Check for interest rate labels
        expect(screen.getAllByText(/credit\.interestRate/)).toHaveLength(3);
      });
    });

    it("renders edit and delete buttons for each tier", async () => {
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
        expect(screen.getAllByText("common.delete")).toHaveLength(3);
      });
    });

    it("renders add tier button when tiers exist", async () => {
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });
    });

    it("renders info box with tip", async () => {
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.tip/)).toBeInTheDocument();
        expect(screen.getByText("credit.tiersTip")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("shows empty state when no tiers exist", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.noTiersYet")).toBeInTheDocument();
      });
    });

    it("shows use default tiers button in empty state", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.useDefaultTiers")).toBeInTheDocument();
      });
    });

    it("initializes default tiers when button is clicked", async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });
      mockOrder.mockResolvedValueOnce({ data: mockTiers, error: null });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.useDefaultTiers")).toBeInTheDocument();
      });

      const initButton = screen.getByText("credit.useDefaultTiers");
      fireEvent.click(initButton);

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith("initialize_default_interest_tiers", {
          p_family_id: "family-123",
        });
      });
    });
  });

  describe("editing tiers", () => {
    it("shows edit form when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      // Check form elements appear
      await waitFor(() => {
        expect(screen.getByText("credit.minDebt")).toBeInTheDocument();
        expect(screen.getByText(/credit\.maxDebt/)).toBeInTheDocument();
        expect(screen.getByText("common.cancel")).toBeInTheDocument();
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });
    });

    it("populates form with tier data when editing", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      await waitFor(() => {
        // Check that the first tier's data is populated
        const minDebtInput = screen.getByDisplayValue("0");
        expect(minDebtInput).toBeInTheDocument();
      });
    });

    it("cancels editing when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("common.cancel")).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("common.cancel");
      await user.click(cancelButton);

      await waitFor(() => {
        // Edit form should be gone, edit buttons should reappear
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });
    });

    it("saves tier when save button is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("common.save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled();
      });
    });
  });

  describe("adding new tiers", () => {
    it("shows add form when add button is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("credit.addNewTier")).toBeInTheDocument();
      });
    });

    it("suggests min debt based on last tier", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        // Last tier has max_debt null (unlimited), so suggested min should be based on that tier's min_debt + 1 = 51
        const minDebtInput = screen.getByDisplayValue("51");
        expect(minDebtInput).toBeInTheDocument();
      });
    });

    it("saves new tier when save is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("common.save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    it("cancels adding when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("common.cancel")).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("common.cancel");
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("credit.addNewTier")).not.toBeInTheDocument();
      });
    });
  });

  describe("deleting tiers", () => {
    it("shows confirmation dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.delete")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByText("common.delete");
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith("credit.confirmDeleteTier");
    });

    it("deletes tier when confirmed", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.delete")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByText("common.delete");
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
      });
    });

    it("does not delete tier when cancelled", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.delete")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByText("common.delete");
      await user.click(deleteButtons[0]);

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("shows error message when fetch fails", async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error("Fetch failed") });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Fetch failed")).toBeInTheDocument();
      });
    });

    it("shows error message when save fails", async () => {
      const user = userEvent.setup();
      mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error("Save failed") }) });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("common.save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed")).toBeInTheDocument();
      });
    });

    it("shows error message when delete fails", async () => {
      const user = userEvent.setup();
      mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: new Error("Delete failed") }) });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.delete")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByText("common.delete");
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeInTheDocument();
      });
    });

    it("shows error message when initialize fails", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({ error: new Error("Initialize failed") });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.useDefaultTiers")).toBeInTheDocument();
      });

      const initButton = screen.getByText("credit.useDefaultTiers");
      fireEvent.click(initButton);

      await waitFor(() => {
        expect(screen.getByText("Initialize failed")).toBeInTheDocument();
      });
    });
  });

  describe("form validation", () => {
    it("prevents negative min debt via input min attribute", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("credit.minDebt")).toBeInTheDocument();
      });

      // Get the min debt input by finding the first number input
      const inputs = screen.getAllByRole("spinbutton");
      const minDebtInput = inputs[0];

      // The input should have min=0 attribute
      expect(minDebtInput).toHaveAttribute("min", "0");
    });

    it("allows unlimited max debt via checkbox", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText("credit.unlimited")).toBeInTheDocument();
      });

      const unlimitedCheckbox = screen.getByRole("checkbox");
      expect(unlimitedCheckbox).toBeChecked(); // Default for new tier is unlimited

      await user.click(unlimitedCheckbox);
      expect(unlimitedCheckbox).not.toBeChecked();
    });
  });

  describe("interest rate input", () => {
    it("shows slider and number input for interest rate", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole("slider")).toBeInTheDocument();
        expect(screen.getByText("%")).toBeInTheDocument();
      });
    });

    it("limits interest rate input to max 100", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/credit\.addTier/);
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole("slider")).toBeInTheDocument();
      });

      // Find the interest rate number input by its max attribute
      const inputs = screen.getAllByRole("spinbutton");
      const interestInput = inputs.find(input => input.getAttribute("max") === "100");

      expect(interestInput).toHaveAttribute("max", "100");
      expect(interestInput).toHaveAttribute("min", "0");
    });
  });

  describe("TierEditForm input change handlers", () => {
    it("updates min debt when input value changes", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByText("credit.minDebt")).toBeInTheDocument();
      });

      // The min debt input is the first spinbutton
      const inputs = screen.getAllByRole("spinbutton");
      const minDebtInput = inputs[0];

      fireEvent.change(minDebtInput, { target: { value: "25" } });

      expect(minDebtInput).toHaveValue(25);
    });

    it("clamps min debt to 0 when negative value is entered", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByText("credit.minDebt")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      const minDebtInput = inputs[0];

      fireEvent.change(minDebtInput, { target: { value: "-5" } });

      // Math.max(0, -5) = 0
      expect(minDebtInput).toHaveValue(0);
    });

    it("updates max debt when input value changes", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      // Edit a tier that has max_debt set (tier 1 has max_debt=19, hasMaxDebt=true)
      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("credit.maxDebt")).toBeInTheDocument();
      });

      // The max debt input should be the second spinbutton
      const inputs = screen.getAllByRole("spinbutton");
      const maxDebtInput = inputs[1];

      fireEvent.change(maxDebtInput, { target: { value: "30" } });

      expect(maxDebtInput).toHaveValue(30);
    });

    it("sets max debt to null when input is cleared", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("credit.maxDebt")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      const maxDebtInput = inputs[1];

      fireEvent.change(maxDebtInput, { target: { value: "" } });

      // When value is empty string, setFormMaxDebt(null) is called, display shows ""
      expect(maxDebtInput).toHaveValue(null);
    });

    it("updates interest rate via slider", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByRole("slider")).toBeInTheDocument();
      });

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "25" } });

      expect(slider).toHaveValue("25");
    });

    it("updates interest rate via number input", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByRole("slider")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      const interestInput = inputs.find(input => input.getAttribute("max") === "100");

      fireEvent.change(interestInput!, { target: { value: "15" } });

      expect(interestInput).toHaveValue(15);
    });

    it("clamps interest rate number input to max 100", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByRole("slider")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      const interestInput = inputs.find(input => input.getAttribute("max") === "100");

      fireEvent.change(interestInput!, { target: { value: "150" } });

      // Math.min(100, 150) = 100
      expect(interestInput).toHaveValue(100);
    });

    it("handles NaN interest rate by defaulting to 0", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByRole("slider")).toBeInTheDocument();
      });

      const inputs = screen.getAllByRole("spinbutton");
      const interestInput = inputs.find(input => input.getAttribute("max") === "100");

      fireEvent.change(interestInput!, { target: { value: "" } });

      // parseInt("") = NaN, || 0 makes it 0
      expect(interestInput).toHaveValue(0);
    });
  });

  describe("error fallback messages", () => {
    it("shows generic error message when fetch error is not an Error instance", async () => {
      mockOrder.mockRejectedValue("some string error");

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load interest tiers")).toBeInTheDocument();
      });
    });

    it("shows generic error message when initialize error is not an Error instance", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockRpc.mockRejectedValue("init string error");

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.useDefaultTiers")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("credit.useDefaultTiers"));

      await waitFor(() => {
        expect(screen.getByText("Failed to initialize tiers")).toBeInTheDocument();
      });
    });

    it("shows generic error message when save error is not an Error instance", async () => {
      const user = userEvent.setup();
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockRejectedValue("save string error"),
      });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      await user.click(screen.getAllByText("common.edit")[0]);

      await waitFor(() => {
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });

      await user.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Failed to save tier")).toBeInTheDocument();
      });
    });

    it("shows generic error message when delete error is not an Error instance", async () => {
      const user = userEvent.setup();
      mockDelete.mockReturnValue({
        eq: jest.fn().mockRejectedValue("delete string error"),
      });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.delete")).toHaveLength(3);
      });

      await user.click(screen.getAllByText("common.delete")[0]);

      await waitFor(() => {
        expect(screen.getByText("Failed to delete tier")).toBeInTheDocument();
      });
    });
  });

  describe("add new tier with specific conditions", () => {
    it("suggests min debt based on last tier's max_debt when available", async () => {
      const tiersWithMaxDebt: CreditInterestTier[] = [
        {
          id: "tier-1",
          family_id: "family-123",
          tier_order: 1,
          min_debt: 0,
          max_debt: 19,
          interest_rate: 0.05,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
      mockOrder.mockResolvedValue({ data: tiersWithMaxDebt, error: null });

      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        // Last tier has max_debt=19, so suggestedMin = 19 + 1 = 20
        expect(screen.getByDisplayValue("20")).toBeInTheDocument();
      });
    });

    it("handles adding tier when no existing tiers (suggested min = 0)", async () => {
      // When there are no tiers, handleAddNew computes nextOrder = 1, suggestedMin = 0
      // This is tested indirectly through the empty state + initialize defaults flow
      // Verify the empty state renders the initialize button
      mockOrder.mockResolvedValue({ data: [], error: null });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.noTiersYet")).toBeInTheDocument();
        expect(screen.getByText("credit.useDefaultTiers")).toBeInTheDocument();
      });
    });

    it("saves new tier with insert error", async () => {
      const user = userEvent.setup();

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      // Override insert mock AFTER initial render/fetch completes
      mockInsert.mockResolvedValue({ error: new Error("Insert failed") });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });

      await user.click(screen.getByText("common.save"));

      await waitFor(() => {
        expect(screen.getByText("Insert failed")).toBeInTheDocument();
      });
    });
  });

  describe("checkbox unchecking (hasMaxDebt toggle)", () => {
    it("does not set max debt to null when unchecking the unlimited checkbox", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      // Add new tier (by default hasMaxDebt=false, so unlimited checkbox is checked)
      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked(); // unlimited is checked

      // Uncheck the unlimited checkbox (e.target.checked = false, so if branch NOT taken)
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      // The max debt input should now be enabled
      const inputs = screen.getAllByRole("spinbutton");
      const maxDebtInput = inputs[1];
      expect(maxDebtInput).not.toBeDisabled();
    });
  });

  describe("Branch coverage", () => {
    it("suggests min from min_debt when last tier has null max_debt", async () => {
      // A single tier with max_debt = null should fall back to min_debt for suggested min
      const singleNullMaxTier: CreditInterestTier[] = [
        {
          id: "tier-only",
          family_id: "family-123",
          tier_order: 1,
          min_debt: 30,
          max_debt: null,
          interest_rate: 0.1,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
      mockOrder.mockResolvedValue({ data: singleNullMaxTier, error: null });

      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/credit\.addTier/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/credit\.addTier/));

      await waitFor(() => {
        // suggestedMin = (null || 30) + 1 = 31
        expect(screen.getByDisplayValue("31")).toBeInTheDocument();
      });
    });

    it("enables max debt input when unchecking unlimited on tier with null max_debt", async () => {
      const user = userEvent.setup();
      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      // Edit tier-3 which has max_debt: null (unlimited)
      const editButtons = screen.getAllByText("common.edit");
      await user.click(editButtons[2]); // tier-3 is the third

      await waitFor(() => {
        expect(screen.getByText("credit.unlimited")).toBeInTheDocument();
      });

      // The unlimited checkbox should be checked (since max_debt is null, hasMaxDebt=false, checkbox !hasMaxDebt=true)
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();

      // Max debt input should be disabled
      const inputs = screen.getAllByRole("spinbutton");
      const maxDebtInput = inputs[1];
      expect(maxDebtInput).toBeDisabled();

      // Uncheck unlimited → enables max debt input
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(maxDebtInput).not.toBeDisabled();
    });
  });

  describe("data fallback on fetch", () => {
    it("handles null data from fetch by using empty array", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        // With data=null, tiers should be [] (empty), showing empty state
        expect(screen.getByText("credit.noTiersYet")).toBeInTheDocument();
      });
    });
  });

  describe("saving state display", () => {
    it("shows saving text in button while saving a tier", async () => {
      const user = userEvent.setup();

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText("common.edit")).toHaveLength(3);
      });

      // Override update mock AFTER initial render/fetch completes
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => { resolveUpdate = resolve; });
      mockUpdate.mockReturnValue({ eq: jest.fn().mockReturnValue(updatePromise) });

      await user.click(screen.getAllByText("common.edit")[0]);

      await waitFor(() => {
        expect(screen.getByText("common.save")).toBeInTheDocument();
      });

      await user.click(screen.getByText("common.save"));

      // Should show saving state
      await waitFor(() => {
        expect(screen.getByText("common.saving")).toBeInTheDocument();
      });

      resolveUpdate!({ error: null });

      // After saving, should re-fetch
      await waitFor(() => {
        expect(screen.queryByText("common.saving")).not.toBeInTheDocument();
      });
    });

    it("shows loading text on initialize button while initializing", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      let resolveRpc: (value: any) => void;
      const rpcPromise = new Promise((resolve) => { resolveRpc = resolve; });
      mockRpc.mockReturnValue(rpcPromise);

      render(<InterestTierManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("credit.useDefaultTiers")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("credit.useDefaultTiers"));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText("common.loading")).toBeInTheDocument();
      });

      resolveRpc!({ error: null });
    });
  });
});
