"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { typedUpdate } from "@/lib/supabase/helpers";
import type { Quest } from "@/types/quest";
import { groupQuests } from "@/types/quest";
import type { QuestCategoryRow } from "@/types/category";
import QuestFormModal from "./QuestFormModal";

interface QuestManagementProps {
  quests: Quest[];
  locale: string;
  familyId: string;
  categories?: QuestCategoryRow[];
}

export default function QuestManagement({
  quests,
  locale,
  familyId,
  categories = [],
}: QuestManagementProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set()
  );

  const questGroups = groupQuests(quests);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const handleToggleActive = async (quest: Quest) => {
    try {
      const { error } = await typedUpdate(supabase, "quests", { is_active: !quest.is_active })
        .eq("id", quest.id);

      if (error) throw error;

      router.refresh();
    } catch (err: any) {
      console.error("Error toggling quest:", err);
      alert(t("quests.toggleError"));
    }
  };

  const handleDelete = async (quest: Quest) => {
    const questName =
      locale === "zh-CN" ? quest.name_zh || quest.name_en : quest.name_en;

    if (!confirm(t("quests.confirmDelete", { name: questName }))) {
      return;
    }

    try {
      const { error } = await supabase.from("quests").delete().eq("id", quest.id);

      if (error) throw error;

      router.refresh();
    } catch (err: any) {
      console.error("Error deleting quest:", err);
      alert(t("quests.deleteError"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400">
            {locale === "zh-CN"
              ? `共 ${quests.length} 个任务模板`
              : `${quests.length} quest templates`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition font-semibold"
        >
          <span>➕</span>
          <span>{t("quests.addQuest")}</span>
        </button>
      </div>

      {/* Quest Groups */}
      {questGroups.length > 0 ? (
        <div className="space-y-4">
          {questGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);

            return (
              <div
                key={group.key}
                className="dark-card rounded-lg shadow-md overflow-hidden border-2 border-white/10"
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{group.icon}</span>
                    <div className="text-left">
                      <h3 className="text-xl font-bold">
                        {locale === "zh-CN" ? group.title_zh : group.title_en}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {group.quests.length}{" "}
                        {locale === "zh-CN" ? "个任务" : "quests"}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl text-slate-500">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </button>

                {/* Group Content */}
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="space-y-3">
                      {group.quests.map((quest) => {
                        const questName =
                          locale === "zh-CN"
                            ? quest.name_zh || quest.name_en
                            : quest.name_en;

                        return (
                          <div
                            key={quest.id}
                            className={`border-2 rounded-lg p-4 ${
                              quest.is_active
                                ? "border-white/10 bg-surface"
                                : "border-white/20 bg-white/10 opacity-60"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              {/* Quest Info */}
                              <div className="flex items-center space-x-4 flex-1">
                                <span className="text-3xl">{quest.icon || "📝"}</span>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-white">
                                    {questName}
                                  </h4>
                                  <div className="flex items-center space-x-3 mt-1">
                                    <span
                                      className={`text-lg font-bold ${
                                        quest.stars > 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {quest.stars > 0 ? "+" : ""}
                                      {quest.stars} ⭐
                                    </span>
                                    {quest.category && (
                                      <span className="text-xs px-2 py-1 bg-white/15 rounded">
                                        {(() => {
                                          const cat = categories.find(c => c.name === quest.category);
                                          if (cat) {
                                            return `${cat.icon} ${locale === "zh-CN" && cat.name_zh ? cat.name_zh : cat.name_en}`;
                                          }
                                          return quest.category;
                                        })()}
                                      </span>
                                    )}
                                    {!quest.is_active && (
                                      <span className="text-xs px-2 py-1 bg-red-500/15 text-red-300 rounded">
                                        {locale === "zh-CN" ? "已停用" : "Inactive"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingQuest(quest)}
                                  className="px-3 py-1 text-sm bg-blue-500/15 text-blue-300 rounded hover:bg-blue-500/25 transition"
                                >
                                  ✏️ {locale === "zh-CN" ? "编辑" : "Edit"}
                                </button>
                                <button
                                  onClick={() => handleToggleActive(quest)}
                                  className={`px-3 py-1 text-sm rounded transition ${
                                    quest.is_active
                                      ? "bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25"
                                      : "bg-green-500/15 text-green-300 hover:bg-green-500/25"
                                  }`}
                                >
                                  {quest.is_active
                                    ? locale === "zh-CN"
                                      ? "停用"
                                      : "Disable"
                                    : locale === "zh-CN"
                                    ? "启用"
                                    : "Enable"}
                                </button>
                                <button
                                  onClick={() => handleDelete(quest)}
                                  className="px-3 py-1 text-sm bg-red-500/15 text-red-300 rounded hover:bg-red-500/25 transition"
                                >
                                  🗑️ {locale === "zh-CN" ? "删除" : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-12 text-center">
          <p className="text-slate-400 mb-4">
            {locale === "zh-CN" ? "还没有任务模板" : "No quest templates yet"}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition"
          >
            <span>➕</span>
            <span>{t("quests.addFirstQuest")}</span>
          </button>
        </div>
      )}

      {/* Add/Edit Modals */}
      {showAddModal && (
        <QuestFormModal
          familyId={familyId}
          locale={locale}
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}

      {editingQuest && (
        <QuestFormModal
          quest={editingQuest}
          familyId={familyId}
          locale={locale}
          categories={categories}
          onClose={() => setEditingQuest(null)}
          onSuccess={() => {
            setEditingQuest(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
