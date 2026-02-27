import { forwardRef } from 'react'
import type { ForwardedRef, InputHTMLAttributes } from 'react'
import { Input } from './Input.tsx'

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  hasError?: boolean
}

/**
 * Reusable phone input with type="tel" and appropriate attributes for validation.
 * Use with react-hook-form and a phone pattern (e.g. zod .regex() or .refine()) for validation.
 */
export const PhoneInput = forwardRef(function PhoneInput(
  { hasError = false, ...props }: PhoneInputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <Input
      ref={ref}
      type="tel"
      autoComplete="tel"
      inputMode="tel"
      hasError={hasError}
      {...props}
    />
  )
})
