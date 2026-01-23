/**
 * Activity Utility Functions
 *
 * Helper functions for transforming and working with activity data.
 */

import type { UnifiedActivityItem, StarTransaction } from "@/types/activity";

/**
 * Transform a star transaction to unified activity format
 */
export function transformStarTransaction(
  tx: any,
  includeChildInfo: boolean = true
): UnifiedActivityItem {
  // Determine icon: use quest icon, or default based on stars (⭐ for positive, ⚠️ for negative)
  const getDefaultIcon = () => {
    if (tx.quests?.icon) return tx.quests.icon;
    return tx.stars > 0 ? "⭐" : "⚠️";
  };

  return {
    id: tx.id,
    type: "star_transaction",
    childId: tx.child_id,
    childName: includeChildInfo ? tx.children?.name || "Unknown" : "",
    childAvatar: includeChildInfo ? tx.children?.avatar_url || null : null,
    stars: tx.stars,
    description: tx.custom_description || tx.quests?.name_en || "Unknown quest",
    descriptionZh: tx.quests?.name_zh || null,
    icon: getDefaultIcon(),
    status: tx.status,
    childNote: tx.child_note || null,
    parentResponse: tx.parent_response || null,
    source: tx.source || null,
    createdAt: tx.created_at,
    originalData: tx,
    questId: tx.quest_id || null,
    quests: tx.quests || null,
  };
}

/**
 * Transform a redemption to unified activity format
 */
export function transformRedemption(
  redemption: any,
  includeChildInfo: boolean = true
): UnifiedActivityItem {
  return {
    id: redemption.id,
    type: "redemption",
    childId: redemption.child_id,
    childName: includeChildInfo ? redemption.children?.name || "Unknown" : "",
    childAvatar: includeChildInfo
      ? redemption.children?.avatar_url || null
      : null,
    stars: -redemption.stars_spent, // negative because spending
    description: redemption.rewards?.name_en || "Unknown reward",
    descriptionZh: redemption.rewards?.name_zh || null,
    icon: redemption.rewards?.icon || "🎁",
    status: redemption.status,
    childNote: redemption.child_note || null,
    parentResponse: redemption.parent_response || null,
    source: null,
    createdAt: redemption.created_at,
    originalData: redemption,
    questId: null,
    quests: null,
  };
}

/**
 * Transform a credit transaction to unified activity format
 */
export function transformCreditTransaction(
  ct: any,
  includeChildInfo: boolean = true
): UnifiedActivityItem {
  let description = "";
  let descriptionZh = "";
  let icon = "💳";
  let stars = ct.amount;

  switch (ct.transaction_type) {
    case "credit_used":
      description = "Credit borrowed";
      descriptionZh = "借用信用";
      icon = "💳";
      stars = -ct.amount; // negative because borrowing
      break;
    case "credit_repaid":
      description = "Credit repaid";
      descriptionZh = "信用偿还";
      icon = "💰";
      stars = ct.amount; // positive because repaying
      break;
    case "interest_charged":
      description = "Interest charged";
      descriptionZh = "利息扣除";
      icon = "📈";
      stars = -ct.amount; // negative because charged
      break;
  }

  return {
    id: ct.id,
    type: "credit_transaction",
    childId: ct.child_id,
    childName: includeChildInfo ? ct.children?.name || "Unknown" : "",
    childAvatar: includeChildInfo ? ct.children?.avatar_url || null : null,
    stars: stars,
    description: description,
    descriptionZh: descriptionZh,
    icon: icon,
    status: "approved", // credit transactions are always executed
    childNote: null,
    parentResponse: null,
    source: null,
    createdAt: ct.created_at,
    originalData: ct,
    questId: null,
    quests: null,
  };
}

/**
 * Transform any activity to unified format based on type
 */
export function transformToUnifiedActivity(
  data: any,
  type: "star_transaction" | "redemption" | "credit_transaction",
  includeChildInfo: boolean = true
): UnifiedActivityItem {
  switch (type) {
    case "star_transaction":
      return transformStarTransaction(data, includeChildInfo);
    case "redemption":
      return transformRedemption(data, includeChildInfo);
    case "credit_transaction":
      return transformCreditTransaction(data, includeChildInfo);
  }
}

