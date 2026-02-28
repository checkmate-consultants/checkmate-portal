import { useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import clsx from 'clsx'
import { Input } from './Input.tsx'
import { Select } from './Select.tsx'
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

/** Single filter definition. For client-side filtering, getValue is required. */
export type TableFilterConfig<T> = {
  key: string
  label: string
  type: 'select' | 'text'
  /** Options for select type. Use empty string value for "All" / no filter. */
  options?: { value: string; label: string }[]
  /** Used in client mode to get the value from each row for comparison. */
  getValue?: (item: T) => unknown
  placeholder?: string
}

export type TableFilterMode = 'client' | 'server'

type TableProps<T> = {
  columns: TableColumn<T>[]
  data: T[]
  getRowKey: (item: T) => string
  emptyState?: ReactNode
  className?: string
  /** Filter definitions. When provided, a filter bar is rendered. */
  filters?: TableFilterConfig<T>[]
  /** When 'client', table filters data locally using getValue. When 'server', parent controls data and receives onFilterChange. */
  filterMode?: TableFilterMode
  /** Controlled filter values (used when filterMode is 'server'). */
  filterValues?: Record<string, unknown>
  /** Called when filter values change (required for filterMode 'server' when filters are used). */
  onFilterChange?: (values: Record<string, unknown>) => void
}

function defaultFilterValues(filters: TableFilterConfig<unknown>[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const f of filters) {
    values[f.key] = f.type === 'select' ? '' : ''
  }
  return values
}

function matchesFilter<T>(
  item: T,
  filter: TableFilterConfig<T>,
  value: unknown,
): boolean {
  if (value === undefined || value === null || value === '') return true
  const rowValue = filter.getValue?.(item)
  if (filter.type === 'select') {
    const str = String(rowValue ?? '')
    return str === String(value)
  }
  // text: substring match (case-insensitive)
  const search = String(value).trim().toLowerCase()
  if (!search) return true
  const str = String(rowValue ?? '').toLowerCase()
  return str.includes(search)
}

export function Table<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  className,
  filters = [],
  filterMode = 'client',
  filterValues: controlledFilterValues,
  onFilterChange,
}: TableProps<T>) {
  const [internalFilterValues, setInternalFilterValues] = useState<Record<string, unknown>>(
    () => defaultFilterValues(filters as TableFilterConfig<unknown>[]),
  )

  const filterValues =
    filterMode === 'server' && controlledFilterValues !== undefined
      ? controlledFilterValues
      : internalFilterValues

  const setFilterValue = (key: string, value: unknown) => {
    const next = { ...filterValues, [key]: value }
    if (filterMode === 'server') {
      onFilterChange?.(next)
    } else {
      setInternalFilterValues(next)
    }
  }

  const filteredData = useMemo(() => {
    if (filterMode !== 'client' || filters.length === 0) return data
    return data.filter((item) =>
      filters.every((f) => matchesFilter(item, f, filterValues[f.key])),
    )
  }, [data, filterMode, filters, filterValues])

  const hasFilters = filters.length > 0
  const displayData = filterMode === 'client' ? filteredData : data
  const isEmpty = displayData.length === 0

  if (data.length === 0 && !hasFilters && emptyState) {
    return <div className={clsx('ui-table-empty', className)}>{emptyState}</div>
  }

  return (
    <div className={clsx('ui-table-container', className)}>
      {hasFilters && (
        <div className="ui-table-filters">
          {filters.map((filter) => (
            <div key={filter.key} className="ui-table-filter">
              <label className="ui-table-filter__label" htmlFor={`table-filter-${filter.key}`}>
                {filter.label}
              </label>
              {filter.type === 'select' ? (
                <Select
                  id={`table-filter-${filter.key}`}
                  value={String(filterValues[filter.key] ?? '')}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterValue(filter.key, e.target.value)}
                  className="ui-table-filter__control"
                >
                  {(filter.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={`table-filter-${filter.key}`}
                  type="text"
                  value={String(filterValues[filter.key] ?? '')}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterValue(filter.key, e.target.value)}
                  placeholder={filter.placeholder}
                  className="ui-table-filter__control"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isEmpty && emptyState ? (
        <div className="ui-table-empty">{emptyState}</div>
      ) : isEmpty ? (
        <div className="ui-table-empty">No results match the current filters.</div>
      ) : (
        <div className="ui-table-wrap">
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
          {displayData.map((item) => (
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
      )}
    </div>
  )
}
