import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import {
  fetchCompanyDirectory,
  type CompanyDirectoryItem,
} from '../data/companyManagement.ts'
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  suggestNextInvoiceNumber,
  getInvoiceErrorMessage,
  type Invoice,
  type InvoiceStatus,
} from '../data/invoices.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-invoices-page.css'

type InvoiceState = {
  status: 'loading' | 'ready' | 'error'
  invoices: Invoice[]
  errorMessage: string | null
}

type ModalState = {
  open: boolean
  companies: CompanyDirectoryItem[]
  suggestedNumber: string | null
}

type CreateInvoiceFormValues = {
  companyId: string
  invoiceNumber: string
  amount: string
  currency: string
  status: InvoiceStatus
  dueDate?: string
}

const STATUSES: InvoiceStatus[] = [
  'draft',
  'pending',
  'paid',
  'overdue',
  'void',
]

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(cents / 100)
}

export function SuperAdminInvoicesPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminInvoices.title')} | ${t('brand.name')}`,
    t('meta.superAdminInvoices.description'),
  )
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [invoiceState, setInvoiceState] = useState<InvoiceState>({
    status: 'loading',
    invoices: [],
    errorMessage: null,
  })
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    companies: [],
    suggestedNumber: null,
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const schema = z.object({
    companyId: z.string().min(1, t('validation.required')),
    invoiceNumber: z.string().min(1, t('validation.required')),
    amount: z.string().min(1, t('validation.required')),
    currency: z.string().min(1),
    status: z.enum(STATUSES as [InvoiceStatus, ...InvoiceStatus[]]),
    dueDate: z.string().optional(),
  })

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyId: '',
      invoiceNumber: '',
      amount: '',
      currency: 'USD',
      status: 'draft',
      dueDate: '',
    },
    mode: 'onChange',
  })

  const refreshInvoices = async () => {
    try {
      const invoices = await fetchInvoices()
      setInvoiceState({ status: 'ready', invoices, errorMessage: null })
    } catch (error) {
      setInvoiceState({
        status: 'error',
        invoices: [],
        errorMessage: getInvoiceErrorMessage(
          error,
          t('superAdmin.errors.generic'),
        ),
      })
    }
  }

  useEffect(() => {
    if (!session.isSuperAdmin && !session.isAccountManager) {
      setInvoiceState({
        status: 'error',
        invoices: [],
        errorMessage: t('superAdmin.errors.unauthorized'),
      })
      return
    }
    refreshInvoices()
  }, [session.isSuperAdmin, session.isAccountManager, t])

  const openModal = async () => {
    try {
      const companies = await fetchCompanyDirectory()
      setModalState({ open: true, companies, suggestedNumber: null })
      form.reset({
        companyId: '',
        invoiceNumber: '',
        amount: '',
        currency: 'USD',
        status: 'draft',
        dueDate: '',
      })
    } catch {
      // ignore
    }
  }

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }))
  }

  const onCompanyChange = async (companyId: string) => {
    form.setValue('companyId', companyId, { shouldValidate: true })
    if (!companyId) {
      setModalState((prev) => ({ ...prev, suggestedNumber: null }))
      return
    }
    try {
      const suggested = await suggestNextInvoiceNumber(companyId)
      setModalState((prev) => ({ ...prev, suggestedNumber: suggested }))
      form.setValue('invoiceNumber', suggested, { shouldValidate: true })
    } catch {
      setModalState((prev) => ({ ...prev, suggestedNumber: null }))
    }
  }

  const onSubmit: SubmitHandler<CreateInvoiceFormValues> = async (values) => {
    const amountCents = Math.round(parseFloat(values.amount) * 100)
    if (Number.isNaN(amountCents) || amountCents < 0) return
    await createInvoice({
      companyId: values.companyId,
      invoiceNumber: values.invoiceNumber.trim(),
      amountCents,
      currency: values.currency,
      status: values.status,
      dueDate: values.dueDate?.trim() || null,
      issuedAt: values.status !== 'draft' ? new Date().toISOString() : null,
    })
    closeModal()
    refreshInvoices()
  }

  const handleStatusChange = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      setUpdatingId(invoiceId)
      await updateInvoice(invoiceId, { status })
      await refreshInvoices()
    } finally {
      setUpdatingId(null)
    }
  }

  if (invoiceState.status === 'loading') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (invoiceState.status === 'error') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{invoiceState.errorMessage}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.invoices.title')}</h1>
          <p>{t('superAdmin.invoices.subtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={openModal}>
          {t('superAdmin.invoices.newInvoice')}
        </Button>
      </header>

      {invoiceState.invoices.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.invoices.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table invoices-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.invoices.table.company')}</span>
            <span>{t('superAdmin.invoices.table.number')}</span>
            <span>{t('superAdmin.invoices.table.amount')}</span>
            <span>{t('superAdmin.invoices.table.status')}</span>
            <span>{t('superAdmin.invoices.table.dueDate')}</span>
            <span>{t('superAdmin.invoices.table.actions')}</span>
          </div>
          {invoiceState.invoices.map((inv) => (
            <div key={inv.id} className="super-admin-table__row">
              <span>{inv.companyName}</span>
              <span>{inv.invoiceNumber}</span>
              <span>{formatAmount(inv.amountCents, inv.currency)}</span>
              <span>
                <select
                  className="invoices-status-select"
                  value={inv.status}
                  disabled={updatingId === inv.id}
                  onChange={(e) =>
                    handleStatusChange(
                      inv.id,
                      e.target.value as InvoiceStatus,
                    )
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`superAdmin.invoices.status.${s}`)}
                    </option>
                  ))}
                </select>
              </span>
              <span>
                {inv.dueDate
                  ? new Date(inv.dueDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </span>
              <span />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalState.open}
        onClose={closeModal}
        title={t('superAdmin.invoices.forms.title')}
        description={t('superAdmin.invoices.forms.description')}
      >
        <form
          className="modal-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            id="inv-company"
            label={t('superAdmin.invoices.forms.company')}
            error={form.formState.errors.companyId?.message}
          >
            <select
              id="inv-company"
              className="modal-select"
              {...form.register('companyId')}
              value={form.watch('companyId')}
              onChange={(e) => {
                form.setValue('companyId', e.target.value, {
                  shouldValidate: true,
                })
                onCompanyChange(e.target.value)
              }}
            >
              <option value="">{t('superAdmin.selectCompany')}</option>
              {modalState.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="inv-number"
            label={t('superAdmin.invoices.forms.invoiceNumber')}
            error={form.formState.errors.invoiceNumber?.message}
          >
            <Input
              id="inv-number"
              {...form.register('invoiceNumber')}
              hasError={Boolean(form.formState.errors.invoiceNumber)}
              placeholder={modalState.suggestedNumber ?? 'INV-0001'}
            />
          </FormField>

          <FormField
            id="inv-amount"
            label={t('superAdmin.invoices.forms.amount')}
            error={form.formState.errors.amount?.message}
          >
            <Input
              id="inv-amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register('amount')}
              hasError={Boolean(form.formState.errors.amount)}
            />
          </FormField>

          <FormField
            id="inv-currency"
            label={t('superAdmin.invoices.forms.currency')}
          >
            <select
              id="inv-currency"
              className="modal-select"
              {...form.register('currency')}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </select>
          </FormField>

          <FormField
            id="inv-status"
            label={t('superAdmin.invoices.forms.status')}
          >
            <select
              id="inv-status"
              className="modal-select"
              {...form.register('status')}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`superAdmin.invoices.status.${s}`)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="inv-due"
            label={t('superAdmin.invoices.forms.dueDate')}
            error={form.formState.errors.dueDate?.message}
          >
            <Input
              id="inv-due"
              type="date"
              {...form.register('dueDate')}
              hasError={Boolean(form.formState.errors.dueDate)}
            />
          </FormField>

          <div className="modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('superAdmin.invoices.forms.cancel')}
            </Button>
            <Button type="submit" disabled={!form.formState.isValid}>
              {t('superAdmin.invoices.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
