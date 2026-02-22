import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import {
  fetchVisitReports,
  saveVisitFocusAreaReport,
  updateVisitStatus,
  type VisitFocusAreaReport,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './super-admin-visit-report-page.css'

export function SuperAdminVisitReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { visitId } = useParams<{ visitId: string }>()
  const { session } = useOutletContext<WorkspaceOutletContext>()

  const [reports, setReports] = useState<VisitFocusAreaReport[]>([])
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
        const data = await fetchVisitReports(visitId)
        setReports(data)
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
    // eslint-disable-next-line no-restricted-globals
    if (typeof document === 'undefined') return
    document.execCommand(command, false, value ?? undefined)
  }

  const handleSave = async (focusAreaId: string) => {
    if (!visitId) return
    const editor = editorRefs.current[focusAreaId]
    const html = editor?.innerHTML ?? ''
    try {
      setSavingId(focusAreaId)
      await saveVisitFocusAreaReport(visitId, focusAreaId, html)
      setReports((prev) =>
        prev.map((block) =>
          block.focusAreaId === focusAreaId ? { ...block, content: html } : block,
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
      // Ensure all sections are saved before changing status
      const saves = reports.map((block) => {
        const editor = editorRefs.current[block.focusAreaId]
        const html = editor?.innerHTML ?? block.content ?? ''
        return saveVisitFocusAreaReport(visitId, block.focusAreaId, html)
      })
      await Promise.all(saves)
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
            onClick={() => navigate(-1)}
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
        {reports.map((block) => (
          <Card key={block.focusAreaId} className="super-admin-card">
            <FormField id={block.focusAreaId} label={block.focusAreaName}>
              <div className="wysiwyg-wrapper">
                <div className="wysiwyg-toolbar">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyCommand('formatBlock', 'p')}
                  >
                    {t('superAdmin.visitReport.toolbar.normal')}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyCommand('formatBlock', 'h2')}
                  >
                    {t('superAdmin.visitReport.toolbar.heading2')}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyCommand('formatBlock', 'h3')}
                  >
                    {t('superAdmin.visitReport.toolbar.heading3')}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyCommand('insertUnorderedList')}
                  >
                    {t('superAdmin.visitReport.toolbar.bulletList')}
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyCommand('insertOrderedList')}
                  >
                    {t('superAdmin.visitReport.toolbar.orderedList')}
                  </button>
                </div>
                <div
                  ref={(element) => {
                    editorRefs.current[block.focusAreaId] = element
                  }}
                  className="wysiwyg-editor"
                  contentEditable
                  dir="auto"
                  suppressContentEditableWarning
                  // Content is authored by super admins only
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              </div>
            </FormField>
            <div className="wysiwyg-actions">
              <Button
                type="button"
                variant="ghost"
                loading={savingId === block.focusAreaId}
                onClick={() => handleSave(block.focusAreaId)}
              >
                {t('superAdmin.visitReport.saveSection')}
              </Button>
              {savedId === block.focusAreaId && savingId !== block.focusAreaId && (
                <span className="wysiwyg-status">
                  {t('superAdmin.visitReport.sectionSaved')}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}


