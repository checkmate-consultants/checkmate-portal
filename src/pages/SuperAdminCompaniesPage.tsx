import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import {
  fetchCompanyDirectory,
  type CompanyDirectoryItem,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './super-admin-companies-page.css'

type DirectoryState = {
  status: 'loading' | 'ready' | 'error'
  companies: CompanyDirectoryItem[]
  errorMessage: string | null
}

export function SuperAdminCompaniesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<DirectoryState>({
    status: 'loading',
    companies: [],
    errorMessage: null,
  })

  useEffect(() => {
    let cancelled = false
    const loadCompanies = async () => {
      if (!session.isSuperAdmin) {
        setState({
          status: 'error',
          companies: [],
          errorMessage: t('superAdmin.errors.unauthorized'),
        })
        return
      }
      try {
        const directory = await fetchCompanyDirectory()
        if (!cancelled) {
          setState({ status: 'ready', companies: directory, errorMessage: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            companies: [],
            errorMessage:
              error instanceof Error
                ? error.message
                : t('superAdmin.errors.generic'),
          })
        }
      }
    }
    loadCompanies()
    return () => {
      cancelled = true
    }
  }, [session.isSuperAdmin, t])

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
          <h1>{t('superAdmin.title')}</h1>
          <p>{t('superAdmin.description')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={() => navigate('/workspace/company')}>
          {t('superAdmin.goToMyCompany')}
        </Button>
      </header>

      {state.companies.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.table.company')}</span>
            <span>{t('superAdmin.table.created')}</span>
            <span>{t('superAdmin.table.properties')}</span>
            <span>{t('superAdmin.table.actions')}</span>
          </div>
          {state.companies.map((company) => (
            <div key={company.id} className="super-admin-table__row">
              <div className="super-admin-table__cell">
                <p className="super-admin-table__name">{company.name}</p>
                <p className="super-admin-table__meta">
                  {t('superAdmin.table.idLabel', { id: company.id })}
                </p>
              </div>
              <span>
                {new Date(company.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>{company.propertyCount}</span>
              <span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    navigate(`/workspace/admin/companies/${company.id}`)
                  }
                >
                  {t('superAdmin.table.open')}
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


