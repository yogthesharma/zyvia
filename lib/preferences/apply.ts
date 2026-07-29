import type { UserPreferences } from "@/lib/preferences/types"

export function applyInterfacePreferences(
  preferences: Pick<
    UserPreferences,
    "fontSize" | "usePointerCursors" | "underlineLinks"
  >
) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  root.dataset.fontSize = preferences.fontSize
  root.dataset.pointerCursors = preferences.usePointerCursors ? "true" : "false"
  root.dataset.underlineLinks = preferences.underlineLinks ? "true" : "false"
}
