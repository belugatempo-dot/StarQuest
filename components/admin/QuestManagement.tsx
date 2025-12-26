"use client";

// Placeholder component for Quest Management
// TODO: Implement full quest CRUD functionality

import { useTranslations } from "next-intl";

interface QuestManagementProps {
  quests: any[];
  locale: string;
  familyId: string;
}

export default function QuestManagement({
  quests,
  locale,
  familyId,
}: QuestManagementProps) {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {locale === "zh-CN" ? "任务管理功能开发中" : "Quest Management Coming Soon"}
      </h3>
      <p className="text-gray-500 mb-4">
        {locale === "zh-CN"
          ? "完整的任务管理功能（创建、编辑、删除）即将推出。"
          : "Full quest management (create, edit, delete) is coming soon."}
      </p>
      <p className="text-sm text-gray-400">
        {locale === "zh-CN"
          ? `当前有 ${quests.length} 个任务模板`
          : `Currently ${quests.length} quest templates`}
      </p>
    </div>
  );
}
