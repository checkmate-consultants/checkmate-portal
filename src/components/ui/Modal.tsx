import type { ReactNode } from 'react'
import clsx from 'clsx'
import './modal.css'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose?: () => void
  actions?: ReactNode
  /** Optional class applied to the content wrapper for size/layout overrides */
  contentClassName?: string
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  actions,
  contentClassName,
}: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ui-modal__backdrop" onClick={onClose} />
      <div className={clsx('ui-modal__content', contentClassName)}>
        <header className="ui-modal__header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </header>
        <div className="ui-modal__body">{children}</div>
        {actions && <footer className="ui-modal__footer">{actions}</footer>}
      </div>
    </div>
  )
}


