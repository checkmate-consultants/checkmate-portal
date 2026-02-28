import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import {
  fetchCompanyVisits,
  fetchVisitsAssignedToShopper,
  type Visit,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './company-visits-page.css'

type CompanyVisitState = {
  status: 'loading' | 'ready' | 'error'
  visits: Visit[]
  errorMessage: string | null
}

export function CompanyVisitsPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.visits.title')} | ${t('brand.name')}`,
    t('meta.visits.description'),
  )
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<CompanyVisitState>({
    status: 'loading',
    visits: [],
    errorMessage: null,
  })

  useEffect(() => {
    const load = async () => {
      if (session.isShopper) {
        if (!session.shopperId) {
          setState({
            status: 'error',
            visits: [],
            errorMessage: t('superAdmin.errors.generic'),
          })
          return
        }
        try {
          const visits = await fetchVisitsAssignedToShopper(session.shopperId)
          setState({ status: 'ready', visits, errorMessage: null })
        } catch (error) {
          setState({
            status: 'error',
            visits: [],
            errorMessage:
              error instanceof Error
                ? error.message
                : t('superAdmin.errors.generic'),
          })
        }
        return
      }
      if (!session.membership) {
        setState({
          status: 'error',
          visits: [],
          errorMessage: t('superAdmin.errors.generic'),
        })
        return
      }
      try {
        const visits = await fetchCompanyVisits(session.membership.company_id)
        setState({ status: 'ready', visits, errorMessage: null })
      } catch (error) {
        setState({
          status: 'error',
          visits: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : t('superAdmin.errors.generic'),
        })
      }
    }

    load()
  }, [session.membership, session.isShopper, session.shopperId, t])

  if (state.status === 'loading') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{state.errorMessage}</p>
        </Card>
      </div>
    )
  }

  const startOfToday = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })()

  const validVisits = state.visits.filter(Boolean) as Visit[]
  const upcomingVisits = validVisits
    .filter((v) => new Date(v.scheduledFor).getTime() >= startOfToday)
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
    )
  const pastVisits = validVisits
    .filter((v) => new Date(v.scheduledFor).getTime() < startOfToday)
    .sort(
      (a, b) =>
        new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime(),
    )

  function renderVisitRow(visit: Visit) {
    const canViewReport =
      visit.status !== 'scheduled' && visit.status !== 'under_review'
    const isShopper = session.isShopper
    const shopperCanSubmit = visit.status === 'scheduled'
    const showReportLink = isShopper ? true : canViewReport
    const reportLabel = isShopper
      ? shopperCanSubmit
        ? t('superAdmin.visitReport.open')
        : t('companyVisits.viewReport')
      : t('companyVisits.viewReport')

    return (
      <div
        key={visit.id}
        className="super-admin-table__row visits-table__row"
      >
        <span>
          {new Date(visit.scheduledFor).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span>
          {visit.property.name} · {visit.property.city},{' '}
          {visit.property.country}
        </span>
        <span>
          {visit.focusAreas.length === 0
            ? t('companyManagement.property.emptyFocusAreas')
            : visit.focusAreas.map((area) => area.name).join(', ')}
        </span>
        <span>
          {visit.shopper
            ? visit.shopper.fullName || visit.shopper.email || '—'
            : '—'}
        </span>
        <span>{t(`superAdmin.visits.status.${visit.status}`)}</span>
        <span>
          {showReportLink ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/workspace/visits/${visit.id}`)}
            >
              {reportLabel}
            </Button>
          ) : (
            '—'
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('companyVisits.title')}</h1>
          <p>{t('companyVisits.subtitle')}</p>
        </div>
      </header>

      {validVisits.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('companyVisits.empty')}</p>
        </Card>
      ) : (
        <>
          <section className="company-visits-page__section">
            <h2 className="company-visits-page__section-title">
              {t('companyVisits.upcomingVisits')}
            </h2>
            {upcomingVisits.length === 0 ? (
              <Card className="super-admin-card">
                <p>{t('companyVisits.upcomingEmpty')}</p>
              </Card>
            ) : (
              <div className="super-admin-table visits-table">
                <div className="super-admin-table__head">
                  <span>{t('superAdmin.visits.table.date')}</span>
                  <span>{t('superAdmin.visits.table.property')}</span>
                  <span>{t('superAdmin.visits.table.focusAreas')}</span>
                  <span>{t('superAdmin.visits.table.shopper')}</span>
                  <span>{t('superAdmin.visits.table.status')}</span>
                  <span>{t('companyVisits.table.actions')}</span>
                </div>
                {upcomingVisits.map(renderVisitRow)}
              </div>
            )}
          </section>

          <section className="company-visits-page__section">
            <h2 className="company-visits-page__section-title">
              {t('companyVisits.pastVisits')}
            </h2>
            {pastVisits.length === 0 ? (
              <Card className="super-admin-card">
                <p>{t('companyVisits.pastEmpty')}</p>
              </Card>
            ) : (
              <div className="super-admin-table visits-table">
                <div className="super-admin-table__head">
                  <span>{t('superAdmin.visits.table.date')}</span>
                  <span>{t('superAdmin.visits.table.property')}</span>
                  <span>{t('superAdmin.visits.table.focusAreas')}</span>
                  <span>{t('superAdmin.visits.table.shopper')}</span>
                  <span>{t('superAdmin.visits.table.status')}</span>
                  <span>{t('companyVisits.table.actions')}</span>
                </div>
                {pastVisits.map(renderVisitRow)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}


