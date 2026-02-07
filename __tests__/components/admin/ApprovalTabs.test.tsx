import { render, screen, fireEvent } from "@testing-library/react";
import ApprovalTabs from "@/components/admin/ApprovalTabs";

// Mock child components
jest.mock("@/components/admin/StarRequestList", () => {
  return function MockStarRequestList({ requests }: any) {
    return <div data-testid="star-request-list">StarRequestList ({requests.length})</div>;
  };
});

jest.mock("@/components/admin/RedemptionRequestList", () => {
  return function MockRedemptionRequestList({ requests }: any) {
    return <div data-testid="redemption-request-list">RedemptionRequestList ({requests.length})</div>;
  };
});

describe("ApprovalTabs", () => {
  const defaultProps = {
    starRequests: [{ id: "sr-1" }, { id: "sr-2" }],
    redemptionRequests: [{ id: "rr-1" }],
    locale: "en",
    parentId: "parent-1",
  };

  it("renders both tab buttons", () => {
    render(<ApprovalTabs {...defaultProps} />);
    expect(screen.getByText(/admin.starRequests/)).toBeInTheDocument();
    expect(screen.getByText(/admin.redemptionRequests/)).toBeInTheDocument();
  });

  it("shows star request count badge", () => {
    render(<ApprovalTabs {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows redemption request count badge", () => {
    render(<ApprovalTabs {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows star requests tab by default", () => {
    render(<ApprovalTabs {...defaultProps} />);
    expect(screen.getByTestId("star-request-list")).toBeInTheDocument();
    expect(screen.queryByTestId("redemption-request-list")).not.toBeInTheDocument();
  });

  it("switches to redemption requests on tab click", () => {
    render(<ApprovalTabs {...defaultProps} />);
    fireEvent.click(screen.getByText(/admin.redemptionRequests/));
    expect(screen.getByTestId("redemption-request-list")).toBeInTheDocument();
    expect(screen.queryByTestId("star-request-list")).not.toBeInTheDocument();
  });

  it("switches back to star requests tab", () => {
    render(<ApprovalTabs {...defaultProps} />);
    fireEvent.click(screen.getByText(/admin.redemptionRequests/));
    fireEvent.click(screen.getByText(/admin.starRequests/));
    expect(screen.getByTestId("star-request-list")).toBeInTheDocument();
  });

  it("highlights active stars tab", () => {
    render(<ApprovalTabs {...defaultProps} />);
    const starsButton = screen.getByText(/admin.starRequests/).closest("button");
    expect(starsButton).toHaveClass("bg-secondary");
  });

  it("highlights active redemptions tab when selected", () => {
    render(<ApprovalTabs {...defaultProps} />);
    fireEvent.click(screen.getByText(/admin.redemptionRequests/));
    const redemptionsButton = screen.getByText(/admin.redemptionRequests/).closest("button");
    expect(redemptionsButton).toHaveClass("bg-secondary");
  });
});
