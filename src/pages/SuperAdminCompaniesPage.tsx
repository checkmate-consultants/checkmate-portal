import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Select } from '../components/ui/Select.tsx'
import {
  fetchCompanyDirectory,
  fetchAccountManagers,
  updateCompanyAccountManager,
  type CompanyDirectoryItem,
  type AccountManagerProfile,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-companies-page.css'

type DirectoryState = {
  status: 'loading' | 'ready' | 'error'
  companies: CompanyDirectoryItem[]
  accountManagers: AccountManagerProfile[]
  errorMessage: string | null
}

export function SuperAdminCompaniesPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminCompanies.title')} | ${t('brand.name')}`,
    t('meta.superAdminCompanies.description'),
  )
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<DirectoryState>({
    status: 'loading',
    companies: [],
    accountManagers: [],
    errorMessage: null,
  })
  const [assignModal, setAssignModal] = useState<{
    companyId: string
    companyName: string
    currentManagerId: string | null
  } | null>(null)
  const [assignValue, setAssignValue] = useState<string>('')
  const [assignSaving, setAssignSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadCompanies = async () => {
      if (!session.isSuperAdmin && !session.isAccountManager) {
        setState({
          status: 'error',
          companies: [],
          accountManagers: [],
          errorMessage: t('superAdmin.errors.unauthorized'),
        })
        return
      }
      try {
        const [directory, accountManagers] = await Promise.all([
          fetchCompanyDirectory(),
          session.isSuperAdmin ? fetchAccountManagers() : Promise.resolve([]),
        ])
        if (!cancelled) {
          setState({
            status: 'ready',
            companies: directory,
            accountManagers,
            errorMessage: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            companies: [],
            accountManagers: [],
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

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.title')}</h1>
          <p>{t('superAdmin.description')}</p>
        </div>
        {session.membership && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/workspace/company')}
          >
            {t('superAdmin.goToMyCompany')}
          </Button>
        )}
      </header>

      {state.companies.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.table.company')}</span>
            <span>{t('superAdmin.table.accountManager')}</span>
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
                {company.accountManager
                  ? company.accountManager.fullName ||
                    company.accountManager.email ||
                    '—'
                  : '—'}
                {session.isSuperAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="super-admin-table__assign-btn"
                    onClick={() => {
                      setAssignModal({
                        companyId: company.id,
                        companyName: company.name,
                        currentManagerId: company.accountManager?.id ?? null,
                      })
                      setAssignValue(
                        company.accountManager?.id ?? '',
                      )
                    }}
                  >
                    {t('superAdmin.table.assignAccountManager')}
                  </Button>
                )}
              </span>
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

      {session.isSuperAdmin && assignModal && (
        <Modal
          open={Boolean(assignModal)}
          onClose={() => setAssignModal(null)}
          title={t('superAdmin.assignAccountManager.title')}
          description={t('superAdmin.assignAccountManager.description', {
            company: assignModal.companyName,
          })}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!assignModal) return
              setAssignSaving(true)
              try {
                await updateCompanyAccountManager(
                  assignModal.companyId,
                  assignValue || null,
                )
                const updatedManager =
                  assignValue && state.accountManagers.length
                    ? state.accountManagers.find(
                        (am) => am.id === assignValue,
                      ) ?? null
                    : null
                setState((prev) => ({
                  ...prev,
                  companies: prev.companies.map((c) =>
                    c.id === assignModal.companyId
                      ? {
                          ...c,
                          accountManager: updatedManager
                            ? {
                                id: updatedManager.id,
                                email: updatedManager.email,
                                fullName: updatedManager.fullName,
                              }
                            : null,
                        }
                      : c,
                  ),
                }))
                setAssignModal(null)
              } catch (err) {
                console.error(err)
              } finally {
                setAssignSaving(false)
              }
            }}
          >
            <FormField
              id="account-manager-select"
              label={t('superAdmin.assignAccountManager.label')}
            >
              <Select
                id="account-manager-select"
                value={assignValue}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssignValue(e.target.value)}
              >
                <option value="">{t('superAdmin.assignAccountManager.none')}</option>
                {state.accountManagers.map((am) => (
                  <option key={am.id} value={am.id}>
                    {am.fullName || am.email || am.id}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="modal-form__actions" style={{ marginTop: '1rem' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAssignModal(null)}
              >
                {t('superAdmin.assignAccountManager.cancel')}
              </Button>
              <Button type="submit" loading={assignSaving}>
                {t('superAdmin.assignAccountManager.submit')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}


