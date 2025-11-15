import { forwardRef } from 'react'
import type {
  ForwardedRef,
  InputHTMLAttributes,
  ReactNode,
} from 'react'
import clsx from 'clsx'
import './input.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
  leadingIcon?: ReactNode
}

export const Input = forwardRef(function Input(
  { className, hasError = false, leadingIcon, ...props }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <span className={clsx('ui-input', hasError && 'ui-input--error')}>
      {leadingIcon && (
        <span className="ui-input__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={clsx('ui-input__field', className)}
        {...props}
      />
    </span>
  )
})

