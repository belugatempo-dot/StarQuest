/**
 * Demo family configuration — constants and child profiles for seed data.
 */

export const DEMO_PARENT_EMAIL = "demo@starquest.app";
export const DEMO_FAMILY_NAME = "Demo Family";
export const DEMO_PARENT_NAME = "Demo Parent";

export interface DemoChildBehavior {
  dutyMissRate: number;
  bonusesPerDay: [number, number];
  childRequestRate: number;
  pendingRate: number;
  rejectedRate: number;
  violationRate: number;
  multiplierDist: Record<number, number>;
}

export interface DemoChildProfile {
  name: string;
  email: string;
  password: string;
  locale: "en" | "zh-CN";
  target: {
    lifetimeStars: number;
    creditEnabled: boolean;
    creditLimit?: number;
  };
  behavior: DemoChildBehavior;
}

export const DEMO_CHILDREN: DemoChildProfile[] = [
  {
    name: "Emma",
    email: "emma.demo@starquest.app",
    password: "EmmaDemo123!",
    locale: "en",
    target: {
      lifetimeStars: 280,
      creditEnabled: false,
    },
    behavior: {
      dutyMissRate: 0.10,
      bonusesPerDay: [2, 4],
      childRequestRate: 0.30,
      pendingRate: 0.15,
      rejectedRate: 0.05,
      violationRate: 0.03,
      multiplierDist: { 1: 0.70, 2: 0.20, 3: 0.08, 5: 0.02 },
    },
  },
  {
    name: "Lucas",
    email: "lucas.demo@starquest.app",
    password: "LucasDemo123!",
    locale: "zh-CN",
    target: {
      lifetimeStars: 120,
      creditEnabled: true,
      creditLimit: 100,
    },
    behavior: {
      dutyMissRate: 0.30,
      bonusesPerDay: [1, 3],
      childRequestRate: 0.25,
      pendingRate: 0.20,
      rejectedRate: 0.08,
      violationRate: 0.10,
      multiplierDist: { 1: 0.80, 2: 0.15, 3: 0.05 },
    },
  },
];

/** Number of days of activity history to generate */
export const DEMO_HISTORY_DAYS = 30;
