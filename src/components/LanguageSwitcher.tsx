import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import './language-switcher.css'

const SUPPORTED = [
  { label: 'English', value: 'en' },
  { label: 'العربية', value: 'ar' },
]

const LanguageIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    role="presentation"
    aria-hidden="true"
  >
    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M2.5 7.5h13M2.5 10.5h13"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
    <path
      d="M9 2c1.5 2 2.3 4.5 2.3 7s-.8 5-2.3 7c-1.5-2-2.3-4.5-2.3-7s.8-5 2.3-7Z"
      stroke="currentColor"
      strokeWidth="1.25"
      fill="none"
    />
  </svg>
)

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value)
  }

  const normalized = (i18n.resolvedLanguage ?? 'en').split('-')[0]
  const activeValue =
    SUPPORTED.find((lang) => lang.value === normalized)?.value ??
    SUPPORTED[0].value

  return (
    <div className="language-switcher">
      <span className="language-switcher__icon">
        <LanguageIcon />
      </span>
      <select
        className="language-switcher__native"
        value={activeValue}
        onChange={handleChange}
        aria-label={t('ui.changeLanguage')}
      >
        {SUPPORTED.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}

