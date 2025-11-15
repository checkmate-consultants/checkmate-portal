import { forwardRef } from 'react'
import type { ForwardedRef, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import './textarea.css'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean
}

export const Textarea = forwardRef(function Textarea(
  { className, hasError = false, ...props }: TextareaProps,
  ref: ForwardedRef<HTMLTextAreaElement>,
) {
  return (
    <textarea
      ref={ref}
      className={clsx('ui-textarea', hasError && 'ui-textarea--error', className)}
      {...props}
    />
  )
})


