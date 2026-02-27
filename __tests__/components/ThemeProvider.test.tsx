import { theme, useTheme } from "@/components/ThemeProvider";

describe("ThemeProvider", () => {
  describe("theme constant", () => {
    it("mode is always night", () => {
      expect(theme.mode).toBe("night");
    });

    it("isDayMode is always false", () => {
      expect(theme.isDayMode).toBe(false);
    });

    it("isNightMode is always true", () => {
      expect(theme.isNightMode).toBe(true);
    });
  });

  describe("useTheme", () => {
    it("returns the theme constant", () => {
      const result = useTheme();
      expect(result).toEqual({
        mode: "night",
        isDayMode: false,
        isNightMode: true,
      });
    });

    it("returns the same reference each time", () => {
      const result1 = useTheme();
      const result2 = useTheme();
      expect(result1).toBe(result2);
    });
  });
});