/**
 * Sort activities by created_at in descending order
 */
export function sortActivitiesByDate(
  activities: UnifiedActivityItem[]
): UnifiedActivityItem[] {
  return [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Format date for display
 */
export function formatActivityDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  if (locale === "zh-CN") {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date short for calendar headers
 */
export function formatDateShort(dateString: string, locale: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (locale === "zh-CN") {
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get activity description based on locale
 */
export function getActivityDescription(
  activity: UnifiedActivityItem,
  locale: string
): string {
  if (locale === "zh-CN" && activity.descriptionZh) {
    return activity.descriptionZh;
  }
  return activity.description;
}

/**
 * Get status badge styling using semantic Tailwind classes
 */
export function getStatusBadge(
  status: string,
  locale: string
): { label: string; className: string } {
  switch (status) {
    case "approved":
      return {
        label: locale === "zh-CN" ? "已批准" : "Approved",
        className: "bg-success/10 text-success border-success",
      };
    case "fulfilled":
      return {
        label: locale === "zh-CN" ? "已完成" : "Fulfilled",
        className: "bg-blue-100 text-blue-700 border-blue-300",
      };
    case "pending":
      return {
        label: locale === "zh-CN" ? "待审批" : "Pending",
        className: "bg-warning/10 text-warning border-warning",
      };
    case "rejected":
      return {
        label: locale === "zh-CN" ? "已拒绝" : "Rejected",
        className: "bg-danger/10 text-danger border-danger",
      };
    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-600 border-gray-300",
      };
  }
}

/**
 * Get type badge styling
 */
export function getTypeBadge(
  type: string,
  locale: string
): { label: string; className: string; icon: string } {
  switch (type) {
    case "star_transaction":
      return {
        label: locale === "zh-CN" ? "星星" : "Stars",
        className: "bg-yellow-100 text-yellow-700",
        icon: "⭐",
      };
    case "redemption":
      return {
        label: locale === "zh-CN" ? "兑换" : "Redeem",
        className: "bg-purple-100 text-purple-700",
        icon: "🎁",
      };
    case "credit_transaction":
      return {
        label: locale === "zh-CN" ? "信用" : "Credit",
        className: "bg-blue-100 text-blue-700",
        icon: "💳",
      };
    default:
      return {
        label: type,
        className: "bg-gray-100 text-gray-700",
        icon: "📝",
      };
  }
}

/**
 * Calculate daily total stars (only approved/fulfilled)
 */
export function getDailyTotal(activities: UnifiedActivityItem[]): number {
  return activities
    .filter((a) => a.status === "approved" || a.status === "fulfilled")
    .reduce((sum, a) => sum + a.stars, 0);
}

/**
 * Group activities by date
 */
export function groupActivitiesByDate(
  activities: UnifiedActivityItem[]
): [string, UnifiedActivityItem[]][] {
  const groups: Record<string, UnifiedActivityItem[]> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.createdAt);
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!groups[dateString]) {
      groups[dateString] = [];
    }
    groups[dateString].push(activity);
  });

  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

/**
 * Calculate statistics for activities
 */
export function calculateActivityStats(activities: UnifiedActivityItem[]) {
  const totalRecords = activities.length;
  const approvedActivities = activities.filter(
    (a) => a.status === "approved" || a.status === "fulfilled"
  );
  const positiveRecords = approvedActivities.filter((a) => a.stars > 0).length;
  const negativeRecords = approvedActivities.filter((a) => a.stars < 0).length;
  const totalStarsGiven = approvedActivities.reduce(
    (sum, a) => sum + (a.stars > 0 ? a.stars : 0),
    0
  );
  const totalStarsDeducted = approvedActivities.reduce(
    (sum, a) => sum + (a.stars < 0 ? a.stars : 0),
    0
  );
  const netStars = totalStarsGiven + totalStarsDeducted;

  return {
    totalRecords,
    positiveRecords,
    negativeRecords,
    totalStarsGiven,
    totalStarsDeducted,
    netStars,
    all: totalRecords,
    approved: activities.filter((a) => a.status === "approved").length,
    pending: activities.filter((a) => a.status === "pending").length,
    rejected: activities.filter((a) => a.status === "rejected").length,
  };
}
