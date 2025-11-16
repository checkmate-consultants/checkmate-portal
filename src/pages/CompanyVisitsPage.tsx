import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import {
  fetchCompanyVisits,
  type Visit,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './company-visits-page.css'

type CompanyVisitState = {
  status: 'loading' | 'ready' | 'error'
  visits: Visit[]
  errorMessage: string | null
}

export function CompanyVisitsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<CompanyVisitState>({
    status: 'loading',
    visits: [],
    errorMessage: null,
  })

  useEffect(() => {
    const load = async () => {
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
  }, [session.membership, t])

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

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('companyVisits.title')}</h1>
          <p>{t('companyVisits.subtitle')}</p>
        </div>
      </header>

      {state.visits.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('companyVisits.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table visits-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.visits.table.date')}</span>
            <span>{t('superAdmin.visits.table.property')}</span>
            <span>{t('superAdmin.visits.table.focusAreas')}</span>
            <span>{t('superAdmin.visits.table.status')}</span>
            <span>{t('companyVisits.table.actions')}</span>
          </div>
          {state.visits.filter(Boolean).map((visit) => {
            // Extra guard against any malformed data
            if (!visit) return null
            const canViewReport =
              visit.status !== 'scheduled' && visit.status !== 'under_review'
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
                <span>{t(`superAdmin.visits.status.${visit.status}`)}</span>
                <span>
                  {canViewReport ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate(`/workspace/visits/${visit.id}`)}
                    >
                      {t('companyVisits.viewReport')}
                    </Button>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


