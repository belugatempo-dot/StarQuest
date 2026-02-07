"use client";

import { useTranslations } from "next-intl";
import type { UnifiedActivityItem } from "@/types/activity";
import type { ActivityPermissions } from "@/types/activity";
import {
  getActivityDescription,
  getStatusBadge,
  getTypeBadge,
  formatActivityDate,
} from "@/lib/activity-utils";

export interface ActivityItemProps {
  activity: UnifiedActivityItem;
  locale: string;
  permissions: ActivityPermissions;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResubmit: () => void;
  deletingId: string | null;
  showChildName: boolean;
  variant: "list" | "calendar";
}

export default function ActivityItem({
  activity,
  locale,
  permissions,
  selectionMode,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  onResubmit,
  deletingId,
  showChildName,
  variant,
}: ActivityItemProps) {
  const t = useTranslations();
  const statusBadge = getStatusBadge(activity.status, locale);
  const typeBadge = getTypeBadge(activity.type, locale);

  const canSelectForBatch =
    selectionMode &&
    activity.type === "star_transaction" &&
    activity.status === "pending";

  // Stars color class
  const getStarsColorClass = () => {
    if (activity.status === "rejected") return "text-gray-400 line-through";
    if (activity.status === "pending") return "text-yellow-600";
    if (variant === "list") {
      return activity.stars > 0 ? "text-success" : "text-danger";
    }
    return activity.stars > 0 ? "text-green-600" : "text-red-600";
  };

  // Card background/border classes
  const getCardClasses = () => {
    if (variant === "list") {
      if (activity.status === "rejected") return "bg-danger/5 border-danger/20";
      if (activity.status === "pending") return "bg-warning/5 border-warning/20";
      if (activity.type === "redemption") return "border-purple-200 bg-purple-50";
      if (activity.type === "credit_transaction") return "border-blue-200 bg-blue-50";
      return "bg-gray-50 border-gray-200";
    }
    // calendar variant
    if (activity.status === "rejected") return "border-gray-300 bg-gray-50";
    if (activity.status === "pending") return "border-yellow-200 bg-yellow-50";
    if (activity.type === "redemption") return "border-purple-200 bg-purple-50";
    if (activity.type === "credit_transaction") return "border-blue-200 bg-blue-50";
    return activity.stars > 0
      ? "border-green-200 bg-green-50"
      : "border-red-200 bg-red-50";
  };

  // Selection checkbox (shared)
  const checkbox = canSelectForBatch && (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggleSelection}
      className={`w-5 h-5 ${variant === "list" ? "mt-1" : ""} rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer`}
    />
  );

  // Action buttons (parent only, shared logic)
  const canShowActions = permissions.canEdit && (activity.type === "star_transaction" || activity.type === "redemption");

  const actionButtons = canShowActions && (
    <div className={variant === "list" ? "flex flex-col space-y-1 mt-2" : "flex space-x-1"}>
      <button
        onClick={onEdit}
        className={variant === "list"
          ? "px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
          : "px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"}
      >
        {variant === "list" ? `✏️ ${t("common.edit")}` : "✏️"}
      </button>
      {activity.type === "star_transaction" && (
        <button
          onClick={onDelete}
          disabled={deletingId === activity.id}
          className={variant === "list"
            ? "px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"
            : "px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition disabled:opacity-50"}
        >
          {variant === "list" ? `🗑️ ${t("common.delete")}` : "🗑️"}
        </button>
      )}
    </div>
  );

  if (variant === "calendar") {
    return (
      <div
        className={`p-4 rounded-lg border-2 ${getCardClasses()} ${isSelected ? "ring-2 ring-purple-500" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {checkbox}
            <span className="text-2xl">{activity.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {getActivityDescription(activity, locale)}
                </h4>
                {permissions.canFilterByType && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.className}`}
                  >
                    {typeBadge.icon}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {showChildName && `👤 ${activity.childName} • `}
                {new Date(activity.createdAt).toLocaleTimeString(
                  locale === "zh-CN" ? "zh-CN" : "en-US",
                  { hour: "2-digit", minute: "2-digit" }
                )}
                {" • "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </p>
              {activity.parentResponse && (
                <p className="text-sm text-gray-600 mt-1">
                  💬 {activity.parentResponse}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`text-xl font-bold ${getStarsColorClass()}`}>
              {activity.stars > 0 ? "+" : ""}
              {activity.stars}⭐
            </div>
            {actionButtons}
          </div>
        </div>
      </div>
    );
  }

  // List variant
  return (
    <div
      className={`p-4 rounded-lg border-2 transition hover:shadow-md ${getCardClasses()} ${isSelected ? "ring-2 ring-purple-500" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {checkbox}
          <div className="text-3xl mt-1">{activity.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">
              {getActivityDescription(activity, locale)}
            </h3>
            {permissions.canFilterByType && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.className}`}
              >
                {typeBadge.icon} {typeBadge.label}
              </span>
            )}
            <p className="text-sm text-gray-500">
              {formatActivityDate(activity.createdAt, locale)}
            </p>

            {/* Source (child view) */}
            {!permissions.canFilterByType && activity.source && (
              <p className="text-xs text-gray-600 mt-1">
                {activity.source === "parent_record"
                  ? t("history.parentRecorded")
                  : t("history.youRequested")}
              </p>
            )}

            {/* Child Note */}
            {activity.childNote && (
              <p className="text-sm text-gray-700 mt-2 italic">
                &quot;{activity.childNote}&quot;
              </p>
            )}

            {/* Parent Response (for rejected) */}
            {activity.status === "rejected" && activity.parentResponse && (
              <div className="mt-2 p-2 bg-danger/10 rounded border border-danger/20">
                <p className="text-xs font-semibold text-danger">
                  {t("history.rejectionReason")}:
                </p>
                <p className="text-sm text-danger">{activity.parentResponse}</p>
              </div>
            )}

            {/* Pending indicator (child view) */}
            {activity.status === "pending" && !permissions.canFilterByType && (
              <p className="text-xs text-warning mt-2 flex items-center">
                <span className="mr-1">⏳</span>
                {t("history.waitingApproval")}
              </p>
            )}

            {/* Resubmit button (child only for rejected requests) */}
            {permissions.canResubmit &&
              activity.status === "rejected" &&
              activity.source === "child_request" && (
                <button
                  onClick={onResubmit}
                  className="mt-2 px-3 py-1 text-sm bg-primary text-gray-900 rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  {t("activity.editResubmit")}
                </button>
              )}
          </div>
        </div>

        <div className="text-right ml-4 flex-shrink-0">
          <div className={`text-2xl font-bold mb-2 ${getStarsColorClass()}`}>
            {activity.stars > 0 ? "+" : ""}
            {activity.stars}
          </div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
          >
            {t(`status.${activity.status}` as any)}
          </span>
          {actionButtons}
        </div>
      </div>
    </div>
  );
}
