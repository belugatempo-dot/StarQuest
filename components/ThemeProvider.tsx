"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "day" | "night";

interface ThemeContextType {
  mode: ThemeMode;
  isDayMode: boolean;
  isNightMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "day",
  isDayMode: true,
  isNightMode: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getTimeBasedMode(): ThemeMode {
  const now = new Date();
  const hour = now.getHours();

  // Day mode: 7:00 AM (7) to before 6:00 PM (18)
  // Night mode: 6:00 PM (18) to before 7:00 AM (7)
  if (hour >= 7 && hour < 18) {
    return "day";
  }
  return "night";
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>("day");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set initial mode based on time
    setMode(getTimeBasedMode());
    setMounted(true);

    // Check time every minute to update theme
    const interval = setInterval(() => {
      setMode(getTimeBasedMode());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Update body class for CSS styling
      document.body.classList.remove("theme-day", "theme-night");
      document.body.classList.add(`theme-${mode}`);
    }
  }, [mode, mounted]);

  const value: ThemeContextType = {
    mode,
    isDayMode: mode === "day",
    isNightMode: mode === "night",
  };

  // During SSR, render with day mode to avoid hydration mismatch
  // The actual mode will be set on client mount
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
