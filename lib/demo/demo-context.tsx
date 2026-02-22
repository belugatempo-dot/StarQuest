"use client";

/**
 * React context for demo mode detection.
 * Checks if the current user's email matches a known demo account.
 * Client-safe — uses demo-users.ts (no passwords).
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { DEMO_USERS } from "@/lib/demo/demo-users";

interface DemoModeContextValue {
  isDemoUser: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoUser: false,
});

const DEMO_EMAILS = new Set(DEMO_USERS.map((u) => u.email));

interface DemoProviderProps {
  children: ReactNode;
  userEmail?: string | null;
}

export function DemoProvider({ children, userEmail }: DemoProviderProps) {
  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoUser: !!userEmail && DEMO_EMAILS.has(userEmail),
    }),
    [userEmail]
  );

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext);
}
