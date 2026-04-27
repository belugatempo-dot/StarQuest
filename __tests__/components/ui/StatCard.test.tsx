import { render, screen, fireEvent } from "@testing-library/react";
import StatCard from "@/components/ui/StatCard";

describe("StatCard", () => {
  const defaultProps = {
    label: "Total Records",
    value: "115",
    tooltip: "Total number of star transactions and redemptions",
  };

  it("renders label and value", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText("Total Records")).toBeInTheDocument();
    expect(screen.getByText("115")).toBeInTheDocument();
  });

  it("renders info icon button", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByRole("button", { name: /info/i })).toBeInTheDocument();
  });

  it("does not show tooltip by default", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.queryByText(defaultProps.tooltip)).not.toBeInTheDocument();
  });

  it("shows tooltip when info icon is clicked", () => {
    render(<StatCard {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /info/i }));
    expect(screen.getByText(defaultProps.tooltip)).toBeInTheDocument();
  });

  it("hides tooltip when info icon is clicked again", () => {
    render(<StatCard {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /info/i });
    fireEvent.click(btn);
    expect(screen.getByText(defaultProps.tooltip)).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText(defaultProps.tooltip)).not.toBeInTheDocument();
  });

  it("applies custom value color class", () => {
    render(<StatCard {...defaultProps} valueColor="text-green-400" />);
    const valueEl = screen.getByText("115");
    expect(valueEl.className).toContain("text-green-400");
  });

  it("defaults value color to text-white", () => {
    render(<StatCard {...defaultProps} />);
    const valueEl = screen.getByText("115");
    expect(valueEl.className).toContain("text-white");
  });

  it("renders icon prefix in label when provided", () => {
    render(<StatCard {...defaultProps} icon="🎁" />);
    expect(screen.getByText(/🎁/)).toBeInTheDocument();
  });

  it("applies custom card class when provided", () => {
    const { container } = render(<StatCard {...defaultProps} cardClass="net-stars-card" />);
    expect(container.firstChild).toHaveClass("net-stars-card");
  });

  it("applies default card class stat-night-card", () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.firstChild).toHaveClass("stat-night-card");
  });

  it("renders label color as text-star-glow when labelColor provided", () => {
    render(<StatCard {...defaultProps} labelColor="text-star-glow" />);
    const label = screen.getByText("Total Records");
    expect(label.className).toContain("text-star-glow");
  });

  it("closes tooltip when clicking outside", () => {
    render(
      <div>
        <StatCard {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: /info/i }));
    expect(screen.getByText(defaultProps.tooltip)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText(defaultProps.tooltip)).not.toBeInTheDocument();
  });
});
