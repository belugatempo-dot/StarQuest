"use client";

import { useTranslations } from "next-intl";
import ActivityItem from "@/components/shared/ActivityItem";
import type { UnifiedActivityItem, ActivityPermissions } from "@/types/activity";
import { formatDateShort, getDailyTotal } from "@/lib/activity-utils";

export interface ActivityDateGroupProps {
  date: string;
  activities: UnifiedActivityItem[];
  locale: string;
  permissions: ActivityPermissions;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onEdit: (activity: UnifiedActivityItem) => void;
  onDelete: (activity: UnifiedActivityItem) => void;
  onResubmit: (activity: UnifiedActivityItem) => void;
  deletingId: string | null;
}

export default function ActivityDateGroup({
  date,
  activities,
  locale,
  permissions,
  selectionMode,
  selectedIds,
  onToggleSelection,
  onEdit,
  onDelete,
  onResubmit,
  deletingId,
}: ActivityDateGroupProps) {
  const t = useTranslations();
  const dailyTotal = getDailyTotal(activities);

  return (
    <div className="dark-card rounded-lg shadow-md overflow-hidden">
      {/* Date Header - Night Theme */}
      <div className="night-date-header px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">
            ✨ {formatDateShort(date, locale)}
          </h3>
          <p className="text-sm text-white/70">
            {activities.length} {t("activity.records")}
          </p>
        </div>
        <div
          className={`text-2xl font-bold star-glow ${
            dailyTotal > 0
              ? "text-green-400"
              : dailyTotal < 0
                ? "text-red-400"
                : "text-white/60"
          }`}
        >
          {dailyTotal > 0 ? "+" : ""}
          {dailyTotal} ⭐
        </div>
      </div>

      {/* Activities for this date */}
      <div className="p-6 space-y-3">
        {activities.map((activity) => (
          <ActivityItem
            key={`${activity.type}-${activity.id}`}
            activity={activity}
            locale={locale}
            permissions={permissions}
            selectionMode={selectionMode}
            isSelected={selectedIds.has(activity.id)}
            onToggleSelection={() => onToggleSelection(activity.id)}
            onEdit={() => onEdit(activity)}
            onDelete={() => onDelete(activity)}
            onResubmit={() => onResubmit(activity)}
            deletingId={deletingId}
            showChildName={permissions.canSeeAllChildren}
            variant="calendar"
          />
        ))}
      </div>
    </div>
  );
}
