"use client";

export interface ChildStat {
  childId: string;
  childName: string;
  childAvatar: string | null;
  currentStars: number;
  spendableStars: number;
  creditEnabled: boolean;
  creditLimit: number;
  creditUsed: number;
  availableCredit: number;
  totalEarned: number;
  totalDeducted: number;
  totalRedeemed: number;
}

interface PerChildStatCardsProps {
  locale: string;
  childStats: ChildStat[];
}

export default function PerChildStatCards({
  locale,
  childStats,
}: PerChildStatCardsProps) {
  const isZh = locale === "zh-CN";

  if (childStats.length === 0) return null;

  return (
    <div className="space-y-4">
      {childStats.map((child) => (
        <div
          key={child.childId}
          className="stat-night-card rounded-lg shadow-lg p-4"
        >
          {/* Child header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-lg">
              {child.childAvatar || "👤"}
            </div>
            <span className="font-semibold text-white">{child.childName}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Current Stars */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-400">
                {isZh ? "⭐ 当前星星" : "⭐ Current Stars"}
              </div>
              <div
                className={`text-xl font-bold ${
                  child.currentStars >= 0 ? "text-yellow-300" : "text-red-400"
                }`}
              >
                {child.currentStars}
              </div>
            </div>

            {/* Earned */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-400">
                {isZh ? "总获得" : "Total Earned"}
              </div>
              <div className="text-xl font-bold text-green-400">
                +{child.totalEarned}
              </div>
            </div>

            {/* Deducted */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-400">
                {isZh ? "总扣除" : "Total Deducted"}
              </div>
              <div className="text-xl font-bold text-red-400">
                {child.totalDeducted}
              </div>
            </div>

            {/* Redeemed */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-slate-400">
                {isZh ? "🎁 已兑换" : "🎁 Redeemed"}
              </div>
              <div className="text-xl font-bold text-purple-300">
                {child.totalRedeemed}
              </div>
            </div>
          </div>

          {/* Credit section */}
          {child.creditEnabled && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {child.currentStars >= 0 ? (
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400">
                      {isZh ? "💳 信用额度" : "💳 Credit Limit"}
                    </div>
                    <div className="text-lg font-bold text-blue-300">
                      {child.creditLimit}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-slate-400">
                        {isZh ? "⚠️ 欠款" : "⚠️ Debt"}
                      </div>
                      <div className="text-lg font-bold text-red-400">
                        {child.creditUsed}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-slate-400">
                        {isZh ? "💳 剩余信用" : "💳 Remaining Credit"}
                      </div>
                      <div className="text-lg font-bold text-blue-300">
                        {child.availableCredit}
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-slate-400">
                    {isZh ? "🛒 可消费" : "🛒 Can Spend"}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {child.spendableStars}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No credit — just show spendable */}
          {!child.creditEnabled && (
            <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {isZh ? "🛒 可消费" : "🛒 Can Spend"}
              </span>
              <span className="text-xl font-bold text-primary">
                {child.spendableStars} ⭐
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
