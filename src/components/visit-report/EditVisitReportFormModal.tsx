import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { FormField } from '../ui/FormField.tsx'
import { Input } from '../ui/Input.tsx'
import {
  fetchVisitReportFormData,
  createVisitReportSection,
  updateVisitReportSection,
  deleteVisitReportSection,
  createVisitReportQuestion,
  updateVisitReportQuestion,
  deleteVisitReportQuestion,
  type VisitReportFormFocusArea,
  type VisitReportSection,
  type VisitReportQuestion,
  type ReportQuestionType,
} from '../../data/companyManagement.ts'
import './edit-visit-report-form-modal.css'

const QUESTION_TYPES: ReportQuestionType[] = [
  'short_text',
  'long_text',
  'number',
  'single_choice',
  'multi_choice',
  'date',
  'datetime',
  'rating',
]

type Props = {
  visitId: string
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export function EditVisitReportFormModal({ visitId, open, onClose }: Props) {
  const { t } = useTranslation()
  const [focusAreas, setFocusAreas] = useState<VisitReportFormFocusArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<VisitReportSection | null>(null)
  const [sectionFocusAreaId, setSectionFocusAreaId] = useState<string | null>(null)
  const [newSectionDisplayOrder, setNewSectionDisplayOrder] = useState(0)
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<VisitReportQuestion | null>(null)
  const [questionSectionId, setQuestionSectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  const load = async () => {
    if (!visitId || !open) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchVisitReportFormData(visitId)
      setFocusAreas(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('superAdmin.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && visitId) load()
  }, [open, visitId, t])

  const openNewSection = (focusAreaId: string, currentSectionCount: number) => {
    setSectionFocusAreaId(focusAreaId)
    setEditingSection(null)
    setNewSectionDisplayOrder(currentSectionCount)
    setSectionModalOpen(true)
  }

  const openEditSection = (section: VisitReportSection) => {
    setSectionFocusAreaId(section.focusAreaId)
    setEditingSection(section)
    setSectionModalOpen(true)
  }

  const openNewQuestion = (sectionId: string) => {
    setQuestionSectionId(sectionId)
    setEditingQuestion(null)
    setQuestionModalOpen(true)
  }

  const openEditQuestion = (q: VisitReportQuestion) => {
    setQuestionSectionId(q.visitReportSectionId)
    setEditingQuestion(q)
    setQuestionModalOpen(true)
  }

  const handleSectionSaved = () => {
    setSectionModalOpen(false)
    setSectionFocusAreaId(null)
    load()
  }

  const handleQuestionSaved = () => {
    setQuestionModalOpen(false)
    setQuestionSectionId(null)
    setEditingQuestion(null)
    load()
  }

  const moveSection = async (
    sections: VisitReportSection[],
    sectionIndex: number,
    direction: 'up' | 'down',
  ) => {
    const next = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1
    if (next < 0 || next >= sections.length) return
    const a = sections[sectionIndex]
    const b = sections[next]
    if (!a || !b) return
    setMovingId(`section-${a.id}`)
    try {
      await updateVisitReportSection(a.id, { displayOrder: b.displayOrder })
      await updateVisitReportSection(b.id, { displayOrder: a.displayOrder })
      await load()
    } finally {
      setMovingId(null)
    }
  }

  const moveQuestion = async (
    section: VisitReportSection,
    questionIndex: number,
    direction: 'up' | 'down',
  ) => {
    const next = direction === 'up' ? questionIndex - 1 : questionIndex + 1
    if (next < 0 || next >= section.questions.length) return
    const a = section.questions[questionIndex]
    const b = section.questions[next]
    if (!a || !b) return
    setMovingId(`question-${a.id}`)
    try {
      await updateVisitReportQuestion(a.id, { displayOrder: b.displayOrder })
      await updateVisitReportQuestion(b.id, { displayOrder: a.displayOrder })
      await load()
    } finally {
      setMovingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('superAdmin.visits.editReportFormModal.title')}
      description={t('superAdmin.visits.editReportFormModal.description')}
    >
      <div className="edit-visit-report-form-modal">
      <div className="edit-visit-report-form-modal__body">
        {loading && <p>{t('superAdmin.loading')}</p>}
        {error && <p className="edit-visit-report-form-modal__error">{error}</p>}
        {!loading && !error && focusAreas.length === 0 && (
          <p>{t('superAdmin.visits.editReportFormModal.empty')}</p>
        )}
        {!loading && !error && focusAreas.length > 0 && (
          <div className="edit-visit-report-form-list">
            {focusAreas.map((fa) => (
              <div key={fa.focusAreaId} className="edit-visit-report-form-focus">
                <h3 className="edit-visit-report-form-focus__title">{fa.focusAreaName}</h3>
                <div className="edit-visit-report-form-sections">
                  {fa.sections.length === 0 ? (
                    <p className="edit-visit-report-form-sections__empty">
                      {t('superAdmin.visits.editReportFormModal.noSections')}
                    </p>
                  ) : (
                    fa.sections.map((section, sectionIndex) => (
                      <div
                        key={section.id}
                        className="edit-visit-report-form-card report-template-card"
                      >
                        <div className="report-template-card__header">
                          <h2 className="report-template-card__title">
                            {section.sectionName}
                          </h2>
                          <div className="report-template-card__actions">
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={sectionIndex === 0 || movingId !== null}
                              onClick={() =>
                                moveSection(fa.sections, sectionIndex, 'up')
                              }
                              aria-label={t('superAdmin.reportTemplates.moveUp')}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={
                                sectionIndex === fa.sections.length - 1 ||
                                movingId !== null
                              }
                              onClick={() =>
                                moveSection(fa.sections, sectionIndex, 'down')
                              }
                              aria-label={t('superAdmin.reportTemplates.moveDown')}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => openEditSection(section)}
                            >
                              {t('superAdmin.reportTemplates.editSection')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => openNewQuestion(section.id)}
                            >
                              {t('superAdmin.reportTemplates.addQuestion')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={deletingId === section.id}
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    t('superAdmin.reportTemplates.confirmDeleteSection'),
                                  )
                                )
                                  return
                                setDeletingId(section.id)
                                try {
                                  await deleteVisitReportSection(section.id)
                                  await load()
                                } finally {
                                  setDeletingId(null)
                                }
                              }}
                            >
                              {t('superAdmin.reportTemplates.deleteSection')}
                            </Button>
                          </div>
                        </div>
                        <ul className="report-template-questions">
                          {section.questions.length === 0 ? (
                            <li className="report-template-questions__empty">
                              {t('superAdmin.reportTemplates.noQuestions')}
                            </li>
                          ) : (
                            section.questions.map((q, questionIndex) => (
                              <li
                                key={q.id}
                                className="report-template-question-item"
                              >
                                <span className="report-template-question-item__label">
                                  {q.label}
                                </span>
                                <span className="report-template-question-item__type">
                                  {t(
                                    `superAdmin.reportTemplates.questionTypes.${q.questionType}`,
                                  )}
                                  {q.required
                                    ? ` · ${t('superAdmin.reportTemplates.required')}`
                                    : ''}
                                </span>
                                <div className="report-template-question-item__actions">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={
                                      questionIndex === 0 || movingId !== null
                                    }
                                    onClick={() =>
                                      moveQuestion(
                                        section,
                                        questionIndex,
                                        'up',
                                      )
                                    }
                                    aria-label={t('superAdmin.reportTemplates.moveUp')}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={
                                      questionIndex ===
                                        section.questions.length - 1 ||
                                      movingId !== null
                                    }
                                    onClick={() =>
                                      moveQuestion(
                                        section,
                                        questionIndex,
                                        'down',
                                      )
                                    }
                                    aria-label={t('superAdmin.reportTemplates.moveDown')}
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => openEditQuestion(q)}
                                  >
                                    {t('superAdmin.reportTemplates.editQuestion')}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={deletingId === q.id}
                                    onClick={async () => {
                                      if (
                                        !window.confirm(
                                          t(
                                            'superAdmin.reportTemplates.confirmDeleteQuestion',
                                          ),
                                        )
                                      )
                                        return
                                      setDeletingId(q.id)
                                      try {
                                        await deleteVisitReportQuestion(q.id)
                                        await load()
                                      } finally {
                                        setDeletingId(null)
                                      }
                                    }}
                                  >
                                    {t('superAdmin.reportTemplates.deleteQuestion')}
                                  </Button>
                                </div>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      openNewSection(fa.focusAreaId, fa.sections.length)
                    }
                  >
                    {t('superAdmin.reportTemplates.newSection')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="edit-visit-report-form-modal__footer">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('superAdmin.visits.forms.cancel')}
          </Button>
        </div>
      </div>
      </div>

      {sectionFocusAreaId && (
        <VisitSectionModal
          visitId={visitId}
          focusAreaId={sectionFocusAreaId}
          open={sectionModalOpen}
          onClose={() => {
            setSectionModalOpen(false)
            setSectionFocusAreaId(null)
          }}
          section={editingSection}
          newSectionDisplayOrder={newSectionDisplayOrder}
          onSaved={handleSectionSaved}
          saving={saving}
          setSaving={setSaving}
          t={t}
        />
      )}

      {questionSectionId && (
        <VisitQuestionModal
          open={questionModalOpen}
          onClose={() => {
            setQuestionModalOpen(false)
            setQuestionSectionId(null)
          }}
          sectionId={questionSectionId}
          question={editingQuestion}
          onSaved={handleQuestionSaved}
          saving={saving}
          setSaving={setSaving}
          t={t}
        />
      )}
    </Modal>
  )
}

type SectionFormValues = { sectionName: string }

function VisitSectionModal({
  visitId,
  focusAreaId,
  open,
  onClose,
  section,
  newSectionDisplayOrder,
  onSaved,
  saving,
  setSaving,
  t,
}: {
  visitId: string
  focusAreaId: string
  open: boolean
  onClose: () => void
  section: VisitReportSection | null
  newSectionDisplayOrder?: number
  onSaved: () => void
  saving: boolean
  setSaving: (v: boolean) => void
  t: (key: string) => string
}) {
  const schema = z.object({
    sectionName: z.string().min(1, t('validation.required')),
  })
  const form = useForm<SectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sectionName: section?.sectionName ?? '' },
    values: { sectionName: section?.sectionName ?? '' },
  })

  const onSubmit = async (values: SectionFormValues) => {
    setSaving(true)
    try {
      if (section) {
        await updateVisitReportSection(section.id, {
          sectionName: values.sectionName.trim(),
        })
      } else {
        await createVisitReportSection(visitId, focusAreaId, {
          sectionName: values.sectionName.trim(),
          displayOrder: newSectionDisplayOrder ?? 0,
        })
      }
      onSaved()
      form.reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        section
          ? t('superAdmin.reportTemplates.editSectionTitle')
          : t('superAdmin.visits.editReportFormModal.newSectionTitle')
      }
      description={t('superAdmin.reportTemplates.sectionDescription')}
    >
      <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          id="visit-section-name"
          label={t('superAdmin.reportTemplates.sectionName')}
          error={form.formState.errors.sectionName?.message}
        >
          <Input
            id="visit-section-name"
            {...form.register('sectionName')}
            hasError={Boolean(form.formState.errors.sectionName)}
          />
        </FormField>
        <div className="modal-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('superAdmin.visits.forms.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={!form.formState.isValid}>
            {section
              ? t('superAdmin.reportTemplates.saveSection')
              : t('superAdmin.reportTemplates.createSection')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

type QuestionFormValues = {
  label: string
  questionType: ReportQuestionType
  options: { label: string }[]
  required: boolean
}

function VisitQuestionModal({
  open,
  onClose,
  sectionId,
  question,
  onSaved,
  saving,
  setSaving,
  t,
}: {
  open: boolean
  onClose: () => void
  sectionId: string
  question: VisitReportQuestion | null
  onSaved: () => void
  saving: boolean
  setSaving: (v: boolean) => void
  t: (key: string) => string
}) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(
      z.object({
        label: z.string().min(1, t('validation.required')),
        questionType: z.enum(QUESTION_TYPES as [ReportQuestionType, ...ReportQuestionType[]]),
        options: z.array(z.object({ label: z.string() })),
        required: z.boolean(),
      }),
    ),
    defaultValues: {
      label: question?.label ?? '',
      questionType: question?.questionType ?? 'short_text',
      options:
        question?.options?.length
          ? question.options.map((o) => ({ label: o.label || o.value }))
          : [],
      required: question?.required ?? true,
    },
    values: {
      label: question?.label ?? '',
      questionType: question?.questionType ?? 'short_text',
      options:
        question?.options?.length
          ? question.options.map((o) => ({ label: o.label || o.value }))
          : [],
      required: question?.required ?? true,
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const selectedType = form.watch('questionType') as ReportQuestionType
  const showOptions =
    selectedType === 'single_choice' || selectedType === 'multi_choice'

  const onSubmit = async (values: QuestionFormValues) => {
    setSaving(true)
    try {
      let options: { value: string; label?: string }[] | null = null
      if (showOptions && values.options.length > 0) {
        options = values.options
          .map((o) => o.label.trim())
          .filter(Boolean)
          .map((label) => ({
            value: label.replace(/\s+/g, '_').toLowerCase(),
            label,
          }))
      }
      if (question) {
        await updateVisitReportQuestion(question.id, {
          label: values.label.trim(),
          questionType: values.questionType as ReportQuestionType,
          options,
          required: values.required,
        })
      } else {
        await createVisitReportQuestion(sectionId, {
          label: values.label.trim(),
          questionType: values.questionType as ReportQuestionType,
          options: options ?? undefined,
          required: values.required,
        })
      }
      onSaved()
      form.reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        question
          ? t('superAdmin.reportTemplates.editQuestionTitle')
          : t('superAdmin.reportTemplates.newQuestionTitle')
      }
      description={t('superAdmin.reportTemplates.questionDescription')}
    >
      <form
        className="modal-form"
        onSubmit={form.handleSubmit((data) => onSubmit(data as QuestionFormValues))}
      >
        <FormField
          id="visit-question-label"
          label={t('superAdmin.reportTemplates.questionLabel')}
          error={form.formState.errors.label?.message}
        >
          <Input
            id="visit-question-label"
            {...form.register('label')}
            hasError={Boolean(form.formState.errors.label)}
          />
        </FormField>
        <FormField
          id="visit-question-type"
          label={t('superAdmin.reportTemplates.questionType')}
        >
          <select
            id="visit-question-type"
            className="modal-select"
            {...form.register('questionType')}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`superAdmin.reportTemplates.questionTypes.${type}`)}
              </option>
            ))}
          </select>
        </FormField>
        {showOptions && (
          <FormField
            id="visit-question-options"
            label={t('superAdmin.reportTemplates.questionOptions')}
            helperText={t('superAdmin.reportTemplates.questionOptionsHelper')}
          >
            <div className="report-template-options-list">
              {fields.map((field, index) => (
                <div key={field.id} className="report-template-options-list__row">
                  <span className="report-template-options-list__order" aria-hidden>
                    {index + 1}.
                  </span>
                  <Input
                    className="report-template-options-list__input"
                    value={form.watch(`options.${index}.label`)}
                    onChange={(e) =>
                      form.setValue(`options.${index}.label`, e.target.value, {
                        shouldValidate: true,
                      })
                    }
                    placeholder={t('superAdmin.reportTemplates.optionPlaceholder')}
                    hasError={false}
                  />
                  <div className="report-template-options-list__actions">
                    <Button
                      type="button"
                      variant="ghost"
                      className="report-template-options-list__btn"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label={t('superAdmin.reportTemplates.moveUp')}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="report-template-options-list__btn"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label={t('superAdmin.reportTemplates.moveDown')}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="report-template-options-list__btn"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label={t('superAdmin.reportTemplates.removeOption')}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="report-template-options-list__add"
                onClick={() => append({ label: '' })}
              >
                {t('superAdmin.reportTemplates.addOption')}
              </Button>
            </div>
          </FormField>
        )}
        <FormField
          id="visit-question-required"
          label={t('superAdmin.reportTemplates.required')}
        >
          <label className="report-template-checkbox">
            <input type="checkbox" {...form.register('required')} />
            {t('superAdmin.reportTemplates.requiredLabel')}
          </label>
        </FormField>
        <div className="modal-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('superAdmin.visits.forms.cancel')}
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={!form.formState.isValid}
          >
            {question
              ? t('superAdmin.reportTemplates.saveQuestion')
              : t('superAdmin.reportTemplates.createQuestion')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
