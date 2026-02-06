/**
 * Localization Utility Functions
 *
 * Shared bilingual name resolution helpers used across components.
 * Eliminates duplicated getQuestName/getRewardName patterns.
 */

/**
 * Returns the localized name based on locale.
 * Falls back to English name if Chinese name is not available.
 */
export function getLocalizedName(
  enName: string,
  zhName: string | null | undefined,
  locale: string
): string {
  return locale === "zh-CN" ? zhName || enName : enName;
}

/**
 * Get localized quest name from a quest object or joined quest relation.
 * Handles both direct Quest objects and nested `.quests` relations.
 */
export function getQuestName(
  quest: { name_en: string; name_zh: string | null } | null | undefined,
  locale: string
): string {
  if (!quest) return "Unknown Quest";
  return getLocalizedName(quest.name_en, quest.name_zh, locale);
}

/**
 * Get localized reward name from a reward object or joined reward relation.
 */
export function getRewardName(
  reward: { name_en: string; name_zh: string | null } | null | undefined,
  locale: string
): string {
  if (!reward) return "Unknown Reward";
  return getLocalizedName(reward.name_en, reward.name_zh, locale);
}
