import { render, screen } from "@testing-library/react";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { DemoProvider } from "@/lib/demo/demo-context";

describe("DemoBanner", () => {
  it("renders banner text when user is a demo user", () => {
    render(
      <DemoProvider userEmail="demo@starquest.app">
        <DemoBanner />
      </DemoProvider>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("banner")).toBeInTheDocument();
  });

  it("renders sign-up link when user is a demo user", () => {
    render(
      <DemoProvider userEmail="demo@starquest.app">
        <DemoBanner />
      </DemoProvider>
    );

    const link = screen.getByText("signUp");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/en/auth/register");
  });

  it("renders nothing when user is not a demo user", () => {
    const { container } = render(
      <DemoProvider userEmail="real@example.com">
        <DemoBanner />
      </DemoProvider>
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when no provider (default context)", () => {
    const { container } = render(<DemoBanner />);

    expect(container.innerHTML).toBe("");
  });

  it("renders for demo child users too", () => {
    render(
      <DemoProvider userEmail="alisa.demo@starquest.app">
        <DemoBanner />
      </DemoProvider>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
