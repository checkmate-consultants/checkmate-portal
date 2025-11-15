import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getTheme } from './tokens.ts'
import type { ThemeMode } from './tokens.ts'
import { ThemeContext } from './theme-context.ts'

const THEME_STORAGE_KEY = 'checkmate-theme-mode'

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem(
      THEME_STORAGE_KEY,
    ) as ThemeMode | null
    if (stored === 'light' || stored === 'dark') return stored
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    return prefersDark ? 'dark' : 'light'
  })

  const theme = useMemo(() => getTheme(mode), [mode])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    }
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light')
  }, [mode, setMode])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = mode

    const vars: Record<string, string | number> = {
      '--font-family': theme.font.family,
      '--font-family-heading': theme.font.heading,
      '--font-size-md': theme.font.size.md,
      '--font-size-sm': theme.font.size.sm,
      '--font-size-lg': theme.font.size.lg,
      '--line-height-normal': String(theme.font.lineHeight.normal),
      '--spacing-4': theme.spacing[4],
      '--spacing-6': theme.spacing[6],
      '--spacing-8': theme.spacing[8],
      '--radius-lg': theme.radii.lg,
      '--radius-md': theme.radii.md,
      '--radius-pill': theme.radii.pill,
      '--shadow-soft': theme.shadow.soft,
      '--shadow-medium': theme.shadow.medium,
      '--layout-max-width': theme.layout.maxWidth,
      '--color-bg': theme.palette.background,
      '--color-surface': theme.palette.surface,
      '--color-surface-muted': theme.palette.surfaceMuted,
      '--color-text': theme.palette.textPrimary,
      '--color-text-muted': theme.palette.textSecondary,
      '--color-accent': theme.palette.accent,
      '--color-accent-strong': theme.palette.accentStrong,
      '--color-border': theme.palette.border,
      '--color-success': theme.palette.success,
      '--color-danger': theme.palette.danger,
    }

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, String(value))
    })
  }, [theme, mode])

  const value = useMemo(
    () => ({
      theme,
      mode,
      toggleMode,
      setMode,
    }),
    [mode, setMode, theme, toggleMode],
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

