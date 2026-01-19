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
});
