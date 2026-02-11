"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "night";

interface ThemeContextType {
  mode: ThemeMode;
  isDayMode: boolean;
  isNightMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "night",
  isDayMode: false,
  isNightMode: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.body.classList.remove("theme-day");
      document.body.classList.add("theme-night");
    }
  }, [mounted]);

  const value: ThemeContextType = {
    mode: "night",
    isDayMode: false,
    isNightMode: true,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
