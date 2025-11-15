import type { ButtonHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme/useTheme.ts'
import './theme-toggle.css'

type ThemeToggleProps = ButtonHTMLAttributes<HTMLButtonElement>

export function ThemeToggle({ ...props }: ThemeToggleProps) {
  const { mode, toggleMode } = useTheme()
  const { t, i18n } = useTranslation()
  const isDark = mode === 'dark'
  const dir = i18n.dir()

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={t('ui.toggleTheme')}
      onClick={toggleMode}
      data-mode={isDark ? 'dark' : 'light'}
      dir={dir}
      {...props}
    >
      <span className="theme-toggle__thumb">
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}

