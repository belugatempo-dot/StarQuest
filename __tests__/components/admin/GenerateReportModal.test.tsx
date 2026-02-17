import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GenerateReportModal from "@/components/admin/GenerateReportModal";

// Mock ModalFrame
jest.mock("@/components/ui/ModalFrame", () => {
  return function MockModalFrame(props: any) {
    return (
      <div data-testid="modal-frame">
        <h2>{props.title}</h2>
        {props.error && <div data-testid="modal-error">{props.error}</div>}
        <button onClick={props.onClose} data-testid="modal-close">✕</button>
        {props.children}
        {props.footer}
      </div>
    );
  };
});

// Mock date-ranges
jest.mock("@/lib/reports/date-ranges", () => ({
  getAvailablePeriods: jest.fn((periodType: string) => {
    if (periodType === "daily") {
      return [
        {
          start: new Date("2026-02-15T00:00:00.000Z"),
          end: new Date("2026-02-15T23:59:59.999Z"),
          label: "Feb 15, 2026",
        },
        {
          start: new Date("2026-02-14T00:00:00.000Z"),
          end: new Date("2026-02-14T23:59:59.999Z"),
          label: "Feb 14, 2026",
        },
      ];
    }
    return [
      {
        start: new Date("2026-02-09T00:00:00.000Z"),
        end: new Date("2026-02-15T23:59:59.999Z"),
        label: "Feb 9 – Feb 15, 2026",
      },
      {
        start: new Date("2026-02-02T00:00:00.000Z"),
        end: new Date("2026-02-08T23:59:59.999Z"),
        label: "Feb 2 – Feb 8, 2026",
      },
    ];
  }),
  getReportFilename: jest.fn(() => "starquest-weekly-2026-02-09-to-2026-02-15.md"),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => "blob:http://localhost/fake-url");
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("GenerateReportModal", () => {
  const defaultProps = {
    locale: "en",
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["# Report"], { type: "text/markdown" })),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="starquest-weekly-2026-02-09-to-2026-02-15.md"',
      }),
    });
  });

  it("renders modal with title", () => {
    render(<GenerateReportModal {...defaultProps} />);
    expect(screen.getByText("reports.generateReport")).toBeInTheDocument();
  });

  it("renders period type buttons", () => {
    render(<GenerateReportModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "reports.daily" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reports.weekly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reports.monthly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reports.quarterly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "reports.yearly" })).toBeInTheDocument();
  });

  it("defaults to weekly period type", () => {
    render(<GenerateReportModal {...defaultProps} />);
    const weeklyBtn = screen.getByRole("button", { name: "reports.weekly" });
    expect(weeklyBtn.className).toContain("bg-indigo");
  });

  it("changes period type when clicking a different button", () => {
    render(<GenerateReportModal {...defaultProps} />);
    const dailyBtn = screen.getByRole("button", { name: "reports.daily" });
    fireEvent.click(dailyBtn);
    expect(dailyBtn.className).toContain("bg-indigo");
  });

  it("renders date range dropdown", () => {
    render(<GenerateReportModal {...defaultProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("shows filename preview", () => {
    render(<GenerateReportModal {...defaultProps} />);
    expect(screen.getByText(/starquest-weekly/)).toBeInTheDocument();
  });

  it("renders download button", () => {
    render(<GenerateReportModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "reports.download" })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("modal-close"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("triggers download on button click", async () => {
    // Mock document.createElement and click
    const mockLink = { href: "", download: "", click: jest.fn() };
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") return mockLink as any;
      return origCreateElement(tag);
    });

    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reports/generate-markdown",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
    });

    (document.createElement as any).mockRestore();
  });

  it("shows loading state during download", async () => {
    let resolvePromise!: (value: any) => void;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    mockFetch.mockReturnValue(promise);

    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

    expect(screen.getByRole("button", { name: "reports.generating" })).toBeInTheDocument();

    resolvePromise({
      ok: true,
      blob: () => Promise.resolve(new Blob(["# Report"])),
      headers: new Headers({}),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "reports.download" })).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

    await waitFor(() => {
      expect(screen.getByTestId("modal-error")).toBeInTheDocument();
    });
  });

  it("shows error when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

    await waitFor(() => {
      expect(screen.getByTestId("modal-error")).toBeInTheDocument();
    });
  });

  it("sends correct body to API", async () => {
    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "reports.download" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody.periodType).toBe("weekly");
    expect(fetchBody.locale).toBe("en");
    expect(fetchBody.periodStart).toBeDefined();
    expect(fetchBody.periodEnd).toBeDefined();
  });

  it("updates period dropdown when switching period type", () => {
    const { getAvailablePeriods } = require("@/lib/reports/date-ranges");

    render(<GenerateReportModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "reports.daily" }));

    // getAvailablePeriods should be called with "daily"
    expect(getAvailablePeriods).toHaveBeenCalledWith("daily", "en");
  });
});
