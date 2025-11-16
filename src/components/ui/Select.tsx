import { forwardRef } from 'react'
import type { ForwardedRef, ReactNode } from 'react'
import clsx from 'clsx'
import './select.css'

type SelectProps = {
  className?: string
  hasError?: boolean
  leadingIcon?: ReactNode
  size?: 'md' | 'sm'
  [key: string]: unknown
}

export const Select = forwardRef(function Select(
  {
    className,
    hasError = false,
    leadingIcon,
    size = 'md',
    ...props
  }: SelectProps,
  ref: ForwardedRef<HTMLSelectElement>,
) {
  return (
    <span
      className={clsx(
        'ui-select',
        hasError && 'ui-select--error',
        size === 'sm' && 'ui-select--sm',
      )}
    >
      {leadingIcon && (
        <span className="ui-select__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <select
        ref={ref}
        className={clsx('ui-select__field', className)}
        {...props}
      />
      <span className="ui-select__chevron" aria-hidden="true" />
    </span>
  )
})


