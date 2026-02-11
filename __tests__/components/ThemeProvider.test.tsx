import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

// Test component to access the useTheme hook
function ThemeConsumer() {
  const { mode, isDayMode, isNightMode } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="isDayMode">{isDayMode.toString()}</span>
      <span data-testid="isNightMode">{isNightMode.toString()}</span>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.body.className = "";
  });

  afterEach(() => {
    document.body.className = "";
  });

  describe("Rendering", () => {
    it("renders children correctly", () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Hello World</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId("child")).toHaveTextContent("Hello World");
    });

    it("works without crashing with multiple children", () => {
      render(
        <ThemeProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ThemeProvider>
      );

      expect(screen.getByText("Child 1")).toBeInTheDocument();
      expect(screen.getByText("Child 2")).toBeInTheDocument();
      expect(screen.getByText("Child 3")).toBeInTheDocument();
    });
  });

  describe("Always Night Mode", () => {
    it("always returns night mode", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });

    it("isDayMode is always false", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("isDayMode")).toHaveTextContent("false");
    });

    it("isNightMode is always true", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("isNightMode")).toHaveTextContent("true");
    });
  });

  describe("useTheme Hook", () => {
    it("returns night mode values", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
      expect(screen.getByTestId("isDayMode")).toHaveTextContent("false");
      expect(screen.getByTestId("isNightMode")).toHaveTextContent("true");
    });
  });

  describe("DOM Class Updates", () => {
    it("applies theme-night class on mount", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(document.body.classList.contains("theme-night")).toBe(true);
    });

    it("does not have theme-day class", () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(document.body.classList.contains("theme-day")).toBe(false);
    });

    it("removes theme-day class if present before mount", () => {
      document.body.classList.add("theme-day");

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(document.body.classList.contains("theme-day")).toBe(false);
      expect(document.body.classList.contains("theme-night")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid mount/unmount cycles", () => {
      const { unmount: unmount1 } = render(
        <ThemeProvider>
          <div>Test 1</div>
        </ThemeProvider>
      );
      unmount1();

      const { unmount: unmount2 } = render(
        <ThemeProvider>
          <div>Test 2</div>
        </ThemeProvider>
      );
      unmount2();

      const { unmount: unmount3 } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
      unmount3();
    });
  });

  describe("Context Default Values", () => {
    it("provides night mode default values when useTheme is called outside provider", () => {
      let contextValue: ReturnType<typeof useTheme> | null = null;

      function DirectConsumer() {
        contextValue = useTheme();
        return null;
      }

      render(<DirectConsumer />);

      expect(contextValue).toEqual({
        mode: "night",
        isDayMode: false,
        isNightMode: true,
      });
    });
  });
});
