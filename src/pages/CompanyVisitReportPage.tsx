import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import {
  fetchVisitReportFormData,
  fetchVisitStatus,
  saveVisitFocusAreaReport,
  saveVisitReportAnswers,
  shopperSubmitVisitReport,
  type VisitReportFormFocusArea,
  type VisitStatus,
} from '../data/companyManagement.ts'
import { ReportFormField } from '../components/visit-report/ReportFormField.tsx'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './company-visit-report-page.css'
import './super-admin-visit-report-page.css'

export function CompanyVisitReportPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.visitReport.title')} | ${t('brand.name')}`,
    t('meta.visitReport.description'),
  )
  const navigate = useNavigate()
  const { visitId } = useParams<{ visitId: string }>()
  const { session } = useOutletContext<WorkspaceOutletContext>()

  const [formData, setFormData] = useState<VisitReportFormFocusArea[]>([])
  const [visitStatus, setVisitStatus] = useState<VisitStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Draft answers: focusAreaId -> questionId -> value (for form-based sections) */
  const [draftAnswers, setDraftAnswers] = useState<Record<string, Record<string, string | null>>>({})
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const canEdit =
    Boolean(session.isShopper) && visitStatus === 'scheduled'

  const getAnswer = useCallback(
    (focusAreaId: string, questionId: string): string | null => {
      return draftAnswers[focusAreaId]?.[questionId] ?? formData.find((fa) => fa.focusAreaId === focusAreaId)?.answers[questionId] ?? null
    },
    [draftAnswers, formData],
  )

  const setAnswer = useCallback(
    (focusAreaId: string, questionId: string, value: string | null) => {
      setDraftAnswers((prev) => ({
        ...prev,
        [focusAreaId]: {
          ...(prev[focusAreaId] ?? {}),
          [questionId]: value,
        },
      }))
    },
    [],
  )

  useEffect(() => {
    if (!visitId) return
    if (!session.membership && !session.isShopper) {
      setError(t('superAdmin.errors.generic'))
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const [data, status] = await Promise.all([
          fetchVisitReportFormData(visitId),
          session.isShopper ? fetchVisitStatus(visitId) : Promise.resolve('scheduled' as VisitStatus),
        ])
        setFormData(data)
        setVisitStatus(status)
        const initial: Record<string, Record<string, string | null>> = {}
        for (const fa of data) {
          initial[fa.focusAreaId] = { ...fa.answers }
        }
        setDraftAnswers(initial)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('superAdmin.errors.generic'),
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [visitId, session.membership, session.isShopper, t])

  const applyCommand = (command: string, value?: string) => {
    if (typeof document === 'undefined') return
    document.execCommand(command, false, value ?? undefined)
  }

  const handleSaveLegacy = async (focusAreaId: string) => {
    if (!visitId) return
    const editor = editorRefs.current[focusAreaId]
    const html = editor?.innerHTML ?? ''
    try {
      setSavingId(focusAreaId)
      await saveVisitFocusAreaReport(visitId, focusAreaId, html)
      setFormData((prev) =>
        prev.map((fa) =>
          fa.focusAreaId === focusAreaId
            ? { ...fa, legacyContent: html }
            : fa,
        ),
      )
      setSavedId(focusAreaId)
      setTimeout(() => {
        setSavedId((current) => (current === focusAreaId ? null : current))
      }, 2000)
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveFormAnswers = async (focusAreaId: string) => {
    if (!visitId) return
    const fa = formData.find((x) => x.focusAreaId === focusAreaId)
    if (!fa || fa.sections.length === 0) return
    const questionIds = fa.sections.flatMap((s) => s.questions.map((q) => q.id))
    const answers = questionIds.map((questionId) => ({
      questionId,
      value: getAnswer(focusAreaId, questionId),
    }))
    try {
      setSavingId(focusAreaId)
      await saveVisitReportAnswers(visitId, focusAreaId, answers)
      setSavedId(focusAreaId)
      setTimeout(() => {
        setSavedId((current) => (current === focusAreaId ? null : current))
      }, 2000)
    } finally {
      setSavingId(null)
    }
  }

  const handleSubmitReport = async () => {
    if (!visitId) return
    try {
      setSubmitting(true)
      for (const fa of formData) {
        if (fa.sections.length > 0) {
          const questionIds = fa.sections.flatMap((s) => s.questions.map((q) => q.id))
          const answers = questionIds.map((questionId) => ({
            questionId,
            value: getAnswer(fa.focusAreaId, questionId),
          }))
          await saveVisitReportAnswers(visitId, fa.focusAreaId, answers)
        } else if (fa.legacyContent !== undefined) {
          const editor = editorRefs.current[fa.focusAreaId]
          const html = editor?.innerHTML ?? fa.legacyContent ?? ''
          await saveVisitFocusAreaReport(visitId, fa.focusAreaId, html)
        }
      }
      await shopperSubmitVisitReport(visitId)
      navigate('/workspace/visits')
    } finally {
      setSubmitting(false)
    }
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

  const backToVisits = () => navigate('/workspace/visits')

  if (!canEdit) {
    return (
      <div className="super-admin-page company-visit-report-page">
        <header className="super-admin-header company-visit-report-header">
          <div>
            <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
            <h1>{t('superAdmin.companyVisits.reportTitle')}</h1>
            <p>{t('superAdmin.companyVisits.reportSubtitle')}</p>
          </div>
          <Button type="button" variant="ghost" onClick={backToVisits}>
            {t('superAdmin.visitReport.backToVisits')}
          </Button>
        </header>

        <div className="company-visit-report-list">
          {formData.map((block) => (
            <Card key={block.focusAreaId} className="super-admin-card">
              <h2 className="company-visit-report-heading">
                {block.focusAreaName}
              </h2>
              {block.sections.length > 0 ? (
                <div className="company-visit-report-sections">
                  {block.sections.map((section) => (
                    <div key={section.id}>
                      <h3 className="report-form-section-title">{section.sectionName}</h3>
                      {section.questions.map((q) => (
                        <div key={q.id} className="company-visit-report-answer">
                          <span className="company-visit-report-answer__label">{q.label}</span>
                          <span className="company-visit-report-answer__value">
                            {getAnswer(block.focusAreaId, q.id) ?? '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
              {block.sections.length === 0 && block.legacyContent ? (
                <div
                  className="company-visit-report-content"
                  dangerouslySetInnerHTML={{ __html: block.legacyContent }}
                />
              ) : block.sections.length === 0 && !block.legacyContent ? (
                <p className="company-visit-report-empty">
                  {t('companyVisits.noContent')}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="super-admin-page super-admin-visit-report-page">
      <header className="super-admin-header super-admin-visit-report-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.visitReport.title')}</h1>
          <p>{t('superAdmin.visitReport.subtitle')}</p>
        </div>
        <div className="super-admin-visit-report-actions">
          <Button type="button" variant="ghost" onClick={backToVisits}>
            {t('superAdmin.visitReport.backToVisits')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmitReport}
            loading={submitting}
          >
            {t('superAdmin.visitReport.submit')}
          </Button>
        </div>
      </header>

      <div className="super-admin-visit-report-list">
        {formData.map((block) => (
          <Card key={block.focusAreaId} className="super-admin-card">
            <h2 className="company-visit-report-heading">{block.focusAreaName}</h2>

            {block.sections.length > 0 ? (
              <>
                {block.sections.map((section) => (
                  <div key={section.id} className="report-form-section">
                    <h3 className="report-form-section-title">{section.sectionName}</h3>
                    {section.questions.map((q) => (
                      <ReportFormField
                        key={q.id}
                        question={q}
                        value={getAnswer(block.focusAreaId, q.id)}
                        onChange={(value) => setAnswer(block.focusAreaId, q.id, value)}
                      />
                    ))}
                  </div>
                ))}
                <div className="wysiwyg-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    loading={savingId === block.focusAreaId}
                    onClick={() => handleSaveFormAnswers(block.focusAreaId)}
                  >
                    {t('superAdmin.visitReport.saveSection')}
                  </Button>
                  {savedId === block.focusAreaId && savingId !== block.focusAreaId && (
                    <span className="wysiwyg-status">
                      {t('superAdmin.visitReport.sectionSaved')}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <FormField id={block.focusAreaId} label={block.focusAreaName}>
                  <div className="wysiwyg-wrapper">
                    <div className="wysiwyg-toolbar">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('formatBlock', 'p')}
                      >
                        {t('superAdmin.visitReport.toolbar.normal')}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('formatBlock', 'h2')}
                      >
                        {t('superAdmin.visitReport.toolbar.heading2')}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('formatBlock', 'h3')}
                      >
                        {t('superAdmin.visitReport.toolbar.heading3')}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('insertUnorderedList')}
                      >
                        {t('superAdmin.visitReport.toolbar.bulletList')}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCommand('insertOrderedList')}
                      >
                        {t('superAdmin.visitReport.toolbar.orderedList')}
                      </button>
                    </div>
                    <div
                      ref={(el) => {
                        editorRefs.current[block.focusAreaId] = el
                      }}
                      className="wysiwyg-editor"
                      contentEditable
                      dir="auto"
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: block.legacyContent }}
                    />
                  </div>
                </FormField>
                <div className="wysiwyg-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    loading={savingId === block.focusAreaId}
                    onClick={() => handleSaveLegacy(block.focusAreaId)}
                  >
                    {t('superAdmin.visitReport.saveSection')}
                  </Button>
                  {savedId === block.focusAreaId && savingId !== block.focusAreaId && (
                    <span className="wysiwyg-status">
                      {t('superAdmin.visitReport.sectionSaved')}
                    </span>
                  )}
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
