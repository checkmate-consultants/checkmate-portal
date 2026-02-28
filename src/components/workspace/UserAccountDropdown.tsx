import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import { LanguageSwitcher } from '../LanguageSwitcher.tsx'
import { ThemeToggle } from '../ThemeToggle.tsx'
import './user-account-dropdown.css'

type UserAccountDropdownProps = {
  user: User
  onSignOut: () => void
}

export function getDisplayName(user: User | null): string {
  if (!user) return ''
  const name = user.user_metadata?.full_name as string | undefined
  if (name && name.trim()) return name.trim()
  return user.email ?? ''
}

export function UserAccountDropdown({ user, onSignOut }: UserAccountDropdownProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayName = getDisplayName(user)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  const handleAccountClick = () => {
    setOpen(false)
    navigate('/workspace/account/profile')
  }

  const handleSignOutClick = () => {
    setOpen(false)
    onSignOut()
  }

  return (
    <div className="user-account-dropdown" ref={containerRef}>
      <button
        type="button"
        className="user-account-dropdown__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('workspace.accountMenu.label')}
      >
        <span className="user-account-dropdown__name">{displayName}</span>
        <span className="user-account-dropdown__chevron" aria-hidden>
          ▼
        </span>
      </button>
      {open && (
        <div className="user-account-dropdown__menu" role="menu">
          <div className="user-account-dropdown__row" role="none">
            <span className="user-account-dropdown__row-label">{t('workspace.accountMenu.language')}</span>
            <LanguageSwitcher />
          </div>
          <div className="user-account-dropdown__row" role="none">
            <span className="user-account-dropdown__row-label">{t('workspace.accountMenu.theme')}</span>
            <ThemeToggle />
          </div>
          <div className="user-account-dropdown__separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="user-account-dropdown__item"
            onClick={handleAccountClick}
          >
            {t('workspace.accountMenu.account')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-account-dropdown__item"
            onClick={handleSignOutClick}
          >
            {t('workspace.accountMenu.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
