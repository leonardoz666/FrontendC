'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

type ThemeToggleProps = {
  className?: string
  compact?: boolean
}

export function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useTheme()
  const dark = mounted && theme === 'dark'
  const label = dark ? 'Usar modo claro' : 'Usar modo escuro'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${compact ? 'h-9 w-9' : 'h-10 px-3'} ${className}`}
    >
      {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      {!compact && <span className="hidden text-sm sm:inline">{dark ? 'Claro' : 'Escuro'}</span>}
    </button>
  )
}
