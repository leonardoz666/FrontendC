'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ColorTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: ColorTheme
  mounted: boolean
  setTheme: (theme: ColorTheme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'rei-color-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: ColorTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#0b1220' : '#ea580c'
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const initialTheme: ColorTheme = stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  const setTheme = useCallback((nextTheme: ColorTheme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    applyTheme(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(themeAtual => {
      const nextTheme = themeAtual === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
      applyTheme(nextTheme)
      return nextTheme
    })
  }, [])

  const value = useMemo(() => ({ theme, mounted, setTheme, toggleTheme }), [mounted, setTheme, theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return context
}

export const themeStorageKey = STORAGE_KEY
