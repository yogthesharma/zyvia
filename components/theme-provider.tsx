"use client"

import * as React from "react"
import { useServerInsertedHTML } from "next/navigation"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
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

    const resolved =
      theme === "system" && enableSystem ? getSystemTheme() : theme === "system" ? "dark" : theme

    setResolvedTheme(resolved)
    applyThemeClass(resolved)

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme, enableSystem, mounted])

  React.useEffect(() => {
    if (!enableSystem) return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (theme === "system") {
        const next = getSystemTheme()
        setResolvedTheme(next)
        applyThemeClass(next)
      }
    }

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme, enableSystem])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const value = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
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

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!event.key || event.key.toLowerCase() !== "d") return
      if (isTypingTarget(event.target)) return

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, useTheme }
