import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext, useSearchParams, Link } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Table } from '../components/ui/Table.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Select } from '../components/ui/Select.tsx'
import {
  fetchShoppers,
  fetchShopperCities,
  createShopper,
  updateShopperStatus,
  type Shopper,
  type ShopperStatus,
} from '../data/companyManagement.ts'
import { COUNTRIES } from '../data/countries.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-shoppers-page.css'

function ShopperStatusSelect({
  shopperId,
  value,
  onUpdate,
  t,
}: {
  shopperId: string
  value: ShopperStatus
  onUpdate: () => void
  t: (key: string) => string
}) {
  const [updating, setUpdating] = useState(false)
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ShopperStatus
    if (next === value) return
    setUpdating(true)
    try {
      await updateShopperStatus(shopperId, next)
      onUpdate()
    } finally {
      setUpdating(false)
    }
  }
  return (
    <Select
      value={value}
      onChange={handleChange}
      disabled={updating}
      size="sm"
      className="shopper-status-select"
    >
      <option value="pending">{t('shopperStatus.pending')}</option>
      <option value="under_review">{t('shopperStatus.under_review')}</option>
      <option value="confirmed">{t('shopperStatus.confirmed')}</option>
    </Select>
  )
}

type ShopperState = {
  status: 'loading' | 'ready' | 'error'
  shoppers: Shopper[]
  errorMessage: string | null
}

type ShopperFormValues = {
  fullName: string
  email: string
}

