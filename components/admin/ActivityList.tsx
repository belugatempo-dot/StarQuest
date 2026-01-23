"use client";

import UnifiedActivityList from "@/components/shared/UnifiedActivityList";
import type { UnifiedActivityItem } from "@/types/activity";

// Legacy interface for backwards compatibility
interface UnifiedActivity {
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
  note: string | null;
  response: string | null;
  createdAt: string;
  originalData?: any;
}

interface ActivityListProps {
  activities: UnifiedActivity[];
  locale: string;
}

/**
 * ActivityList - Wrapper component for parent activity list
 *
 * This component maintains backwards compatibility with existing code
 * while delegating to the shared UnifiedActivityList component.
 */
export default function ActivityList({ activities, locale }: ActivityListProps) {
  // Transform legacy format to new unified format
  const unifiedActivities: UnifiedActivityItem[] = activities.map((a) => ({
    id: a.id,
    type: a.type,
    childId: a.childId,
    childName: a.childName,
    childAvatar: a.childAvatar,
    stars: a.stars,
    description: a.description,
    descriptionZh: a.descriptionZh,
    icon: a.icon,
    status: a.status,
    childNote: a.note,
    parentResponse: a.response,
    source: null,
    createdAt: a.createdAt,
    originalData: a.originalData,
    questId: a.originalData?.quest_id || null,
    quests: a.originalData?.quests || null,
  }));

  return (
    <UnifiedActivityList
      activities={unifiedActivities}
      locale={locale}
      role="parent"
    />
  );
}
