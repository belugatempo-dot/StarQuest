"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import { scopeLabels } from "@/types/quest";
import { getQuestName } from "@/lib/localization";
import RequestStarsModal from "./RequestStarsModal";

type Quest = Database["public"]["Tables"]["quests"]["Row"];

interface QuestGridProps {
  quests: Quest[];
  locale: string;
  userId: string;
}

export default function QuestGrid({ quests, locale, userId }: QuestGridProps) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  // Group quests by scope
  const questsByScope = {
    family: quests.filter((q) => q.scope === "family"),
    self: quests.filter((q) => q.scope === "self"),
    other: quests.filter((q) => q.scope === "other"),
  };

  const getScopeTitle = (scope: "family" | "self" | "other") => {
    return locale === "zh-CN"
      ? scopeLabels[scope].zh
      : scopeLabels[scope].en;
  };

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      learning: "bg-blue-100 text-blue-700 border-blue-300",
      chores: "bg-green-100 text-green-700 border-green-300",
      hygiene: "bg-cyan-100 text-cyan-700 border-cyan-300",
      health: "bg-pink-100 text-pink-700 border-pink-300",
      social: "bg-purple-100 text-purple-700 border-purple-300",
      other: "bg-gray-100 text-gray-700 border-gray-300",
    };
    return colors[category || "other"] || colors.other;
  };

  const renderQuestCard = (quest: Quest) => (
    <div
      key={quest.id}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden group"
      onClick={() => setSelectedQuest(quest)}
    >
      <div className="p-6">
        {/* Icon and Stars */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-4xl">{quest.icon || "⭐"}</div>
          <div className="text-right">
            <div className="text-2xl font-bold text-success">
              +{quest.stars}
            </div>
            <div className="text-xs text-gray-500">{t("common.stars")}</div>
          </div>
        </div>

        {/* Quest Name */}
        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition">
          {getQuestName(quest, locale)}
        </h3>

        {/* Category Badge */}
        {quest.category && (
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
              quest.category
            )}`}
          >
            {t(`quests.category.${quest.category}` as any)}
          </span>
        )}

        {/* Action Hint */}
        <div className="mt-4 text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition">
          Click to request stars →
        </div>
      </div>
    </div>
  );

  return (
    <>
      {quests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-gray-500 text-lg">{t("common.noData")}</p>
          <p className="text-sm text-gray-400 mt-2">
            Your parents haven't set up any bonus quests yet!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Helping Family Section */}
          {questsByScope.family.length > 0 && (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">{scopeLabels.family.icon}</span>
                <h2 className="text-2xl font-bold">
                  {getScopeTitle("family")}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questsByScope.family.map(renderQuestCard)}
              </div>
            </div>
          )}

          {/* Self Improvement Section */}
          {questsByScope.self.length > 0 && (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">{scopeLabels.self.icon}</span>
                <h2 className="text-2xl font-bold">{getScopeTitle("self")}</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questsByScope.self.map(renderQuestCard)}
              </div>
            </div>
          )}

          {/* Helping Others Section */}
          {questsByScope.other.length > 0 && (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">{scopeLabels.other.icon}</span>
                <h2 className="text-2xl font-bold">{getScopeTitle("other")}</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questsByScope.other.map(renderQuestCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Stars Modal */}
      {selectedQuest && (
        <RequestStarsModal
          quest={selectedQuest}
          locale={locale}
          userId={userId}
          onClose={() => setSelectedQuest(null)}
          onSuccess={() => {
            setSelectedQuest(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
