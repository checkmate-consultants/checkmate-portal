import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import {
  fetchReportTemplateSections,
  fetchReportTemplateQuestionsBySectionIds,
  createReportTemplateSection,
  updateReportTemplateSection,
  deleteReportTemplateSection,
  createReportTemplateQuestion,
  updateReportTemplateQuestion,
  deleteReportTemplateQuestion,
  type ReportTemplateSection as TemplateSection,
  type ReportTemplateQuestion as TemplateQuestion,
  type ReportQuestionType,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-report-templates-page.css'

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

type SectionWithQuestions = TemplateSection & { questions: TemplateQuestion[] }

export function SuperAdminReportTemplatesPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('superAdmin.reportTemplates.title')} | ${t('brand.name')}`,
    t('superAdmin.reportTemplates.subtitle'),
  )
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [sections, setSections] = useState<SectionWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<TemplateSection | null>(null)
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<TemplateQuestion | null>(null)
  const [questionSectionId, setQuestionSectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSections = async () => {
    try {
      const list = await fetchReportTemplateSections()
      if (list.length === 0) {
        setSections([])
        setLoading(false)
        return
      }
      const questions = await fetchReportTemplateQuestionsBySectionIds(list.map((s) => s.id))
      const bySection = new Map<string, TemplateQuestion[]>()
      for (const q of questions) {
        const arr = bySection.get(q.templateSectionId) ?? []
        arr.push(q)
        bySection.set(q.templateSectionId, arr)
      }
      setSections(
        list.map((s) => ({
          ...s,
          questions: (bySection.get(s.id) ?? []).sort((a, b) => a.displayOrder - b.displayOrder),
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('superAdmin.errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session.isSuperAdmin) {
      setError(t('superAdmin.errors.unauthorized'))
      setLoading(false)
      return
    }
    loadSections()
  }, [session.isSuperAdmin, t])

  const openNewSection = () => {
    setEditingSection(null)
    setSectionModalOpen(true)
  }

  const openEditSection = (section: TemplateSection) => {
    setEditingSection(section)
    setSectionModalOpen(true)
  }

  const openNewQuestion = (sectionId: string) => {
    setQuestionSectionId(sectionId)
    setEditingQuestion(null)
    setQuestionModalOpen(true)
  }

  const openEditQuestion = (q: TemplateQuestion) => {
    setQuestionSectionId(q.templateSectionId)
    setEditingQuestion(q)
    setQuestionModalOpen(true)
  }

  if (loading) {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="super-admin-page super-admin-report-templates-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.reportTemplates.title')}</h1>
          <p>{t('superAdmin.reportTemplates.subtitle')}</p>
        </div>
        <Button type="button" onClick={openNewSection}>
          {t('superAdmin.reportTemplates.newSection')}
        </Button>
      </header>

      <div className="report-templates-list">
        {sections.length === 0 ? (
          <Card className="super-admin-card">
            <p>{t('superAdmin.reportTemplates.empty')}</p>
          </Card>
        ) : (
          sections.map((section) => (
            <Card key={section.id} className="super-admin-card report-template-card">
              <div className="report-template-card__header">
                <h2 className="report-template-card__title">{section.name}</h2>
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
                      if (!window.confirm(t('superAdmin.reportTemplates.confirmDeleteSection'))) return
                      setDeletingId(section.id)
                      try {
                        await deleteReportTemplateSection(section.id)
                        await loadSections()
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
                    <li key={q.id} className="report-template-question-item">
                      <span className="report-template-question-item__label">{q.label}</span>
                      <span className="report-template-question-item__type">
                        {t(`superAdmin.reportTemplates.questionTypes.${q.questionType}`)}
                        {q.required ? ` · ${t('superAdmin.reportTemplates.required')}` : ''}
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
                            if (!window.confirm(t('superAdmin.reportTemplates.confirmDeleteQuestion'))) return
                            setDeletingId(q.id)
                            try {
                              await deleteReportTemplateQuestion(q.id)
                              await loadSections()
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
            </Card>
          ))
        )}
      </div>

      <SectionModal
        open={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        section={editingSection}
        onSaved={() => {
          setSectionModalOpen(false)
          loadSections()
        }}
        saving={saving}
        setSaving={setSaving}
        t={t}
      />

      {questionSectionId && (
        <QuestionModal
          open={questionModalOpen}
          onClose={() => {
            setQuestionModalOpen(false)
            setQuestionSectionId(null)
          }}
          sectionId={questionSectionId}
          question={editingQuestion}
          onSaved={() => {
            setQuestionModalOpen(false)
            setQuestionSectionId(null)
            loadSections()
          }}
          saving={saving}
          setSaving={setSaving}
          t={t}
        />
      )}
    </div>
  )
}

type SectionFormValues = { name: string }

function SectionModal({
  open,
  onClose,
  section,
  onSaved,
  saving,
  setSaving,
  t,
}: {
  open: boolean
  onClose: () => void
  section: TemplateSection | null
  onSaved: () => void
  saving: boolean
  setSaving: (v: boolean) => void
  t: (key: string) => string
}) {
  const schema = z.object({
    name: z.string().min(1, t('validation.required')),
  })
  const form = useForm<SectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: section?.name ?? '' },
    values: { name: section?.name ?? '' },
  })

  const onSubmit = async (values: SectionFormValues) => {
    setSaving(true)
    try {
      if (section) {
        await updateReportTemplateSection(section.id, { name: values.name.trim() })
      } else {
        await createReportTemplateSection(values.name.trim())
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
      title={section ? t('superAdmin.reportTemplates.editSectionTitle') : t('superAdmin.reportTemplates.newSectionTitle')}
      description={t('superAdmin.reportTemplates.sectionDescription')}
    >
      <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField id="section-name" label={t('superAdmin.reportTemplates.sectionName')} error={form.formState.errors.name?.message}>
          <Input
            id="section-name"
            {...form.register('name')}
            hasError={Boolean(form.formState.errors.name)}
          />
        </FormField>
        <div className="modal-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('superAdmin.visits.forms.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={!form.formState.isValid}>
            {section ? t('superAdmin.reportTemplates.saveSection') : t('superAdmin.reportTemplates.createSection')}
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

function QuestionModal({
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
  question: TemplateQuestion | null
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
      optionsText: question?.options?.map((o) => o.label || o.value).join('\n') ?? '',
      required: question?.required ?? true,
    },
    values: {
      label: question?.label ?? '',
      questionType: question?.questionType ?? 'short_text',
      optionsText: question?.options?.map((o) => o.label || o.value).join('\n') ?? '',
      required: question?.required ?? true,
    },
  })

  const selectedType = form.watch('questionType') as ReportQuestionType
  const showOptions = selectedType === 'single_choice' || selectedType === 'multi_choice'

  const onSubmit = async (values: QuestionFormValues) => {
    setSaving(true)
    try {
      let options: { value: string; label?: string }[] | null = null
      if (showOptions && values.optionsText.trim()) {
        options = values.optionsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((label) => ({ value: label.replace(/\s+/g, '_').toLowerCase(), label }))
      }
      if (question) {
        await updateReportTemplateQuestion(question.id, {
          label: values.label.trim(),
          questionType: values.questionType as ReportQuestionType,
          options,
          required: values.required,
        })
      } else {
        await createReportTemplateQuestion({
          templateSectionId: sectionId,
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
      title={question ? t('superAdmin.reportTemplates.editQuestionTitle') : t('superAdmin.reportTemplates.newQuestionTitle')}
      description={t('superAdmin.reportTemplates.questionDescription')}
    >
      <form className="modal-form" onSubmit={form.handleSubmit((data) => onSubmit(data as QuestionFormValues))}>
        <FormField id="question-label" label={t('superAdmin.reportTemplates.questionLabel')} error={form.formState.errors.label?.message}>
          <Input
            id="question-label"
            {...form.register('label')}
            hasError={Boolean(form.formState.errors.label)}
          />
        </FormField>
        <FormField id="question-type" label={t('superAdmin.reportTemplates.questionType')}>
          <select
            id="question-type"
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
            id="question-options"
            label={t('superAdmin.reportTemplates.questionOptions')}
            helperText={t('superAdmin.reportTemplates.questionOptionsHelper')}
          >
            <textarea
              id="question-options"
              className="modal-textarea"
              rows={4}
              {...form.register('optionsText')}
            />
          </FormField>
        )}
        <FormField id="question-required" label={t('superAdmin.reportTemplates.required')}>
          <label className="report-template-checkbox">
            <input type="checkbox" {...form.register('required')} />
            {t('superAdmin.reportTemplates.requiredLabel')}
          </label>
        </FormField>
        <div className="modal-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('superAdmin.visits.forms.cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={!form.formState.isValid}>
            {question ? t('superAdmin.reportTemplates.saveQuestion') : t('superAdmin.reportTemplates.createQuestion')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
