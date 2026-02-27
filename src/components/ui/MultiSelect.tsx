import { useRef, useEffect, useState } from 'react'
import clsx from 'clsx'
import './multi-select.css'

export type MultiSelectOption = {
  value: string
  label: string
}

type MultiSelectProps = {
  id: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  hasError?: boolean
  disabled?: boolean
  /** Optional filter placeholder when dropdown is open */
  searchPlaceholder?: string
  className?: string
}

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  hasError = false,
  disabled = false,
  searchPlaceholder = 'Search…',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOptions = options.filter((o) => value.includes(o.value))
  const filteredOptions = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : options

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const remove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        'multi-select',
        hasError && 'multi-select--error',
        disabled && 'multi-select--disabled',
        open && 'multi-select--open',
        className,
      )}
    >
      <button
        type="button"
        id={id}
        className="multi-select__trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className="multi-select__value">
          {selectedOptions.length === 0 ? (
            <span className="multi-select__placeholder">{placeholder}</span>
          ) : (
            selectedOptions.map((o) => (
              <span key={o.value} className="multi-select__tag">
                {o.label}
                {!disabled && (
                  <button
                    type="button"
                    className="multi-select__tag-remove"
                    onClick={(e) => remove(o.value, e)}
                    aria-label={`Remove ${o.label}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          )}
        </span>
        <span className="multi-select__chevron" aria-hidden>
          ▼
        </span>
      </button>
      {open && (
        <div
          className="multi-select__dropdown"
          role="listbox"
          aria-multiselectable="true"
        >
          <input
            type="text"
            className="multi-select__search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
          />
          <ul className="multi-select__list">
            {filteredOptions.length === 0 ? (
              <li className="multi-select__empty">No options</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={value.includes(opt.value)}
                  className={clsx(
                    'multi-select__option',
                    value.includes(opt.value) && 'multi-select__option--selected',
                  )}
                  onClick={() => toggle(opt.value)}
                >
                  <span className="multi-select__option-check">
                    {value.includes(opt.value) ? '✓' : ''}
                  </span>
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
