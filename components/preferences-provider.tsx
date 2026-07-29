"use client"

import * as React from "react"

import { applyInterfacePreferences } from "@/lib/preferences/apply"
import type { UserPreferences } from "@/lib/preferences/types"
import { useTheme } from "@/components/theme-provider"

type PreferencesContextValue = {
  preferences: UserPreferences
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>
}

const PreferencesContext = React.createContext<PreferencesContextValue | null>(
  null
)

export function PreferencesProvider({
  initialPreferences,
  children,
}: {
  initialPreferences: UserPreferences
  children: React.ReactNode
}) {
  const [preferences, setPreferences] =
    React.useState<UserPreferences>(initialPreferences)
  const { theme, setTheme, setThemePair } = useTheme()
  const syncedTheme = React.useRef(false)

  React.useEffect(() => {
    applyInterfacePreferences(preferences)
  }, [preferences])

  React.useEffect(() => {
    setThemePair({
      light: preferences.themeLight,
      dark: preferences.themeDark,
    })
  }, [preferences.themeLight, preferences.themeDark, setThemePair])

  // Prefer DB theme over localStorage once per workspace session.
  React.useEffect(() => {
    if (syncedTheme.current) return
    syncedTheme.current = true
    if (theme !== initialPreferences.theme) {
      setTheme(initialPreferences.theme)
    }
  }, [initialPreferences.theme, setTheme, theme])

  // Keep preferences.theme aligned with ThemeProvider (hotkey / external changes).
  React.useEffect(() => {
    setPreferences((prev) =>
      prev.theme === theme ? prev : { ...prev, theme }
    )
  }, [theme])

  const value = React.useMemo(
    () => ({ preferences, setPreferences }),
    [preferences]
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = React.useContext(PreferencesContext)
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider")
  }
  return ctx
}
