import type { ReactNode } from 'react'
import clsx from 'clsx'
import './form-field.css'

type FormFieldProps = {
  label: string
  helperText?: string
  error?: string
  id: string
  children: ReactNode
}

export function FormField({
  label,
  helperText,
  error,
  id,
  children,
}: FormFieldProps) {
  return (
    <label className="form-field" htmlFor={id}>
      <span className="form-field__label">
        {label}
        {helperText && (
          <span className="form-field__helper">{helperText}</span>
        )}
      </span>
      {children}
      <span className={clsx('form-field__message', error && 'is-error')}>
        {error ?? helperText ?? ''}
      </span>
    </label>
  )
}

