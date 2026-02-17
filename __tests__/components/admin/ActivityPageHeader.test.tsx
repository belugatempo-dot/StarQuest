import { render, screen, fireEvent } from "@testing-library/react";
import ActivityPageHeader from "@/components/admin/ActivityPageHeader";

// Mock GenerateReportModal
jest.mock("@/components/admin/GenerateReportModal", () => {
  return function MockModal(props: any) {
    return (
      <div data-testid="generate-report-modal">
        <button onClick={props.onClose} data-testid="modal-close">Close</button>
      </div>
    );
  };
});

describe("ActivityPageHeader", () => {
  const defaultProps = {
    locale: "en",
  };

  it("renders the header title in English", () => {
    render(<ActivityPageHeader {...defaultProps} />);
    expect(screen.getByText(/Star Calendar/)).toBeInTheDocument();
  });

  it("renders the header title in Chinese", () => {
    render(<ActivityPageHeader locale="zh-CN" />);
    expect(screen.getByText(/星星日历/)).toBeInTheDocument();
  });

  it("renders the subtitle in English", () => {
    render(<ActivityPageHeader {...defaultProps} />);
    expect(screen.getByText(/View all recorded star activities/)).toBeInTheDocument();
  });

  it("renders the subtitle in Chinese", () => {
    render(<ActivityPageHeader locale="zh-CN" />);
    expect(screen.getByText(/查看所有记录的星星活动/)).toBeInTheDocument();
  });

  it("renders a Generate Report button", () => {
    render(<ActivityPageHeader {...defaultProps} />);
    expect(screen.getByRole("button", { name: /reports.generateReport/i })).toBeInTheDocument();
  });

  it("opens GenerateReportModal when button is clicked", () => {
    render(<ActivityPageHeader {...defaultProps} />);
    expect(screen.queryByTestId("generate-report-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reports.generateReport/i }));
    expect(screen.getByTestId("generate-report-modal")).toBeInTheDocument();
  });

  it("closes modal when onClose is called", () => {
    render(<ActivityPageHeader {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /reports.generateReport/i }));
    expect(screen.getByTestId("generate-report-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("modal-close"));
    expect(screen.queryByTestId("generate-report-modal")).not.toBeInTheDocument();
  });
});
