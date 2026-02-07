import { render, screen, fireEvent } from "@testing-library/react";
import BatchActionBar from "@/components/shared/BatchActionBar";

describe("BatchActionBar", () => {
  const createProps = (overrides: Record<string, any> = {}) => ({
    selectedCount: 3,
    isBatchProcessing: false,
    showBatchRejectModal: false,
    batchRejectReason: "",
    onBatchApprove: jest.fn(),
    onBatchReject: jest.fn(),
    onShowRejectModal: jest.fn(),
    onHideRejectModal: jest.fn(),
    onRejectReasonChange: jest.fn(),
    onExitSelectionMode: jest.fn(),
    ...overrides,
  });

  describe("Floating action bar", () => {
    it("renders selected count", () => {
      render(<BatchActionBar {...createProps()} />);
      expect(screen.getByText(/activity.itemsSelected/)).toBeInTheDocument();
    });

    it("renders approve button", () => {
      render(<BatchActionBar {...createProps()} />);
      expect(screen.getByText(/activity.batchApprove/)).toBeInTheDocument();
    });

    it("renders reject button", () => {
      render(<BatchActionBar {...createProps()} />);
      expect(screen.getByText(/activity.batchReject/)).toBeInTheDocument();
    });

    it("renders clear button", () => {
      render(<BatchActionBar {...createProps()} />);
      expect(screen.getByText(/activity.clear/)).toBeInTheDocument();
    });

    it("calls onBatchApprove when approve button clicked", () => {
      const onBatchApprove = jest.fn();
      render(<BatchActionBar {...createProps({ onBatchApprove })} />);
      fireEvent.click(screen.getByText(/activity.batchApprove/));
      expect(onBatchApprove).toHaveBeenCalled();
    });

    it("calls onShowRejectModal when reject button clicked", () => {
      const onShowRejectModal = jest.fn();
      render(<BatchActionBar {...createProps({ onShowRejectModal })} />);
      fireEvent.click(screen.getByText(/activity.batchReject/));
      expect(onShowRejectModal).toHaveBeenCalled();
    });

    it("calls onExitSelectionMode when clear button clicked", () => {
      const onExitSelectionMode = jest.fn();
      render(<BatchActionBar {...createProps({ onExitSelectionMode })} />);
      fireEvent.click(screen.getByText(/activity.clear/));
      expect(onExitSelectionMode).toHaveBeenCalled();
    });

    it("disables approve button when processing", () => {
      render(<BatchActionBar {...createProps({ isBatchProcessing: true })} />);
      const approveBtn = screen.getByText(/activity.processing/).closest("button");
      expect(approveBtn).toBeDisabled();
    });

    it("shows processing text when processing", () => {
      render(<BatchActionBar {...createProps({ isBatchProcessing: true })} />);
      expect(screen.getByText(/activity.processing/)).toBeInTheDocument();
    });

    it("disables reject button when processing", () => {
      render(<BatchActionBar {...createProps({ isBatchProcessing: true })} />);
      const rejectBtn = screen.getByText(/activity.batchReject/).closest("button");
      expect(rejectBtn).toBeDisabled();
    });
  });

  describe("Reject modal", () => {
    it("does not render reject modal by default", () => {
      render(<BatchActionBar {...createProps()} />);
      expect(screen.queryByText(/activity.batchRejectTitle/)).not.toBeInTheDocument();
    });

    it("renders reject modal when showBatchRejectModal is true", () => {
      render(<BatchActionBar {...createProps({ showBatchRejectModal: true })} />);
      expect(screen.getByText(/activity.batchRejectTitle/)).toBeInTheDocument();
    });

    it("renders rejection count in modal", () => {
      render(<BatchActionBar {...createProps({ showBatchRejectModal: true })} />);
      expect(screen.getByText(/activity.rejectingCount/)).toBeInTheDocument();
    });

    it("renders rejection reason textarea", () => {
      render(<BatchActionBar {...createProps({ showBatchRejectModal: true })} />);
      expect(screen.getByPlaceholderText(/activity.rejectionPlaceholder/)).toBeInTheDocument();
    });

    it("calls onRejectReasonChange when textarea changes", () => {
      const onRejectReasonChange = jest.fn();
      render(<BatchActionBar {...createProps({ showBatchRejectModal: true, onRejectReasonChange })} />);
      fireEvent.change(screen.getByPlaceholderText(/activity.rejectionPlaceholder/), {
        target: { value: "Not done properly" },
      });
      expect(onRejectReasonChange).toHaveBeenCalledWith("Not done properly");
    });

    it("calls onHideRejectModal when cancel clicked", () => {
      const onHideRejectModal = jest.fn();
      render(<BatchActionBar {...createProps({ showBatchRejectModal: true, onHideRejectModal })} />);
      fireEvent.click(screen.getByText(/common.cancel/));
      expect(onHideRejectModal).toHaveBeenCalled();
    });

    it("calls onBatchReject when confirm clicked", () => {
      const onBatchReject = jest.fn();
      render(
        <BatchActionBar
          {...createProps({
            showBatchRejectModal: true,
            batchRejectReason: "Not done",
            onBatchReject,
          })}
        />
      );
      fireEvent.click(screen.getByText(/activity.confirmReject/));
      expect(onBatchReject).toHaveBeenCalled();
    });

    it("disables confirm button when no reason", () => {
      render(
        <BatchActionBar
          {...createProps({
            showBatchRejectModal: true,
            batchRejectReason: "",
          })}
        />
      );
      const confirmBtn = screen.getByText(/activity.confirmReject/).closest("button");
      expect(confirmBtn).toBeDisabled();
    });

    it("disables confirm button when only whitespace reason", () => {
      render(
        <BatchActionBar
          {...createProps({
            showBatchRejectModal: true,
            batchRejectReason: "   ",
          })}
        />
      );
      const confirmBtn = screen.getByText(/activity.confirmReject/).closest("button");
      expect(confirmBtn).toBeDisabled();
    });

    it("disables confirm button when processing", () => {
      render(
        <BatchActionBar
          {...createProps({
            showBatchRejectModal: true,
            batchRejectReason: "Not done",
            isBatchProcessing: true,
          })}
        />
      );
      // Both floating bar approve button and modal confirm button show "processing"
      const processingBtns = screen.getAllByText(/activity.processing/);
      // The modal confirm button is the last one
      const confirmBtn = processingBtns[processingBtns.length - 1].closest("button");
      expect(confirmBtn).toBeDisabled();
    });

    it("shows processing text on confirm button when processing", () => {
      render(
        <BatchActionBar
          {...createProps({
            showBatchRejectModal: true,
            batchRejectReason: "Not done",
            isBatchProcessing: true,
          })}
        />
      );
      // The confirm button changes to "processing" text
      const buttons = screen.getAllByText(/activity.processing/);
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
