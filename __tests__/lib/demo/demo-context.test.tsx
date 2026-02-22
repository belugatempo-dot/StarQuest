import { render, screen } from "@testing-library/react";
import { DemoProvider, useDemoMode } from "@/lib/demo/demo-context";

/** Test component that displays the isDemoUser value */
function DemoModeDisplay() {
  const { isDemoUser } = useDemoMode();
  return <div data-testid="demo-mode">{isDemoUser ? "true" : "false"}</div>;
}

describe("DemoProvider + useDemoMode", () => {
  it("returns isDemoUser = true for demo parent email", () => {
    render(
      <DemoProvider userEmail="demo@starquest.app">
        <DemoModeDisplay />
      </DemoProvider>
    );
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("true");
  });

  it("returns isDemoUser = true for demo child email (alisa)", () => {
    render(
      <DemoProvider userEmail="alisa.demo@starquest.app">
        <DemoModeDisplay />
      </DemoProvider>
    );
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("true");
  });

  it("returns isDemoUser = true for demo child email (alexander)", () => {
    render(
      <DemoProvider userEmail="alexander.demo@starquest.app">
        <DemoModeDisplay />
      </DemoProvider>
    );
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("true");
  });

  it("returns isDemoUser = false for regular user email", () => {
    render(
      <DemoProvider userEmail="real.user@example.com">
        <DemoModeDisplay />
      </DemoProvider>
    );
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("false");
  });

  it("returns isDemoUser = false when userEmail is null", () => {
    render(
      <DemoProvider userEmail={null}>
        <DemoModeDisplay />
      </DemoProvider>
    );
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("false");
  });

  it("returns isDemoUser = false when userEmail is undefined", () => {
    render(
      <DemoProvider>
        <DemoModeDisplay />
      </DemoProvider>
    );
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("false");
  });

  it("returns isDemoUser = false with no provider (default context)", () => {
    render(<DemoModeDisplay />);
    expect(screen.getByTestId("demo-mode")).toHaveTextContent("false");
  });

  it("renders children correctly", () => {
    render(
      <DemoProvider userEmail="demo@starquest.app">
        <div data-testid="child-content">Hello</div>
      </DemoProvider>
    );
    expect(screen.getByTestId("child-content")).toHaveTextContent("Hello");
  });
});
