import { render, screen, fireEvent } from "@testing-library/react";
import ModalFrame from "@/components/ui/ModalFrame";

describe("ModalFrame", () => {
  const defaultProps = {
    title: "Test Modal",
    onClose: jest.fn(),
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title", () => {
    render(<ModalFrame {...defaultProps} />);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<ModalFrame {...defaultProps} />);
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<ModalFrame {...defaultProps} subtitle="Test subtitle" />);
    expect(screen.getByText("Test subtitle")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(<ModalFrame {...defaultProps} />);
    expect(screen.queryByText("Test subtitle")).not.toBeInTheDocument();
  });

  it("renders error banner when error provided", () => {
    render(<ModalFrame {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("does not render error banner when error is null", () => {
    render(<ModalFrame {...defaultProps} error={null} />);
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(<ModalFrame {...defaultProps} footer={<button>Save</button>} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("does not render footer when not provided", () => {
    const { container } = render(<ModalFrame {...defaultProps} />);
    // Footer div should not be present
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<ModalFrame {...defaultProps} />);
    fireEvent.click(screen.getByText("✕"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("applies max-w-md by default", () => {
    const { container } = render(<ModalFrame {...defaultProps} />);
    const modal = container.querySelector(".max-w-md");
    expect(modal).toBeInTheDocument();
  });

  it("applies max-w-sm when maxWidth is sm", () => {
    const { container } = render(<ModalFrame {...defaultProps} maxWidth="sm" />);
    const modal = container.querySelector(".max-w-sm");
    expect(modal).toBeInTheDocument();
  });

  it("applies max-w-2xl when maxWidth is lg", () => {
    const { container } = render(<ModalFrame {...defaultProps} maxWidth="lg" />);
    const modal = container.querySelector(".max-w-2xl");
    expect(modal).toBeInTheDocument();
  });

  it("adds overflow class when maxWidth is lg", () => {
    const { container } = render(<ModalFrame {...defaultProps} maxWidth="lg" />);
    const modal = container.querySelector(".overflow-y-auto");
    expect(modal).toBeInTheDocument();
  });

  it("adds sticky header when stickyHeader is true", () => {
    const { container } = render(<ModalFrame {...defaultProps} stickyHeader />);
    const sticky = container.querySelector(".sticky");
    expect(sticky).toBeInTheDocument();
  });
});