export function SuperAdminShoppersPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminShoppers.title')} | ${t('brand.name')}`,
    t('meta.superAdminShoppers.description'),
  )
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [shopperState, setShopperState] = useState<ShopperState>({
    status: 'loading',
    shoppers: [],
    errorMessage: null,
  })
  const filterValues = useMemo(
    () => ({
      status: searchParams.get('status') ?? '',
      country: searchParams.get('country') ?? '',
      city: searchParams.get('city') ?? '',
      search: searchParams.get('search') ?? '',
      createdInLastDays: searchParams.get('createdInLastDays') ?? '',
    }),
    [searchParams],
  )
  const [cities, setCities] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    email: string
    password: string
  } | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t('validation.nameLength')),
        email: z.string().email(t('validation.email')),
      }),
    [t],
  )

  const form = useForm<ShopperFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
    },
    mode: 'onChange',
  })

  const loadShoppers = async (filters?: {
    status?: string
    country?: string
    city?: string
    search?: string
    createdInLastDays?: string
  }) => {
    try {
      const apiFilters =
        filters ?? (filterValues as { status?: string; country?: string; city?: string; search?: string; createdInLastDays?: string })
      const createdDays = apiFilters.createdInLastDays?.trim()
      const createdInLastDaysNum = createdDays ? parseInt(createdDays, 10) : undefined
      const shoppers = await fetchShoppers({
        ...(apiFilters.status && { status: apiFilters.status as ShopperStatus }),
        ...(apiFilters.country && { country: apiFilters.country }),
        ...(apiFilters.city && { city: apiFilters.city }),
        ...(apiFilters.search?.trim() && { search: apiFilters.search.trim() }),
        ...(createdInLastDaysNum != null && !Number.isNaN(createdInLastDaysNum) && createdInLastDaysNum > 0 && { createdInLastDays: createdInLastDaysNum }),
      })
      setShopperState({ status: 'ready', shoppers, errorMessage: null })
    } catch (error) {
      setShopperState({
        status: 'error',
        shoppers: [],
        errorMessage:
          error instanceof Error
            ? error.message
            : t('superAdmin.errors.generic'),
      })
    }
  }

  useEffect(() => {
    if (!session.isSuperAdmin) {
      setShopperState({
        status: 'error',
        shoppers: [],
        errorMessage: t('superAdmin.errors.unauthorized'),
      })
      return
    }
    const filters = {
      status: searchParams.get('status') ?? '',
      country: searchParams.get('country') ?? '',
      city: searchParams.get('city') ?? '',
      search: searchParams.get('search') ?? '',
      createdInLastDays: searchParams.get('createdInLastDays') ?? '',
    }
    loadShoppers(filters)
    fetchShopperCities().then(setCities).catch(() => setCities([]))
  }, [session.isSuperAdmin, searchParams, t])

  const handleFilterChange = (values: Record<string, unknown>) => {
    const next = values as { status?: string; country?: string; city?: string; search?: string; createdInLastDays?: string }
    const params: Record<string, string> = {}
    if (next.status) params.status = next.status
    if (next.country) params.country = next.country
    if (next.city) params.city = next.city
    if (next.search?.trim()) params.search = next.search.trim()
    if (next.createdInLastDays?.trim()) params.createdInLastDays = next.createdInLastDays.trim()
    setSearchParams(params, { replace: true })
  }

  const openModal = async () => {
    form.reset({ fullName: '', email: '' })
    setCreationResult(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
  }

  const onSubmit: SubmitHandler<ShopperFormValues> = async (values) => {
    const result = await createShopper({
      fullName: values.fullName,
      email: values.email,
    })
    setCreationResult({
      email: values.email,
      password: result.tempPassword,
    })
    await loadShoppers()
    form.reset({ fullName: '', email: '' })
  }

  if (shopperState.status === 'loading') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (shopperState.status === 'error') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{shopperState.errorMessage}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.shoppers.title')}</h1>
          <p>{t('superAdmin.shoppers.subtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={openModal}>
          {t('superAdmin.shoppers.newShopper')}
        </Button>
      </header>

      <Table<Shopper>
          columns={[
            {
              key: 'fullName',
              header: t('superAdmin.shoppers.table.name'),
              render: (shopper) => (
                <Link
                  to={`/workspace/admin/shoppers/${shopper.id}`}
                  className="shopper-table__name-link"
                >
                  {shopper.fullName}
                </Link>
              ),
            },
            {
              key: 'email',
              header: t('superAdmin.shoppers.table.email'),
            },
            {
              key: 'status',
              header: t('superAdmin.shoppers.table.status'),
              render: (shopper) => t(`shopperStatus.${shopper.status}`),
            },
            {
              key: 'locationCountry',
              header: t('superAdmin.shoppers.table.country'),
              render: (shopper) => {
                const code = shopper.locationCountry ?? ''
                const name = code ? COUNTRIES.find((c) => c.code === code)?.name ?? code : '—'
                return name
              },
            },
            {
              key: 'locationCity',
              header: t('superAdmin.shoppers.table.city'),
              render: (shopper) => shopper.locationCity ?? '—',
            },
            {
              key: 'createdAt',
              header: t('superAdmin.shoppers.table.created'),
              render: (shopper) =>
                new Date(shopper.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
            },
            {
              key: 'actions',
              header: t('superAdmin.shoppers.table.actions'),
              render: (shopper) => (
                <span className="shopper-table__actions">
                  <Link
                    to={`/workspace/admin/shoppers/${shopper.id}`}
                    className="shopper-table__view-link"
                  >
                    {t('superAdmin.shoppers.details.viewProfile')}
                  </Link>
                  <ShopperStatusSelect
                    shopperId={shopper.id}
                    value={shopper.status}
                    onUpdate={() => loadShoppers()}
                    t={t}
                  />
                </span>
              ),
            },
          ]}
          data={shopperState.shoppers}
          getRowKey={(shopper) => shopper.id}
          filterMode="server"
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          emptyState={
            !filterValues.status && !filterValues.country && !filterValues.city && !filterValues.search && !filterValues.createdInLastDays ? (
              <p>{t('superAdmin.shoppers.empty')}</p>
            ) : undefined
          }
          filters={[
            {
              key: 'status',
              label: t('superAdmin.shoppers.filters.status'),
              type: 'select',
              options: [
                { value: '', label: t('superAdmin.shoppers.filters.allStatuses') },
                { value: 'pending', label: t('shopperStatus.pending') },
                { value: 'under_review', label: t('shopperStatus.under_review') },
                { value: 'confirmed', label: t('shopperStatus.confirmed') },
              ],
            },
            {
              key: 'createdInLastDays',
              label: t('superAdmin.shoppers.filters.createdInLastDays'),
              type: 'select',
              options: [
                { value: '', label: t('superAdmin.shoppers.filters.allTime') },
                { value: '7', label: t('superAdmin.shoppers.filters.last7Days') },
                { value: '28', label: t('superAdmin.shoppers.filters.last28Days') },
              ],
            },
            {
              key: 'country',
              label: t('superAdmin.shoppers.filters.country'),
              type: 'select',
              options: [
                { value: '', label: t('superAdmin.shoppers.filters.allCountries') },
                ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
              ],
            },
            {
              key: 'city',
              label: t('superAdmin.shoppers.filters.city'),
              type: 'select',
              options: [
                { value: '', label: t('superAdmin.shoppers.filters.allCities') },
                ...cities.map((city) => ({ value: city, label: city })),
              ],
            },
            {
              key: 'search',
              label: t('superAdmin.shoppers.filters.search'),
              type: 'text',
              placeholder: t('superAdmin.shoppers.filters.search'),
            },
          ]}
        />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('superAdmin.shoppers.forms.title')}
        description={t('superAdmin.shoppers.forms.description')}
      >
        <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            id="shopper-full-name"
            label={t('superAdmin.shoppers.forms.fullName')}
            error={form.formState.errors.fullName?.message}
          >
            <Input
              id="shopper-full-name"
              {...form.register('fullName')}
              hasError={Boolean(form.formState.errors.fullName)}
            />
          </FormField>

          <FormField
            id="shopper-email"
            label={t('superAdmin.shoppers.forms.email')}
            error={form.formState.errors.email?.message}
          >
            <Input
              id="shopper-email"
              type="email"
              {...form.register('email')}
              hasError={Boolean(form.formState.errors.email)}
            />
          </FormField>

          {creationResult && (
            <Card className="shopper-result-card">
              <p>{t('superAdmin.shoppers.success', { email: creationResult.email })}</p>
              <p>
                {t('superAdmin.shoppers.tempPassword')}{' '}
                <strong>{creationResult.password}</strong>
              </p>
            </Card>
          )}

          <div className="modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('superAdmin.shoppers.forms.cancel')}
            </Button>
            <Button type="submit" disabled={!form.formState.isValid}>
              {t('superAdmin.shoppers.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


