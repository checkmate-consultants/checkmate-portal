import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import {
  fetchVisitReportFormData,
  saveVisitReportAnswers,
  updateVisitStatus,
  type VisitReportFormFocusArea,
} from '../data/companyManagement.ts'
import { ReportFormField } from '../components/visit-report/ReportFormField.tsx'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-visit-report-page.css'
import './company-visit-report-page.css'

type ViewMode = 'shopper' | 'final' | 'edit'

export function SuperAdminVisitReportPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminVisitReport.title')} | ${t('brand.name')}`,
    t('meta.superAdminVisitReport.description'),
  )
  const navigate = useNavigate()
  const { visitId } = useParams<{ visitId: string }>()
  const { session } = useOutletContext<WorkspaceOutletContext>()

  const [formData, setFormData] = useState<VisitReportFormFocusArea[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')

  /** Draft answers when in edit mode: focusAreaId -> questionId -> value */
  const [draftAnswers, setDraftAnswers] = useState<Record<string, Record<string, string | null>>>({})

  const getAnswer = useCallback(
    (block: VisitReportFormFocusArea, questionId: string): string | null => {
      if (viewMode === 'edit') {
        return draftAnswers[block.focusAreaId]?.[questionId] ?? block.answers[questionId] ?? null
      }
      if (viewMode === 'shopper' && block.shopperAnswers) {
        return block.shopperAnswers[questionId] ?? block.answers[questionId] ?? null
      }
      return block.answers[questionId] ?? null
    },
    [viewMode, draftAnswers],
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

  const handleSaveFormAnswers = useCallback(
    async (focusAreaId: string) => {
      if (!visitId) return
      const block = formData.find((b) => b.focusAreaId === focusAreaId)
      if (!block || block.sections.length === 0) return
      const questionIds = block.sections.flatMap((s) => s.questions.map((q) => q.id))
      const getVal = (qId: string) =>
        draftAnswers[focusAreaId]?.[qId] ?? block.answers[qId] ?? null
      const answers = questionIds.map((questionId) => ({
        questionId,
        value: getVal(questionId),
      }))
      try {
        setSavingId(focusAreaId)
        await saveVisitReportAnswers(visitId, focusAreaId, answers)
        setFormData((prev) =>
          prev.map((fa) =>
            fa.focusAreaId === focusAreaId
              ? {
                  ...fa,
                  answers: Object.fromEntries(answers.map((a) => [a.questionId, a.value])),
                }
              : fa,
          ),
        )
        setSavedId(focusAreaId)
        setTimeout(() => setSavedId((c) => (c === focusAreaId ? null : c)), 2000)
      } finally {
        setSavingId(null)
      }
    },
    [visitId, formData, draftAnswers],
  )

  useEffect(() => {
    if (!visitId) return
    if (!session.isSuperAdmin && !session.isAccountManager) {
      setError(t('superAdmin.errors.unauthorized'))
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const data = await fetchVisitReportFormData(visitId)
        setFormData(data)
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
  }, [visitId, session.isSuperAdmin, session.isAccountManager, t])

  const handleSubmitReport = async () => {
    if (!visitId) return
    try {
      setSubmitting(true)
      for (const block of formData) {
        if (block.sections.length === 0) continue
        const questionIds = block.sections.flatMap((s) => s.questions.map((q) => q.id))
        const answers = questionIds.map((questionId) => ({
          questionId,
          value: getAnswer(block, questionId),
        }))
        await saveVisitReportAnswers(visitId, block.focusAreaId, answers)
      }
      await updateVisitStatus(visitId, 'report_submitted')
      navigate('/workspace/admin/visits')
    } finally {
      setSubmitting(false)
    }
  }

  const hasShopperVersion = formData.some(
    (b) => b.shopperAnswers && Object.keys(b.shopperAnswers).length > 0,
  )

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
    <div className="super-admin-page super-admin-visit-report-page">
      <header className="super-admin-header super-admin-visit-report-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.visitReport.title')}</h1>
          <p>{t('superAdmin.visitReport.subtitle')}</p>
        </div>
        <div className="super-admin-visit-report-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/workspace/admin/visits')}
          >
            {t('superAdmin.visitReport.backToVisits')}
          </Button>
          {viewMode === 'edit' && (
            <Button
              type="button"
              onClick={handleSubmitReport}
              loading={submitting}
            >
              {t('superAdmin.visitReport.submit')}
            </Button>
          )}
        </div>
      </header>

      <div className="super-admin-visit-report-view-toggle">
        {hasShopperVersion && (
          <Button
            type="button"
            variant={viewMode === 'shopper' ? 'primary' : 'ghost'}
            onClick={() => setViewMode('shopper')}
          >
            {t('superAdmin.visitReport.viewShopperReport')}
          </Button>
        )}
        <Button
          type="button"
          variant={viewMode === 'final' ? 'primary' : 'ghost'}
          onClick={() => setViewMode('final')}
        >
          {t('superAdmin.visitReport.viewFinalReport')}
        </Button>
        <Button
          type="button"
          variant={viewMode === 'edit' ? 'primary' : 'ghost'}
          onClick={() => setViewMode('edit')}
        >
          {t('superAdmin.visitReport.editReport')}
        </Button>
      </div>

      {viewMode === 'edit' && (
        <p className="super-admin-visit-report-edit-hint">
          {t('superAdmin.visitReport.editHint')}
        </p>
      )}

      <div className="super-admin-visit-report-list">
        {formData.map((block) => (
          <Card key={block.focusAreaId} className="super-admin-card">
            <h2 className="company-visit-report-heading">{block.focusAreaName}</h2>

            {block.sections.length > 0 ? (
              <div className="company-visit-report-sections">
                {block.sections.map((section) => (
                  <div key={section.id}>
                    <h3 className="report-form-section-title">{section.sectionName}</h3>
                    {viewMode === 'edit' ? (
                      <>
                        {section.questions.map((q) => (
                          <ReportFormField
                            key={q.id}
                            question={q}
                            value={getAnswer(block, q.id)}
                            onChange={(value) => setAnswer(block.focusAreaId, q.id, value)}
                            onBlur={() => handleSaveFormAnswers(block.focusAreaId)}
                            requiredSuffix={t('superAdmin.visitReport.requiredSuffix')}
                          />
                        ))}
                        {(savingId === block.focusAreaId || savedId === block.focusAreaId) && (
                          <p className="wysiwyg-status" aria-live="polite">
                            {savingId === block.focusAreaId
                              ? t('superAdmin.visitReport.saving')
                              : t('superAdmin.visitReport.sectionSaved')}
                          </p>
                        )}
                      </>
                    ) : (
                      section.questions.map((q) => (
                        <div key={q.id} className="company-visit-report-answer">
                          <span className="company-visit-report-answer__label">{q.label}</span>
                          <span className="company-visit-report-answer__value">
                            {getAnswer(block, q.id) ?? '—'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="company-visit-report-empty">{t('companyVisits.noContent')}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
