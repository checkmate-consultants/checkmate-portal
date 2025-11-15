import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import './button.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export function Button({
  children,
  className,
  variant = 'primary',
  icon,
  disabled,
  loading = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx('ui-button', `ui-button--${variant}`, className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      <span className="ui-button__content">
        {icon && <span className="ui-button__icon">{icon}</span>}
        {children}
        {loading && (
          <span className="ui-button__spinner" aria-hidden="true" />
        )}
      </span>
    </button>
  )
}

