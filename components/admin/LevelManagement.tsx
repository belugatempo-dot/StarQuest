"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import LevelFormModal from "./LevelFormModal";

type Level = Database["public"]["Tables"]["levels"]["Row"];

interface LevelManagementProps {
  levels: Level[];
  locale: string;
}

export default function LevelManagement({
  levels,
  locale,
}: LevelManagementProps) {
  const router = useRouter();
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);

  const getLevelName = (level: Level) => {
    return locale === "zh-CN"
      ? level.name_zh || level.name_en
      : level.name_en;
  };

  const formatStars = (stars: number) => {
    return stars.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border-2 border-primary/20">
        <div className="flex items-start space-x-4">
          <div className="text-4xl">💡</div>
          <div>
            <h3 className="font-bold text-lg mb-2">
              {locale === "zh-CN" ? "关于等级系统" : "About Level System"}
            </h3>
            <p className="text-gray-700 mb-2">
              {locale === "zh-CN"
                ? "等级基于孩子累计获得的正星星总数。星星要求应该逐级递增，以确保孩子能够稳步晋级。"
                : "Levels are based on total lifetime positive stars earned. Star requirements should increase progressively to ensure children can level up gradually."}
            </p>
            <p className="text-sm text-gray-600">
              {locale === "zh-CN"
                ? "提示：花费星星兑换奖励不会影响等级进度。"
                : "Note: Spending stars on rewards does not affect level progression."}
            </p>
          </div>
        </div>
      </div>

      {/* Levels List */}
      {levels.length > 0 ? (
        <div className="space-y-4">
          {levels.map((level, index) => {
            const levelName = getLevelName(level);
            const nextLevel = levels[index + 1];
            const isLastLevel = index === levels.length - 1;

            return (
              <div key={level.id}>
                <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden hover:shadow-lg transition">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      {/* Level Info */}
                      <div className="flex items-center space-x-6 flex-1">
                        {/* Level Number Badge */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {level.level_number}
                          </div>
                        </div>

                        {/* Icon */}
                        <div className="text-5xl">{level.icon || "⭐"}</div>

                        {/* Name and Stars */}
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            {levelName}
                          </h3>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">
                                {locale === "zh-CN" ? "需要" : "Requires"}:
                              </span>
                              <span className="text-lg font-bold text-primary">
                                {formatStars(level.stars_required)} ⭐
                              </span>
                            </div>
                            {!isLastLevel && nextLevel && (
                              <div className="text-sm text-gray-500">
                                {locale === "zh-CN" ? "距下一级" : "Next level"}:{" "}
                                <span className="font-semibold">
                                  {formatStars(
                                    (nextLevel as any).stars_required -
                                      level.stars_required
                                  )}
                                </span>{" "}
                                ⭐
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit Button */}
                      <div>
                        <button
                          onClick={() => setEditingLevel(level)}
                          className="px-5 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-semibold"
                        >
                          ✏️ {locale === "zh-CN" ? "编辑" : "Edit"}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar (visual representation of gap to next level) */}
                    {!isLastLevel && nextLevel && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connector to next level */}
                  {!isLastLevel && (
                    <div className="flex justify-center">
                      <div className="w-1 h-8 bg-gradient-to-b from-gray-300 to-transparent"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">⭐</div>
          <p className="text-gray-500 text-lg">
            {locale === "zh-CN"
              ? "还没有配置等级。等级会在家庭创建时自动生成。"
              : "No levels configured yet. Levels are automatically created when a family is set up."}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingLevel && (
        <LevelFormModal
          level={editingLevel}
          locale={locale}
          onClose={() => setEditingLevel(null)}
          onSuccess={() => {
            setEditingLevel(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
