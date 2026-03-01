import clsx from 'clsx'
import { FormField } from '../ui/FormField.tsx'
import { Input } from '../ui/Input.tsx'
import { Textarea } from '../ui/Textarea.tsx'
import type { VisitReportQuestion } from '../../data/companyManagement.ts'

type Props = {
  question: VisitReportQuestion
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  /** Show "(required)"-style suffix next to the label when question is required */
  requiredSuffix?: string
  /** Mark field as invalid and show error message */
  hasError?: boolean
  errorMessage?: string
}

export function ReportFormField({ question, value, onChange, disabled, requiredSuffix, hasError, errorMessage }: Props) {
  const id = `q-${question.id}`
  const raw = value ?? ''
  const label = question.required && requiredSuffix ? `${question.label} ${requiredSuffix}` : question.label
  const wrapperClass = clsx('report-form-field', hasError && 'report-form-field--error')

  switch (question.questionType) {
    case 'short_text':
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
            <Input
              id={id}
              value={raw}
              onChange={(e) => onChange(e.target.value || null)}
              disabled={disabled}
              hasError={!!hasError}
            />
          </FormField>
        </div>
      )
    case 'long_text':
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
            <Textarea
              id={id}
              value={raw}
              onChange={(e) => onChange(e.target.value || null)}
              disabled={disabled}
              hasError={!!hasError}
            />
          </FormField>
        </div>
      )
    case 'number':
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
            <Input
              id={id}
              type="number"
              value={raw}
              onChange={(e) => onChange(e.target.value || null)}
              disabled={disabled}
              hasError={!!hasError}
            />
          </FormField>
        </div>
      )
    case 'date':
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
            <Input
              id={id}
              type="date"
              value={raw}
              onChange={(e) => onChange(e.target.value || null)}
              disabled={disabled}
              hasError={!!hasError}
            />
          </FormField>
        </div>
      )
    case 'datetime':
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
            <Input
              id={id}
              type="datetime-local"
              value={raw}
              onChange={(e) => onChange(e.target.value || null)}
              disabled={disabled}
              hasError={!!hasError}
            />
          </FormField>
        </div>
      )
    case 'rating': {
      const n = raw ? parseInt(raw, 10) : 0
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
          <div className="report-form-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="report-form-rating__star"
                disabled={disabled}
                onClick={() => onChange(String(star))}
                aria-label={`${star}`}
              >
                {star <= n ? '★' : '☆'}
              </button>
            ))}
          </div>
        </FormField>
        </div>
      )
    }
    case 'single_choice': {
      const options = question.options ?? []
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
          <div className="report-form-choices" role="group">
            {options.map((opt) => (
              <label key={opt.value} className="report-form-choice">
                <input
                  type="radio"
                  name={id}
                  value={opt.value}
                  checked={raw === opt.value}
                  onChange={() => onChange(opt.value)}
                  disabled={disabled}
                />
                <span>{opt.label ?? opt.value}</span>
              </label>
            ))}
          </div>
        </FormField>
        </div>
      )
    }
    case 'multi_choice': {
      const options = question.options ?? []
      let selected: string[] = []
      try {
        selected = raw ? (JSON.parse(raw) as string[]) : []
      } catch {
        selected = []
      }
      const toggle = (v: string) => {
        const next = selected.includes(v)
          ? selected.filter((x) => x !== v)
          : [...selected, v]
        onChange(next.length > 0 ? JSON.stringify(next) : null)
      }
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
          <div className="report-form-choices" role="group">
            {options.map((opt) => (
              <label key={opt.value} className="report-form-choice">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  disabled={disabled}
                />
                <span>{opt.label ?? opt.value}</span>
              </label>
            ))}
          </div>
        </FormField>
        </div>
      )
    }
    default:
      return (
        <div className={wrapperClass}>
          <FormField id={id} label={label} error={hasError ? errorMessage : undefined}>
            <Input
              id={id}
              value={raw}
              onChange={(e) => onChange(e.target.value || null)}
              disabled={disabled}
              hasError={!!hasError}
            />
          </FormField>
        </div>
      )
  }
}
