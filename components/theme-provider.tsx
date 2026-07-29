"use client"

import * as React from "react"
import { useServerInsertedHTML } from "next/navigation"
import { toast } from "sonner"

import { updatePreferences } from "@/lib/preferences/actions"

type Theme = "light" | "dark" | "system"
type ThemeVariant = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
  themeLight: ThemeVariant
  themeDark: ThemeVariant
  setThemePair: (pair: {
    light?: ThemeVariant
    dark?: ThemeVariant
  }) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = "theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

function resolveTheme(
  theme: Theme,
  themeLight: ThemeVariant,
  themeDark: ThemeVariant,
  enableSystem: boolean
): "light" | "dark" {
  if (theme === "system" && enableSystem) {
    return getSystemTheme() === "dark" ? themeDark : themeLight
  }
  if (theme === "system") return themeDark
  return theme
}

function ThemeScript() {
  const code = `(function(){try{var k=${JSON.stringify(STORAGE_KEY)};var t=localStorage.getItem(k)||"dark";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(r);d.style.colorScheme=r;}catch(e){}})();`

  useServerInsertedHTML(() => (
    <script
      id="zyvia-theme-script"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  ))

  return null
}

function ThemeProvider({
  children,
  defaultTheme = "dark" as Theme,
  enableSystem = true,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  /** kept for call-site compatibility */
  attribute?: string
  disableTransitionOnChange?: boolean
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [themeLight, setThemeLight] = React.useState<ThemeVariant>("light")
  const [themeDark, setThemeDark] = React.useState<ThemeVariant>("dark")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    defaultTheme === "system" ? "dark" : defaultTheme
  )
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored)
      }
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const resolved = resolveTheme(theme, themeLight, themeDark, enableSystem)

    setResolvedTheme(resolved)
    applyThemeClass(resolved)

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme, themeLight, themeDark, enableSystem, mounted])

  React.useEffect(() => {
    if (!enableSystem) return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (theme === "system") {
        const next = resolveTheme(theme, themeLight, themeDark, enableSystem)
        setResolvedTheme(next)
        applyThemeClass(next)
      }
    }

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme, themeLight, themeDark, enableSystem])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const setThemePair = React.useCallback(
    (pair: { light?: ThemeVariant; dark?: ThemeVariant }) => {
      if (pair.light) setThemeLight(pair.light)
      if (pair.dark) setThemeDark(pair.dark)
    },
    []
  )

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themeLight,
      themeDark,
      setThemePair,
    }),
    [theme, setTheme, resolvedTheme, themeLight, themeDark, setThemePair]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeScript />
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()
  const savingRef = React.useRef(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!event.key || event.key.toLowerCase() !== "d") return
      if (isTypingTarget(event.target)) return
      if (savingRef.current) return

      const previous = resolvedTheme === "dark" ? "dark" : "light"
      const next = previous === "dark" ? "light" : "dark"
      setTheme(next)
      savingRef.current = true

      void updatePreferences({ theme: next })
        .then((result) => {
          if (result.error) {
            // Stay local-only on public pages / signed-out sessions.
            if (result.error.includes("signed in")) return
            setTheme(previous)
            toast.error(result.error, { id: "theme-hotkey" })
            return
          }
          toast.success(
            next === "dark" ? "Dark theme enabled" : "Light theme enabled",
            { id: "theme-hotkey" }
          )
        })
        .catch((error) => {
          setTheme(previous)
          toast.error(
            error instanceof Error ? error.message : "Could not save theme.",
            { id: "theme-hotkey" }
          )
        })
        .finally(() => {
          savingRef.current = false
        })
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, useTheme }
