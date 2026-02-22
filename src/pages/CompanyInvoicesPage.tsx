import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import {
  fetchCompanyInvoices,
  fetchCompanyInvoiceSummary,
  getInvoiceErrorMessage,
  type Invoice,
  type CompanyInvoiceSummary,
} from '../data/invoices.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './company-invoices-page.css'

type PageState = {
  status: 'loading' | 'ready' | 'error'
  invoices: Invoice[]
  summary: CompanyInvoiceSummary | null
  errorMessage: string | null
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(cents / 100)
}

export function CompanyInvoicesPage() {
  const { t } = useTranslation()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<PageState>({
    status: 'loading',
    invoices: [],
    summary: null,
    errorMessage: null,
  })

  useEffect(() => {
    const companyId = session.membership?.company_id
    if (!companyId) {
      setState({
        status: 'error',
        invoices: [],
        summary: null,
        errorMessage: t('companyManagement.errors.noMembership'),
      })
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const [invoices, summary] = await Promise.all([
          fetchCompanyInvoices(companyId),
          fetchCompanyInvoiceSummary(companyId),
        ])
        if (!cancelled) {
          setState({
            status: 'ready',
            invoices,
            summary,
            errorMessage: null,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            invoices: [],
            summary: null,
            errorMessage: getInvoiceErrorMessage(
              error,
              t('superAdmin.errors.generic'),
            ),
          })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.membership?.company_id, t])

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

  const summary = state.summary!
  const invoices = state.invoices

  return (
    <div className="super-admin-page company-invoices-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('workspace.sidebar.tenant')}</p>
          <h1>{t('companyInvoices.title')}</h1>
          <p>{t('companyInvoices.subtitle')}</p>
        </div>
      </header>

      <div className="company-invoices-page__cards">
        <Card className="company-invoices-page__card">
          <p className="company-invoices-page__card-label">
            {t('companyInvoices.summary.totalInvoiced12Months')}
          </p>
          <p className="company-invoices-page__card-value">
            {formatAmount(
              summary.totalInvoicedLast12MonthsCents,
              'USD',
            )}
          </p>
        </Card>
        <Card className="company-invoices-page__card">
          <p className="company-invoices-page__card-label">
            {t('companyInvoices.summary.pendingInvoices')}
          </p>
          <p className="company-invoices-page__card-value">
            {summary.pendingCount} {t('companyInvoices.summary.invoices')} ·{' '}
            {formatAmount(summary.pendingTotalCents, 'USD')}
          </p>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('companyInvoices.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table company-invoices-table">
          <div className="super-admin-table__head">
            <span>{t('companyInvoices.table.number')}</span>
            <span>{t('companyInvoices.table.amount')}</span>
            <span>{t('companyInvoices.table.status')}</span>
            <span>{t('companyInvoices.table.dueDate')}</span>
            <span>{t('companyInvoices.table.issuedAt')}</span>
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className="super-admin-table__row">
              <span>{inv.invoiceNumber}</span>
              <span>{formatAmount(inv.amountCents, inv.currency)}</span>
              <span>{t(`superAdmin.invoices.status.${inv.status}`)}</span>
              <span>
                {inv.dueDate
                  ? new Date(inv.dueDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </span>
              <span>
                {inv.issuedAt
                  ? new Date(inv.issuedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
