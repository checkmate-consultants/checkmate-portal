import { forwardRef } from 'react'
import type { ForwardedRef, InputHTMLAttributes } from 'react'
import { Input } from './Input.tsx'

type EmailInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  hasError?: boolean
}

/**
 * Reusable email input with type="email" and appropriate attributes for validation.
 * Use with react-hook-form and zod .email() for validation.
 */
export const EmailInput = forwardRef(function EmailInput(
  { hasError = false, ...props }: EmailInputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <Input
      ref={ref}
      type="email"
      autoComplete="email"
      inputMode="email"
      hasError={hasError}
      {...props}
    />
  )
})
