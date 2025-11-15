import { createContext, useContext } from 'react'
import type { ThemeMode, ThemeTokens } from './tokens.ts'

export type ThemeContextValue = {
  theme: ThemeTokens
  mode: ThemeMode
  toggleMode: () => void
  setMode: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export const useThemeContext = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}

