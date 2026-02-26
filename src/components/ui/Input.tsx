import { forwardRef, useState } from 'react'
import type {
  ForwardedRef,
  InputHTMLAttributes,
  ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import './input.css'

const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
)

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
  leadingIcon?: ReactNode
}

export const Input = forwardRef(function Input(
  { className, hasError = false, leadingIcon, disabled, type, ...props }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const { t } = useTranslation()
  const isPassword = type === 'password'
  const [showPassword, setShowPassword] = useState(false)
  const inputType = isPassword && showPassword ? 'text' : type
  const toggleLabel = showPassword ? t('ui.hidePassword') : t('ui.showPassword')

  return (
    <span
      className={clsx(
        'ui-input',
        hasError && 'ui-input--error',
        disabled && 'ui-input--disabled',
        isPassword && 'ui-input--password',
      )}
    >
      {leadingIcon && (
        <span className="ui-input__icon ui-input__icon--leading" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={clsx('ui-input__field', className)}
        disabled={disabled}
        type={inputType}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          className="ui-input__toggle"
          onClick={() => setShowPassword((s) => !s)}
          disabled={disabled}
          tabIndex={-1}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </span>
  )
})

