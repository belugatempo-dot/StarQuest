import path from "path";

export interface DemoUser {
  role: string;
  email: string;
  nameEn: string;
  storageStatePath: string;
}

const authDir = path.join(__dirname, "..", ".auth");

export const DEMO_USERS: DemoUser[] = [
  {
    role: "parent",
    email: "demo@starquest.app",
    nameEn: "Parent",
    storageStatePath: path.join(authDir, "parent.json"),
  },
  {
    role: "alisa",
    email: "alisa.demo@starquest.app",
    nameEn: "Alisa",
    storageStatePath: path.join(authDir, "alisa.json"),
  },
  {
    role: "alexander",
    email: "alexander.demo@starquest.app",
    nameEn: "Alexander",
    storageStatePath: path.join(authDir, "alexander.json"),
  },
];

export function getStorageStatePath(role: "parent" | "alisa" | "alexander"): string {
  return DEMO_USERS.find((u) => u.role === role)!.storageStatePath;
}
