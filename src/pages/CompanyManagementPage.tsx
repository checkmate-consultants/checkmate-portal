import { useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import {
  fetchCompanySnapshot,
  createCompanyProperty,
  deleteCompanyProperty,
  updateCompanyProfile,
  type CompanyProperty,
  type CompanySnapshot,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './company-management-page.css'

type LoadState = {
  status: 'loading' | 'ready' | 'error'
  company: CompanySnapshot | null
  errorMessage: string | null
}

type PropertyFormValues = {
  name: string
  city: string
  country: string
  latitude: string
  longitude: string
}

type OverviewFormValues = {
  email: string
  address: string
  phone: string
}

export function CompanyManagementPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.company.title')} | ${t('brand.name')}`,
    t('meta.company.description'),
  )
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const { companyId: routeCompanyId } = useParams<{ companyId?: string }>()
  const [reloadKey, setReloadKey] = useState(0)
  const [isPropertyModalOpen, setPropertyModalOpen] = useState(false)
  const [isOverviewModalOpen, setOverviewModalOpen] = useState(false)
  const [propertyToDeleteId, setPropertyToDeleteId] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>({
    status: 'loading',
    company: null,
    errorMessage: null,
  })
  const targetCompanyId = routeCompanyId ?? session.membership?.company_id ?? null
  const isAdminView = (session.isSuperAdmin || session.isAccountManager) && Boolean(routeCompanyId)
  const propertyPathPrefix = routeCompanyId
    ? '/workspace/admin/properties'
    : '/workspace/company/properties'
  const backToPath = routeCompanyId
    ? `/workspace/admin/companies/${routeCompanyId}`
    : '/workspace/company'
  const adminListPath = '/workspace/admin/companies'

  const propertySchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation.nameLength')),
        city: z.string().min(1, t('validation.required')),
        country: z.string().min(1, t('validation.required')),
        latitude: z
          .string()
          .transform((value) => value.trim())
          .refine(
            (value) =>
              value === '' ||
              (!Number.isNaN(Number(value)) && Math.abs(Number(value)) <= 90),
            {
              message: t('companyManagement.forms.property.latitudeInvalid'),
            },
          ),
        longitude: z
          .string()
          .transform((value) => value.trim())
          .refine(
            (value) =>
              value === '' ||
              (!Number.isNaN(Number(value)) && Math.abs(Number(value)) <= 180),
            {
              message: t('companyManagement.forms.property.longitudeInvalid'),
            },
          ),
      }),
    [t],
  )

  const propertyForm = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '',
      city: '',
      country: '',
      latitude: '',
      longitude: '',
    },
    mode: 'onChange',
  })

  const deletePropertyMutation = useMutation({
    mutationFn: deleteCompanyProperty,
    onSuccess: () => {
      setPropertyToDeleteId(null)
      setReloadKey((k) => k + 1)
    },
  })

  const propertyMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      if (!state.company) throw new Error('Company not found')
      await createCompanyProperty({
        companyId: state.company.id,
        name: values.name,
        city: values.city,
        country: values.country,
        latitude:
          values.latitude === '' ? undefined : Number(values.latitude),
        longitude:
          values.longitude === '' ? undefined : Number(values.longitude),
      })
    },
    onSuccess: () => {
      propertyForm.reset({
        name: '',
        city: '',
        country: '',
        latitude: '',
        longitude: '',
      })
      setPropertyModalOpen(false)
      setReloadKey((value) => value + 1)
    },
  })

  const handlePropertySubmit: SubmitHandler<PropertyFormValues> = (values) => {
    propertyMutation.mutate(values)
  }

  const overviewSchema = useMemo(
    () =>
      z.object({
        email: z.string(),
        address: z.string(),
        phone: z.string(),
      }),
    [],
  )
  const overviewForm = useForm<OverviewFormValues>({
    resolver: zodResolver(overviewSchema),
    defaultValues: {
      email: '',
      address: '',
      phone: '',
    },
    mode: 'onChange',
  })
  const overviewMutation = useMutation({
    mutationFn: async (values: OverviewFormValues) => {
      if (!state.company) throw new Error('Company not found')
      await updateCompanyProfile(state.company.id, {
        email: values.email.trim() || null,
        address: values.address.trim() || null,
        phone: values.phone.trim() || null,
      })
    },
    onSuccess: () => {
      setOverviewModalOpen(false)
      setReloadKey((k) => k + 1)
    },
  })
  const handleOverviewSubmit: SubmitHandler<OverviewFormValues> = (values) => {
    overviewMutation.mutate(values)
  }
  const openOverviewModal = () => {
    if (state.company) {
      overviewForm.reset({
        email: state.company.email ?? '',
        address: state.company.address ?? '',
        phone: state.company.phone ?? '',
      })
      setOverviewModalOpen(true)
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadCompany = async () => {
      if (!targetCompanyId) {
        if (!cancelled) {
          setState({
            status: 'error',
            company: null,
            errorMessage: session.isSuperAdmin
              ? t('superAdmin.selectCompany')
              : t('companyManagement.errors.noMembership'),
          })
        }
        return
      }
      try {
        const snapshot = await fetchCompanySnapshot(targetCompanyId)
        if (!snapshot) {
          throw new Error(t('companyManagement.errors.notFound'))
        }
        if (!cancelled) {
          setState({ status: 'ready', company: snapshot, errorMessage: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            company: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : t('companyManagement.errors.generic'),
          })
        }
      }
    }
    loadCompany()
    return () => {
      cancelled = true
    }
  }, [t, reloadKey, targetCompanyId, session.isSuperAdmin])

  if (state.status === 'loading') {
    return (
      <div className="company-management company-management--centered">
        <Card className="company-management__state-card">
          <p>{t('companyManagement.loading')}</p>
        </Card>
      </div>
    )
  }

  if (state.status === 'error' || !state.company) {
    const showAdminRedirect = session.isSuperAdmin || session.isAccountManager
    return (
      <div className="company-management company-management--centered">
        <Card className="company-management__state-card">
          <p>{state.errorMessage ?? t('companyManagement.errors.generic')}</p>
          <Button
            type="button"
            onClick={() => {
              if (showAdminRedirect) {
                navigate(adminListPath)
              } else {
                setReloadKey((value) => value + 1)
              }
            }}
          >
            {showAdminRedirect
              ? t('superAdmin.back')
              : t('companyManagement.retry')}
          </Button>
        </Card>
      </div>
    )
  }

  const company = state.company
  const properties = company.properties

  return (
    <div className="company-management">
      <header className="company-management__header">
        <div>
          <p className="company-management__eyebrow">
            {t('companyManagement.subtitle', { company: company.name })}
          </p>
          <h1>{t('companyManagement.title')}</h1>
          <p>{t('companyManagement.description')}</p>
        </div>
        {isAdminView && (
          <div className="company-management__header-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                navigate(`/workspace/admin/companies/${routeCompanyId}/action-plans`)
              }
            >
              {t('actionPlans.title')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(adminListPath)}
            >
              {t('superAdmin.back')}
            </Button>
          </div>
        )}
      </header>

      <section className="company-management__section company-management__overview">
        <div className="company-management__section-header">
          <p className="company-management__section-eyebrow">
            {t('companyManagement.overviewLabel')}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={openOverviewModal}
            disabled={!state.company}
          >
            {t('companyManagement.editOverview')}
          </Button>
        </div>
        <Card className="company-management__overview-card">
          <div className="company-management__overview-grid">
            <div>
              <p className="company-management__overview-label">
                {t('companyManagement.overview.email')}
              </p>
              <p>{company.email || '—'}</p>
            </div>
            <div>
              <p className="company-management__overview-label">
                {t('companyManagement.overview.address')}
              </p>
              <p>{company.address || '—'}</p>
            </div>
            <div>
              <p className="company-management__overview-label">
                {t('companyManagement.overview.phone')}
              </p>
              <p>{company.phone || '—'}</p>
            </div>
            <div>
              <p className="company-management__overview-label">
                {t('companyManagement.overview.accountManager')}
              </p>
              <p>
                {company.accountManager ? (
                  <>
                    {company.accountManager.fullName ||
                      company.accountManager.email ||
                      t('companyManagement.overview.accountManagerUnknown')}
                    {company.accountManager.email && (
                      <span className="company-management__overview-email">
                        {' '}
                        ({company.accountManager.email})
                      </span>
                    )}
                  </>
                ) : (
                  t('companyManagement.overview.notAssigned')
                )}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="company-management__section">
        <div className="company-management__section-header">
          <div>
            <p className="company-management__section-eyebrow">
              {t('companyManagement.propertiesLabel')}
            </p>
            <h2>{t('companyManagement.propertiesTitle')}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPropertyModalOpen(true)}
            disabled={!state.company}
          >
            {t('companyManagement.newProperty')}
          </Button>
        </div>

        {properties.length === 0 ? (
          <Card className="company-management__state-card">
            <p>{t('companyManagement.empty')}</p>
          </Card>
        ) : (
          <div className="company-management__grid">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                navigate={navigate}
                t={t}
                propertyPathPrefix={propertyPathPrefix}
                backToPath={backToPath}
                canDeleteProperty={session.isSuperAdmin && Boolean(routeCompanyId)}
                onDeleteProperty={setPropertyToDeleteId}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={isPropertyModalOpen}
        onClose={() => setPropertyModalOpen(false)}
        title={t('companyManagement.forms.property.title')}
        description={t('companyManagement.forms.property.description')}
      >
        <form
          className="modal-form"
          onSubmit={propertyForm.handleSubmit(handlePropertySubmit)}
        >
          <FormField
            id="property-name"
            label={t('companyManagement.forms.property.fields.name')}
            error={propertyForm.formState.errors.name?.message}
          >
            <Input
              id="property-name"
              {...propertyForm.register('name')}
              hasError={Boolean(propertyForm.formState.errors.name)}
            />
          </FormField>
          <div className="modal-form__row">
            <FormField
              id="property-city"
              label={t('companyManagement.forms.property.fields.city')}
              error={propertyForm.formState.errors.city?.message}
            >
              <Input
                id="property-city"
                {...propertyForm.register('city')}
                hasError={Boolean(propertyForm.formState.errors.city)}
              />
            </FormField>
            <FormField
              id="property-country"
              label={t('companyManagement.forms.property.fields.country')}
              error={propertyForm.formState.errors.country?.message}
            >
              <Input
                id="property-country"
                {...propertyForm.register('country')}
                hasError={Boolean(propertyForm.formState.errors.country)}
              />
            </FormField>
          </div>
          <div className="modal-form__row">
            <FormField
              id="property-latitude"
              label={t('companyManagement.forms.property.fields.latitude')}
              error={propertyForm.formState.errors.latitude?.message}
            >
              <Input
                id="property-latitude"
                type="number"
                step="0.001"
                {...propertyForm.register('latitude')}
                hasError={Boolean(propertyForm.formState.errors.latitude)}
              />
            </FormField>
            <FormField
              id="property-longitude"
              label={t('companyManagement.forms.property.fields.longitude')}
              error={propertyForm.formState.errors.longitude?.message}
            >
              <Input
                id="property-longitude"
                type="number"
                step="0.001"
                {...propertyForm.register('longitude')}
                hasError={Boolean(propertyForm.formState.errors.longitude)}
              />
            </FormField>
          </div>
          {propertyMutation.isError && (
            <p className="form-error">
              {propertyMutation.error instanceof Error
                ? propertyMutation.error.message
                : t('validation.generic')}
            </p>
          )}
          <div className="modal-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPropertyModalOpen(false)}
            >
              {t('companyManagement.forms.property.cancel')}
            </Button>
            <Button
              type="submit"
              loading={propertyMutation.isPending}
              disabled={!propertyForm.formState.isValid}
            >
              {t('companyManagement.forms.property.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      {propertyToDeleteId && (
        <Modal
          open={true}
          onClose={() => !deletePropertyMutation.isPending && setPropertyToDeleteId(null)}
          title={t('companyManagement.confirmDeleteProperty')}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPropertyToDeleteId(null)}
                disabled={deletePropertyMutation.isPending}
              >
                {t('companyManagement.forms.property.cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => deletePropertyMutation.mutate(propertyToDeleteId)}
                loading={deletePropertyMutation.isPending}
              >
                {t('companyManagement.confirmDeleteYes')}
              </Button>
            </>
          }
        >
          <p>{t('companyManagement.confirmDeleteProperty')}</p>
        </Modal>
      )}

      <Modal
        open={isOverviewModalOpen}
        onClose={() => setOverviewModalOpen(false)}
        title={t('companyManagement.forms.overview.title')}
        description={t('companyManagement.forms.overview.description')}
      >
        <form
          className="modal-form"
          onSubmit={overviewForm.handleSubmit(handleOverviewSubmit)}
        >
          <FormField
            id="overview-email"
            label={t('companyManagement.overview.email')}
            error={overviewForm.formState.errors.email?.message}
          >
            <Input
              id="overview-email"
              type="email"
              {...overviewForm.register('email')}
              hasError={Boolean(overviewForm.formState.errors.email)}
            />
          </FormField>
          <FormField
            id="overview-address"
            label={t('companyManagement.overview.address')}
            error={overviewForm.formState.errors.address?.message}
          >
            <Input
              id="overview-address"
              {...overviewForm.register('address')}
              hasError={Boolean(overviewForm.formState.errors.address)}
            />
          </FormField>
          <FormField
            id="overview-phone"
            label={t('companyManagement.overview.phone')}
            error={overviewForm.formState.errors.phone?.message}
          >
            <Input
              id="overview-phone"
              type="tel"
              {...overviewForm.register('phone')}
              hasError={Boolean(overviewForm.formState.errors.phone)}
            />
          </FormField>
          {overviewMutation.isError && (
            <p className="form-error">
              {overviewMutation.error instanceof Error
                ? overviewMutation.error.message
                : t('validation.generic')}
            </p>
          )}
          <div className="modal-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOverviewModalOpen(false)}
            >
              {t('companyManagement.forms.overview.cancel')}
            </Button>
            <Button
              type="submit"
              loading={overviewMutation.isPending}
            >
              {t('companyManagement.forms.overview.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

type PropertyCardProps = {
  property: CompanyProperty
  navigate: ReturnType<typeof useNavigate>
  t: TFunction
  propertyPathPrefix: string
  backToPath: string
  canDeleteProperty: boolean
  onDeleteProperty: (id: string) => void
}

const PropertyCard = ({
  property,
  navigate,
  t,
  propertyPathPrefix,
  backToPath,
  canDeleteProperty,
  onDeleteProperty,
}: PropertyCardProps) => {
  const hasCoordinates =
    property.latitude !== null && property.longitude !== null
  return (
    <Card className="company-management__card">
      <div className="company-management__card-head">
        <p className="company-management__location">
          {t('companyManagement.location', {
            city: property.city,
            country: property.country,
          })}
        </p>
        <h3>{property.name}</h3>
        {hasCoordinates && (
          <button
            type="button"
            className="company-management__map-link"
            onClick={() => {
              const url = `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
          >
            {t('companyManagement.viewMap')}
          </button>
        )}
      </div>
      <div className="company-management__card-body">
        <p>
          {t('companyManagement.entityCount', {
            count: property.focusAreas.length,
          })}
        </p>
        <div className="company-management__card-actions">
          <Button
            type="button"
            onClick={() => {
              navigate(`${propertyPathPrefix}/${property.id}`, {
                state: { backTo: backToPath },
              })
            }}
          >
            {t('companyManagement.viewProperty')}
          </Button>
          {canDeleteProperty && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDeleteProperty(property.id)}
            >
              {t('companyManagement.deleteProperty')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
