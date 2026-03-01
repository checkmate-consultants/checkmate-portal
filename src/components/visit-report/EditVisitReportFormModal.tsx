import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
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
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<VisitReportQuestion | null>(null)
  const [questionSectionId, setQuestionSectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const openNewSection = (focusAreaId: string) => {
    setSectionFocusAreaId(focusAreaId)
    setEditingSection(null)
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
                    fa.sections.map((section) => (
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
                            section.questions.map((q) => (
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
                    onClick={() => openNewSection(fa.focusAreaId)}
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
  optionsText: string
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
        optionsText: z.string(),
        required: z.boolean(),
      }),
    ),
    defaultValues: {
      label: question?.label ?? '',
      questionType: question?.questionType ?? 'short_text',
      optionsText:
        question?.options?.map((o) => o.label || o.value).join('\n') ?? '',
      required: question?.required ?? true,
    },
    values: {
      label: question?.label ?? '',
      questionType: question?.questionType ?? 'short_text',
      optionsText:
        question?.options?.map((o) => o.label || o.value).join('\n') ?? '',
      required: question?.required ?? true,
    },
  })

  const selectedType = form.watch('questionType') as ReportQuestionType
  const showOptions =
    selectedType === 'single_choice' || selectedType === 'multi_choice'

  const onSubmit = async (values: QuestionFormValues) => {
    setSaving(true)
    try {
      let options: { value: string; label?: string }[] | null = null
      if (showOptions && values.optionsText.trim()) {
        options = values.optionsText
          .split('\n')
          .map((line) => line.trim())
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
            <textarea
              id="visit-question-options"
              className="modal-textarea"
              rows={4}
              {...form.register('optionsText')}
            />
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
