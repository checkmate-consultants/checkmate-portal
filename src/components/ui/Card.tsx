import type { HTMLAttributes } from 'react'
import clsx from 'clsx'
import './card.css'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx('ui-card', className)}
      {...props}
    />
  )
}

