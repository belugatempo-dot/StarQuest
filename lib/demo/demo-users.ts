/**
 * Demo user metadata for the passwordless demo login flow.
 * Shared between server (API route) and client (role picker UI).
 *
 * IMPORTANT: This file must NOT contain passwords or secrets.
 * For server-only config with passwords, see ./demo-config.ts.
 */

export type DemoRole = "parent" | "alisa" | "alexander";

export interface DemoUserInfo {
  role: DemoRole;
  email: string;
  nameEn: string;
  nameZh: string;
  descriptionEn: string;
  descriptionZh: string;
  emoji: string;
  /** Where to redirect after login: "admin" for parents, "app" for children */
  redirectPath: "admin" | "app";
}

export const DEMO_USERS: DemoUserInfo[] = [
  {
    role: "parent",
    email: "demo@starquest.app",
    nameEn: "Parent",
    nameZh: "家长",
    descriptionEn: "Manage quests, approve stars, see reports",
    descriptionZh: "管理任务、审批星星、查看报告",
    emoji: "👨‍👩‍👧‍👦",
    redirectPath: "admin",
  },
  {
    role: "alisa",
    email: "alisa.demo@starquest.app",
    nameEn: "Alisa",
    nameZh: "Alisa",
    descriptionEn: "Level 3, compliant child, English UI",
    descriptionZh: "3级，听话的孩子，英文界面",
    emoji: "🌟",
    redirectPath: "app",
  },
  {
    role: "alexander",
    email: "alexander.demo@starquest.app",
    nameEn: "Alexander",
    nameZh: "Alexander",
    descriptionEn: "Level 2, credit enabled, Chinese UI",
    descriptionZh: "2级，有信用额度，中文界面",
    emoji: "🚀",
    redirectPath: "app",
  },
];

/** Look up a demo user by role. Returns undefined for invalid roles. */
export function getDemoUser(role: string): DemoUserInfo | undefined {
  return DEMO_USERS.find((u) => u.role === role);
}
