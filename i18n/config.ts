export const locales = ["en", "zh-CN"] as const;
export type Locale = (typeof locales)[number];
