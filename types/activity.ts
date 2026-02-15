/**
 * Unified Activity Types
 *
 * Shared types for both parent and child activity views.
 * This enables a single UnifiedActivityList component to work for both roles.
 */

import type { Database } from "@/types/database";

type Quest = Database["public"]["Tables"]["quests"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

/** Star transaction from Supabase query with joined relations */
export type StarTransaction = Database["public"]["Tables"]["star_transactions"]["Row"] & {
  quests?: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
    category: string | null;
  } | null;
  children?: {
    name: string;
    avatar_url: string | null;
  } | null;
};

/** Raw redemption from Supabase query with joined relations */
export type RawRedemption = Database["public"]["Tables"]["redemptions"]["Row"] & {
  rewards?: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
  } | null;
  children?: {
    name: string;
    avatar_url: string | null;
  } | null;
};

/** Raw credit transaction from Supabase query with joined relations */
export type RawCreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"] & {
  children?: {
    name: string;
    avatar_url: string | null;
  } | null;
};

// Unified activity item that works for all activity types
export interface UnifiedActivityItem {
  id: string;
  type: "star_transaction" | "redemption" | "credit_transaction";
  childId: string;
  childName: string;
  childAvatar: string | null;
  stars: number;
  description: string;
  descriptionZh: string | null;
  icon: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  childNote: string | null;
  parentResponse: string | null;
  source: "parent_record" | "child_request" | null;
  createdAt: string;
  originalData?: StarTransaction | RawRedemption | RawCreditTransaction;
  questId: string | null;
  quests?: {
    name_en: string;
    name_zh: string | null;
    icon: string | null;
    category: string | null;
  } | null;
}

// Permission matrix for different user roles
export interface ActivityPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canBatchApprove: boolean;
  canResubmit: boolean;
  canSeeAllChildren: boolean;
  canFilterByType: boolean;
  showStatistics: boolean;
  usePagination: boolean;
}

// User roles for activity list
export type ActivityRole = "parent" | "child";

// Get permissions based on role
export function getPermissions(role: ActivityRole): ActivityPermissions {
  if (role === "parent") {
    return {
      canEdit: true,
      canDelete: true,
      canBatchApprove: true,
      canResubmit: false,
      canSeeAllChildren: true,
      canFilterByType: true,
      showStatistics: true,
      usePagination: false,
    };
  }

  // Child role
  return {
    canEdit: false,
    canDelete: false,
    canBatchApprove: false,
    canResubmit: true,
    canSeeAllChildren: false,
    canFilterByType: false,
    showStatistics: false,
    usePagination: true,
  };
}

// Filter types for activities
export type ActivityFilterType =
  | "all"
  | "positive"
  | "negative"
  | "stars"
  | "redemptions";

// Status filter types
export type ActivityStatusFilter = "all" | "approved" | "pending" | "rejected";

// Props for the unified activity list component
export interface UnifiedActivityListProps {
  activities: UnifiedActivityItem[];
  locale: string;
  role: ActivityRole;
  currentChildId?: string;
  permissions?: ActivityPermissions;
  quests?: Quest[];
  familyChildren?: User[];
  currentUserId?: string;
  familyId?: string;
}
