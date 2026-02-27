// Theme is always "night" — no React context needed.
// These constants replace the previous useTheme() hook.
export const theme = {
  mode: "night" as const,
  isDayMode: false,
  isNightMode: true,
};

export function useTheme() {
  return theme;
}
