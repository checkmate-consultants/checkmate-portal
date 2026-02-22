import type { ReactNode } from 'react'
import clsx from 'clsx'
import './table.css'

export type TableColumn<T> = {
  key: string
  header: ReactNode
  /** Used for mobile card layout (data-label). Defaults to header if string. */
  label?: string
  width?: string
  align?: 'left' | 'right' | 'center'
  className?: string
  render?: (item: T) => ReactNode
}

type TableProps<T> = {
  columns: TableColumn<T>[]
  data: T[]
  getRowKey: (item: T) => string
  emptyState?: ReactNode
  className?: string
}

export function Table<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  className,
}: TableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className={clsx('ui-table-empty', className)}>{emptyState}</div>
  }

  if (data.length === 0) {
    return null
  }

  return (
    <div className={clsx('ui-table-wrap', className)}>
      <table className="ui-table">
        <colgroup>
          {columns.map((col) => (
            <col
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  col.className,
                  col.align && `ui-table__cell--${col.align}`,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={getRowKey(item)}>
              {columns.map((col) => {
                const content: ReactNode = col.render
                  ? col.render(item)
                  : ((item as Record<string, unknown>)[col.key] as ReactNode)
                const cellLabel =
                  col.label ??
                  (typeof col.header === 'string' ? col.header : col.key)
                return (
                  <td
                    key={col.key}
                    className={clsx(
                      col.className,
                      col.align && `ui-table__cell--${col.align}`,
                    )}
                    data-label={cellLabel}
                  >
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
