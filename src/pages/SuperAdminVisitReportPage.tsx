import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import {
  fetchVisitReportFormData,
  saveVisitFocusAreaReport,
  updateVisitStatus,
  type VisitReportFormFocusArea,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-visit-report-page.css'
import './company-visit-report-page.css'

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

  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

  const handleSubmitReport = async () => {
    if (!visitId) return
    try {
      setSubmitting(true)
      for (const block of formData) {
        const editor = editorRefs.current[block.focusAreaId]
        const html = editor?.innerHTML ?? block.legacyContent ?? ''
        await saveVisitFocusAreaReport(visitId, block.focusAreaId, html)
      }
      await updateVisitStatus(visitId, 'report_submitted')
      navigate('/workspace/admin/visits')
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
              <div className="company-visit-report-sections">
                {block.sections.map((section) => (
                  <div key={section.id}>
                    <h3 className="report-form-section-title">{section.sectionName}</h3>
                    {section.questions.map((q) => (
                      <div key={q.id} className="company-visit-report-answer">
                        <span className="company-visit-report-answer__label">{q.label}</span>
                        <span className="company-visit-report-answer__value">
                          {block.answers[q.id] ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {block.sections.length > 0 && block.legacyContent ? (
              <h3 className="report-form-section-title" style={{ marginTop: '1rem' }}>
                {t('superAdmin.visitReport.toolbar.normal')}
              </h3>
            ) : null}
            {block.legacyContent !== undefined && (
              <>
                <FormField id={block.focusAreaId} label="">
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
