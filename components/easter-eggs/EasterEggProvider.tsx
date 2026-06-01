"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { getThemeMode, setThemeMode as persistMode, THEME_MODE_KEY, type ThemeMode } from "@/lib/easterEggs"

// ─── Context ──────────────────────────────────────────────────────────────────

interface EasterEggContextValue {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  isEnabled: boolean
}

const EasterEggContext = createContext<EasterEggContextValue>({
  mode: "subtle",
  setMode: () => {},
  isEnabled: true,
})

export function useEasterEgg(): EasterEggContextValue {
  return useContext(EasterEggContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function EasterEggProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("subtle")

  useEffect(() => {
    setModeState(getThemeMode())

    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_MODE_KEY || !e.newValue) return
      const v = e.newValue as ThemeMode
      if (v === "full" || v === "subtle" || v === "off") setModeState(v)
    }
    function onCustom() { setModeState(getThemeMode()) }

    window.addEventListener("storage", onStorage)
    window.addEventListener("rs-theme-change", onCustom)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("rs-theme-change", onCustom)
    }
  }, [])

  function setMode(m: ThemeMode) {
    persistMode(m)
    setModeState(m)
    window.dispatchEvent(new Event("rs-theme-change"))
  }

  return (
    <EasterEggContext.Provider value={{ mode, setMode, isEnabled: mode !== "off" }}>
      {children}
    </EasterEggContext.Provider>
  )
}
