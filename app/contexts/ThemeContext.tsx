'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ColorTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: ColorTheme
  mounted: boolean
  setTheme: (theme: ColorTheme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'controlae-color-theme'
type BrandTheme = 'CLARO' | 'ESCURO' | 'SISTEMA'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function tenantThemeStorageKey(): string {
  const match = document.cookie.match(/(?:^|;\s*)controlae_tenant_slug=([^;]+)/)
  const tenant = match ? decodeURIComponent(match[1]) : 'tenant-unresolved'
  return `${STORAGE_KEY}:${tenant}`
}

function systemTheme(): ColorTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveBrandTheme(preference: BrandTheme): ColorTheme {
  if (preference === 'CLARO') return 'light'
  if (preference === 'ESCURO') return 'dark'
  return systemTheme()
}

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
    const stored = window.localStorage.getItem(tenantThemeStorageKey())
    const initialTheme: ColorTheme = stored === 'light' || stored === 'dark'
      ? stored
      : systemTheme()

    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)

    const applyBrandPreference = (event: Event) => {
      const preference = (event as CustomEvent<BrandTheme>).detail
      if (!['CLARO', 'ESCURO', 'SISTEMA'].includes(preference)) return
      const storedTheme = window.localStorage.getItem(tenantThemeStorageKey())
      const brandedTheme: ColorTheme = storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : resolveBrandTheme(preference)
      setThemeState(brandedTheme)
      applyTheme(brandedTheme)
    }
    window.addEventListener('controlae-branding-theme', applyBrandPreference)
    return () => window.removeEventListener('controlae-branding-theme', applyBrandPreference)
  }, [])

  const setTheme = useCallback((nextTheme: ColorTheme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem(tenantThemeStorageKey(), nextTheme)
    applyTheme(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(themeAtual => {
      const nextTheme = themeAtual === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(tenantThemeStorageKey(), nextTheme)
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
