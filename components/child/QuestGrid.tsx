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
      learning: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      chores: "bg-green-500/15 text-green-300 border-green-500/30",
      hygiene: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      health: "bg-pink-500/15 text-pink-300 border-pink-500/30",
      social: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      other: "bg-white/10 text-slate-300 border-white/20",
    };
    return colors[category || "other"] || colors.other;
  };

  const renderQuestCard = (quest: Quest) => (
    <div
      key={quest.id}
      className="dark-card rounded-lg shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden group"
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
            <div className="text-xs text-slate-400">{t("common.stars")}</div>
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
        <div className="mt-4 text-sm text-slate-400 opacity-0 group-hover:opacity-100 transition">
          Click to request stars →
        </div>
      </div>
    </div>
  );

  return (
    <>
      {quests.length === 0 ? (
        <div className="dark-card rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-slate-400 text-lg">{t("common.noData")}</p>
          <p className="text-sm text-slate-500 mt-2">
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
