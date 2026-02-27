import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import {
  fetchSuperAdminOverviewStats,
  type SuperAdminOverviewStats,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-overview-page.css'

type OverviewState = {
  status: 'loading' | 'ready' | 'error'
  stats: SuperAdminOverviewStats | null
  errorMessage: string | null
}

export function SuperAdminOverviewPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminOverview.title')} | ${t('brand.name')}`,
    t('meta.superAdminOverview.description'),
  )
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<OverviewState>({
    status: 'loading',
    stats: null,
    errorMessage: null,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!session.isSuperAdmin && !session.isAccountManager) {
        setState({
          status: 'error',
          stats: null,
          errorMessage: t('superAdmin.errors.unauthorized'),
        })
        return
      }
      try {
        const stats = await fetchSuperAdminOverviewStats()
        if (!cancelled) {
          setState({ status: 'ready', stats, errorMessage: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            stats: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : t('superAdmin.errors.generic'),
          })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.isSuperAdmin, session.isAccountManager, t])

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

  const stats = state.stats!

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.overview.title')}</h1>
          <p>{t('superAdmin.overview.subtitle')}</p>
        </div>
      </header>

      <section className="super-admin-overview__block">
        <h2 className="super-admin-overview__block-title">
          {t('superAdmin.overview.reportsSection')}
        </h2>
        <div className="super-admin-overview__block-body">
          <div className="super-admin-overview__subsection">
            <h3 className="super-admin-overview__subsection-title">
              {t('superAdmin.overview.last28Days')}
            </h3>
            <div className="super-admin-overview__cards">
                <Card className="super-admin-overview__card">
                  <p className="super-admin-overview__label">
                    {t('superAdmin.overview.submittedByShoppers')}
                  </p>
                  <p className="super-admin-overview__value">
                    {stats.reportsSubmittedByShoppersLast28Days}
                  </p>
                </Card>
                <Card className="super-admin-overview__card">
                  <p className="super-admin-overview__label">
                    {t('superAdmin.overview.reviewed')}
                  </p>
                  <p className="super-admin-overview__value">
                    {stats.reportsReviewedLast28Days}
                  </p>
                </Card>
                <Card className="super-admin-overview__card">
                  <p className="super-admin-overview__label">
                    {t('superAdmin.overview.submittedToClient')}
                  </p>
                  <p className="super-admin-overview__value">
                    {stats.reportsSubmittedToClientLast28Days}
                  </p>
                </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="super-admin-overview__block">
        <h2 className="super-admin-overview__block-title">
          {t('superAdmin.overview.shoppersSection')}
        </h2>
        <div className="super-admin-overview__block-body">
          <div className="super-admin-overview__subsection">
            <h3 className="super-admin-overview__subsection-title">
              {t('superAdmin.overview.last28Days')}
            </h3>
            <div className="super-admin-overview__cards">
              <Card className="super-admin-overview__card">
                <p className="super-admin-overview__label">
                  {t('superAdmin.overview.created')}
                </p>
                <p className="super-admin-overview__value">
                  {stats.shoppersCreatedLast28Days}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
