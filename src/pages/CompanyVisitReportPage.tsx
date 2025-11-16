import { useEffect, useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import {
  fetchVisitReports,
  type VisitFocusAreaReport,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './company-visit-report-page.css'

export function CompanyVisitReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { visitId } = useParams<{ visitId: string }>()
  const { session } = useOutletContext<WorkspaceOutletContext>()

  const [reports, setReports] = useState<VisitFocusAreaReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visitId) return
    if (!session.membership) {
      setError(t('superAdmin.errors.generic'))
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
  }, [visitId, session.membership, t])

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
    <div className="super-admin-page company-visit-report-page">
      <header className="super-admin-header company-visit-report-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.companyVisits.reportTitle')}</h1>
          <p>{t('superAdmin.companyVisits.reportSubtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          {t('superAdmin.visitReport.backToVisits')}
        </Button>
      </header>

      <div className="company-visit-report-list">
        {reports.map((block) => (
          <Card key={block.focusAreaId} className="super-admin-card">
            <h2 className="company-visit-report-heading">
              {block.focusAreaName}
            </h2>
            {block.content ? (
              <div
                className="company-visit-report-content"
                // Content is authored by super admins only
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <p className="company-visit-report-empty">
                {t('companyVisits.noContent')}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}


