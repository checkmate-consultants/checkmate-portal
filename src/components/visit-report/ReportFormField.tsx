import { FormField } from '../ui/FormField.tsx'
import { Input } from '../ui/Input.tsx'
import { Textarea } from '../ui/Textarea.tsx'
import type { VisitReportQuestion } from '../../data/companyManagement.ts'

type Props = {
  question: VisitReportQuestion
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}

export function ReportFormField({ question, value, onChange, disabled }: Props) {
  const id = `q-${question.id}`
  const raw = value ?? ''

  switch (question.questionType) {
    case 'short_text':
      return (
        <FormField id={id} label={question.label}>
          <Input
            id={id}
            value={raw}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            hasError={false}
          />
        </FormField>
      )
    case 'long_text':
      return (
        <FormField id={id} label={question.label}>
          <Textarea
            id={id}
            value={raw}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            hasError={false}
          />
        </FormField>
      )
    case 'number':
      return (
        <FormField id={id} label={question.label}>
          <Input
            id={id}
            type="number"
            value={raw}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            hasError={false}
          />
        </FormField>
      )
    case 'date':
      return (
        <FormField id={id} label={question.label}>
          <Input
            id={id}
            type="date"
            value={raw}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            hasError={false}
          />
        </FormField>
      )
    case 'rating': {
      const n = raw ? parseInt(raw, 10) : 0
      return (
        <FormField id={id} label={question.label}>
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
      )
    }
    case 'single_choice': {
      const options = question.options ?? []
      return (
        <FormField id={id} label={question.label}>
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
        <FormField id={id} label={question.label}>
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
      )
    }
    default:
      return (
        <FormField id={id} label={question.label}>
          <Input
            id={id}
            value={raw}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            hasError={false}
          />
        </FormField>
      )
  }
}
