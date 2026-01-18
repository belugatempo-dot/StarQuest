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
  // Store original Date constructor
  const RealDate = global.Date;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.className = ""; // Reset body classes
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.Date = RealDate; // Restore real Date
    document.body.className = ""; // Clean up body classes
  });

  // Helper to mock the current hour
  function mockCurrentHour(hour: number) {
    const mockDate = new RealDate();
    mockDate.setHours(hour, 0, 0, 0);

    global.Date = class extends RealDate {
      constructor(...args: any[]) {
        super();
        if (args.length === 0) {
          return mockDate;
        }
        // @ts-ignore
        return new RealDate(...args);
      }
      static now() {
        return mockDate.getTime();
      }
    } as DateConstructor;
  }

  describe("Rendering", () => {
    it("renders children correctly", () => {
      mockCurrentHour(12);
      render(
        <ThemeProvider>
          <div data-testid="child">Hello World</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId("child")).toHaveTextContent("Hello World");
    });

    it("provides default context values", () => {
      mockCurrentHour(12); // Day time
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      // Use advanceTimersByTime instead of runAllTimers to avoid infinite loop
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("works without crashing with multiple children", () => {
      mockCurrentHour(12);
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

  describe("Time-Based Mode Detection", () => {
    it("returns 'day' at 7:00 AM (boundary)", () => {
      mockCurrentHour(7);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("returns 'day' at 12:00 PM (midday)", () => {
      mockCurrentHour(12);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("returns 'day' at 5:00 PM (late afternoon)", () => {
      mockCurrentHour(17);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("returns 'night' at 6:00 PM (boundary)", () => {
      mockCurrentHour(18);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });

    it("returns 'night' at 11:00 PM (late night)", () => {
      mockCurrentHour(23);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });

    it("returns 'night' at 6:00 AM (early morning)", () => {
      mockCurrentHour(6);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });

    it("returns 'night' at midnight (12:00 AM)", () => {
      mockCurrentHour(0);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });
  });

  describe("useTheme Hook", () => {
    it("returns correct mode string during day", () => {
      mockCurrentHour(10);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("isDayMode is true during day hours", () => {
      mockCurrentHour(14);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("isDayMode")).toHaveTextContent("true");
    });

    it("isNightMode is true during night hours", () => {
      mockCurrentHour(21);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("isNightMode")).toHaveTextContent("true");
    });

    it("boolean flags are mutually exclusive during day", () => {
      mockCurrentHour(12);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("isDayMode")).toHaveTextContent("true");
      expect(screen.getByTestId("isNightMode")).toHaveTextContent("false");
    });

    it("boolean flags are mutually exclusive during night", () => {
      mockCurrentHour(22);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("isDayMode")).toHaveTextContent("false");
      expect(screen.getByTestId("isNightMode")).toHaveTextContent("true");
    });
  });

  describe("DOM Class Updates", () => {
    it("applies theme-day class during day hours", () => {
      mockCurrentHour(12);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(document.body.classList.contains("theme-day")).toBe(true);
    });

    it("applies theme-night class during night hours", () => {
      mockCurrentHour(22);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(document.body.classList.contains("theme-night")).toBe(true);
    });

    it("does not have both classes simultaneously", () => {
      mockCurrentHour(12);
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should have day, not night
      expect(document.body.classList.contains("theme-day")).toBe(true);
      expect(document.body.classList.contains("theme-night")).toBe(false);
    });

    it("removes old class when mode changes", () => {
      mockCurrentHour(17); // Day mode
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(document.body.classList.contains("theme-day")).toBe(true);

      // Change to night time
      mockCurrentHour(18);

      act(() => {
        jest.advanceTimersByTime(60000); // Trigger interval
      });

      expect(document.body.classList.contains("theme-night")).toBe(true);
      expect(document.body.classList.contains("theme-day")).toBe(false);
    });
  });

  describe("Interval Management", () => {
    it("creates interval on mount", () => {
      const setIntervalSpy = jest.spyOn(global, "setInterval");
      mockCurrentHour(12);

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
      setIntervalSpy.mockRestore();
    });

    it("clears interval on unmount", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");
      mockCurrentHour(12);

      const { unmount } = render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("checks time every 60 seconds", () => {
      mockCurrentHour(12);

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");

      // Change mock time to night
      mockCurrentHour(22);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });

    it("updates theme when time crosses boundary", () => {
      mockCurrentHour(17); // 5 PM - day mode

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
      expect(document.body.classList.contains("theme-day")).toBe(true);

      // Simulate time crossing to 6 PM (night)
      mockCurrentHour(18);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
      expect(document.body.classList.contains("theme-night")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles 6:59 AM to 7:00 AM transition (night to day)", () => {
      mockCurrentHour(6); // 6 AM - still night

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");

      // Cross to day time
      mockCurrentHour(7);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("handles 5:59 PM to 6:00 PM transition (day to night)", () => {
      mockCurrentHour(17); // 5 PM - day

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");

      // Cross to night time
      mockCurrentHour(18);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("night");
    });

    it("handles multiple switches in sequence", () => {
      mockCurrentHour(17); // Day

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");

      // Switch to night
      mockCurrentHour(20);
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      expect(screen.getByTestId("mode")).toHaveTextContent("night");

      // Stay in night
      mockCurrentHour(23);
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      expect(screen.getByTestId("mode")).toHaveTextContent("night");

      // Switch back to day
      mockCurrentHour(8);
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });

    it("handles rapid mount/unmount cycles", () => {
      mockCurrentHour(12);

      // Mount and unmount quickly
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

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should still work correctly
      expect(screen.getByTestId("mode")).toHaveTextContent("day");
      unmount3();
    });

    it("preserves state when no time change occurs", () => {
      mockCurrentHour(12);

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(screen.getByTestId("mode")).toHaveTextContent("day");

      // Multiple intervals with same time
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      expect(screen.getByTestId("mode")).toHaveTextContent("day");

      act(() => {
        jest.advanceTimersByTime(60000);
      });
      expect(screen.getByTestId("mode")).toHaveTextContent("day");
    });
  });

  describe("Context Default Values", () => {
    it("provides default values when useTheme is called outside provider", () => {
      // This tests the default context value
      let contextValue: ReturnType<typeof useTheme> | null = null;

      function DirectConsumer() {
        contextValue = useTheme();
        return null;
      }

      // Render without provider - should get default values
      render(<DirectConsumer />);

      expect(contextValue).toEqual({
        mode: "day",
        isDayMode: true,
        isNightMode: false,
      });
    });
  });

  describe("Hour Boundary Coverage", () => {
    const dayHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const nightHours = [0, 1, 2, 3, 4, 5, 6, 18, 19, 20, 21, 22, 23];

    dayHours.forEach((hour) => {
      it(`returns 'day' at hour ${hour}`, () => {
        mockCurrentHour(hour);
        render(
          <ThemeProvider>
            <ThemeConsumer />
          </ThemeProvider>
        );

        act(() => {
          jest.advanceTimersByTime(100);
        });

        expect(screen.getByTestId("mode")).toHaveTextContent("day");
      });
    });

    nightHours.forEach((hour) => {
      it(`returns 'night' at hour ${hour}`, () => {
        mockCurrentHour(hour);
        render(
          <ThemeProvider>
            <ThemeConsumer />
          </ThemeProvider>
        );

        act(() => {
          jest.advanceTimersByTime(100);
        });

        expect(screen.getByTestId("mode")).toHaveTextContent("night");
      });
    });
  });
});
