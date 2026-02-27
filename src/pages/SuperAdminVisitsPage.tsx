import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Table } from '../components/ui/Table.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Textarea } from '../components/ui/Textarea.tsx'
import {
  fetchCompanyDirectory,
  fetchCompanySnapshot,
  fetchVisits,
  createVisit,
  updateVisit,
  searchShoppers,
  type CompanyDirectoryItem,
  type CompanySnapshot,
  type Visit,
  type VisitStatus,
  updateVisitStatus,
  type Shopper,
} from '../data/companyManagement.ts'
// Lightweight styled select just for status in this page
type StatusSelectProps = {
  value: string
  disabled?: boolean
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
}

function StatusSelect({
  value,
  disabled,
  onChange,
  children,
}: StatusSelectProps) {
  return (
    <span className="ui-select ui-select--sm visits-status-select">
      <select
        className="ui-select__field"
        value={value}
        disabled={disabled}
        onChange={onChange}
      >
        {children}
      </select>
    </span>
  )
}
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-visits-page.css'
import '../components/ui/select.css'

type VisitState = {
  status: 'loading' | 'ready' | 'error'
  visits: Visit[]
  errorMessage: string | null
}

type ModalState = {
  open: boolean
  companies: CompanyDirectoryItem[]
  selectedCompanyId: string | null
  selectedSnapshot: CompanySnapshot | null
  loadingSnapshot: boolean
}

type EditingVisit = Visit | null

type VisitFormValues = {
  companyId: string
  propertyId: string
  shopperId: string
  focusAreaIds: string[]
  scheduledFor: string
  notes?: string
}

export function SuperAdminVisitsPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminVisits.title')} | ${t('brand.name')}`,
    t('meta.superAdminVisits.description'),
  )
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [visitState, setVisitState] = useState<VisitState>({
    status: 'loading',
    visits: [],
    errorMessage: null,
  })
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    companies: [],
    selectedCompanyId: null,
    selectedSnapshot: null,
    loadingSnapshot: false,
  })
  const [shopperQuery, setShopperQuery] = useState('')
  const [shopperResults, setShopperResults] = useState<Shopper[]>([])
  const [selectedShopper, setSelectedShopper] = useState<Shopper | null>(null)
  const [isSearchingShoppers, setIsSearchingShoppers] = useState(false)
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null)
  const [editingVisit, setEditingVisit] = useState<EditingVisit>(null)

  const visitSchema = useMemo(
    () =>
      z.object({
        companyId: z.string().min(1, t('validation.required')),
        propertyId: z.string().min(1, t('validation.required')),
        shopperId: z.string().min(1, t('validation.required')),
        focusAreaIds: z
          .array(z.string())
          .min(1, t('superAdmin.visits.forms.focusAreasHelper')),
        scheduledFor: z.string().min(1, t('validation.required')),
        notes: z.string().optional(),
      }),
    [t],
  )

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      companyId: '',
      propertyId: '',
      shopperId: '',
      focusAreaIds: [],
      scheduledFor: '',
      notes: '',
    },
    mode: 'onChange',
  })
  const companyField = form.register('companyId')
  const propertyField = form.register('propertyId')
  const focusField = form.register('focusAreaIds')
  const shopperField = form.register('shopperId')

  const refreshVisits = async () => {
    try {
      const visits = await fetchVisits()
      setVisitState({ status: 'ready', visits, errorMessage: null })
    } catch (error) {
      setVisitState({
        status: 'error',
        visits: [],
        errorMessage:
          error instanceof Error
            ? error.message
            : t('superAdmin.errors.generic'),
      })
    }
  }

  const handleStatusChange = async (visitId: string, status: VisitStatus) => {
    try {
      setUpdatingVisitId(visitId)
      await updateVisitStatus(visitId, status)
      await refreshVisits()
    } finally {
      setUpdatingVisitId(null)
    }
  }

  useEffect(() => {
    if (!session.isSuperAdmin && !session.isAccountManager) {
      setVisitState({
        status: 'error',
        visits: [],
        errorMessage: t('superAdmin.errors.unauthorized'),
      })
      return
    }
    refreshVisits()
  }, [session.isSuperAdmin, session.isAccountManager, t])

  useEffect(() => {
    if (shopperQuery.trim().length < 2) {
      setShopperResults([])
      return
    }
    setIsSearchingShoppers(true)
    const handle = setTimeout(async () => {
      try {
        const results = await searchShoppers(shopperQuery.trim(), 20, { status: 'confirmed' })
        setShopperResults(results)
      } catch {
        setShopperResults([])
      } finally {
        setIsSearchingShoppers(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [shopperQuery])

  const openModal = async () => {
    setEditingVisit(null)
    try {
      const companies = await fetchCompanyDirectory()
      setModalState((prev) => ({
        ...prev,
        open: true,
        companies,
      }))
      form.reset({
        companyId: '',
        propertyId: '',
        shopperId: '',
        focusAreaIds: [],
        scheduledFor: '',
        notes: '',
      })
      setShopperQuery('')
      setShopperResults([])
      setSelectedShopper(null)
    } catch {
      // ignore for now
    }
  }

  const openEditModal = async (visit: Visit) => {
    setEditingVisit(visit)
    try {
      const companies = await fetchCompanyDirectory()
      const snapshot = await fetchCompanySnapshot(visit.company.id)
      setModalState((prev) => ({
        ...prev,
        open: true,
        companies,
        selectedCompanyId: visit.company.id,
        selectedSnapshot: snapshot ?? null,
        loadingSnapshot: false,
      }))
      const scheduledFor = visit.scheduledFor.slice(0, 10)
      form.reset({
        companyId: visit.company.id,
        propertyId: visit.property.id,
        shopperId: visit.shopper?.id ?? '',
        focusAreaIds: visit.focusAreas.map((a) => a.id),
        scheduledFor,
        notes: visit.notes ?? '',
      })
      setShopperQuery('')
      setShopperResults([])
      setSelectedShopper(
        visit.shopper
          ? {
              id: visit.shopper.id,
              fullName: visit.shopper.fullName,
              email: visit.shopper.email,
              createdAt: '',
              status: 'confirmed' as const,
            }
          : null,
      )
    } catch {
      setEditingVisit(null)
    }
  }

  const closeModal = () => {
    setEditingVisit(null)
    setModalState((prev) => ({
      ...prev,
      open: false,
      selectedCompanyId: null,
      selectedSnapshot: null,
    }))
    setShopperQuery('')
    setShopperResults([])
    setSelectedShopper(null)
  }

  const handleCompanyChange = async (companyId: string) => {
    form.setValue('companyId', companyId, { shouldValidate: true })
    form.setValue('propertyId', '', { shouldValidate: true })
    form.setValue('focusAreaIds', [], { shouldValidate: true })
    form.setValue('shopperId', '', { shouldValidate: true })
    setShopperQuery('')
    setShopperResults([])
    setSelectedShopper(null)
    setModalState((prev) => ({
      ...prev,
      selectedCompanyId: companyId,
      loadingSnapshot: true,
    }))
    const snapshot = await fetchCompanySnapshot(companyId)
    setModalState((prev) => ({
      ...prev,
      selectedSnapshot: snapshot,
      loadingSnapshot: false,
    }))
  }

  const onSubmit: SubmitHandler<VisitFormValues> = async (values) => {
    if (editingVisit) {
      await updateVisit(editingVisit.id, {
        propertyId: values.propertyId,
        shopperId: values.shopperId,
        focusAreaIds: values.focusAreaIds,
        scheduledFor: values.scheduledFor,
        notes: values.notes ?? '',
      })
    } else {
      await createVisit({
        companyId: values.companyId,
        propertyId: values.propertyId,
        shopperId: values.shopperId,
        focusAreaIds: values.focusAreaIds,
        scheduledFor: values.scheduledFor,
        notes: values.notes ?? '',
      })
    }
    closeModal()
    refreshVisits()
  }

  if (visitState.status === 'loading') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (visitState.status === 'error') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{visitState.errorMessage}</p>
        </Card>
      </div>
    )
  }

  const { selectedSnapshot } = modalState
  const properties = selectedSnapshot?.properties ?? []
  const selectedProperty = properties.find(
    (property) => property.id === form.watch('propertyId'),
  )
  const focusAreaSelection = form.watch('focusAreaIds')

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.visits.title')}</h1>
          <p>{t('superAdmin.visits.subtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={openModal}>
          {t('superAdmin.visits.newVisit')}
        </Button>
      </header>

      {visitState.visits.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.visits.empty')}</p>
        </Card>
      ) : (
        <Table<Visit>
          columns={[
            {
              key: 'company',
              header: t('superAdmin.visits.table.company'),
              render: (visit) => visit.company.name,
            },
            {
              key: 'property',
              header: t('superAdmin.visits.table.property'),
              render: (visit) =>
                `${visit.property.name} · ${visit.property.city}, ${visit.property.country}`,
            },
            {
              key: 'date',
              header: t('superAdmin.visits.table.date'),
              render: (visit) =>
                new Date(visit.scheduledFor).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
            },
            {
              key: 'status',
              header: t('superAdmin.visits.table.status'),
              render: (visit) => (
                <StatusSelect
                  value={visit.status}
                  disabled={updatingVisitId === visit.id}
                  onChange={(event) =>
                    handleStatusChange(
                      visit.id,
                      event.target.value as VisitStatus,
                    )
                  }
                >
                  {(['scheduled',
                    'under_review',
                    'report_submitted',
                    'feedback_requested',
                    'done'] as VisitStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {t(`superAdmin.visits.status.${status}`)}
                    </option>
                  ))}
                </StatusSelect>
              ),
            },
            {
              key: 'shopper',
              header: t('superAdmin.visits.table.shopper'),
              render: (visit) =>
                visit.shopper
                  ? visit.shopper.fullName || visit.shopper.email || '—'
                  : '—',
            },
            {
              key: 'focusAreas',
              header: t('superAdmin.visits.table.focusAreas'),
              render: (visit) =>
                visit.focusAreas.length === 0
                  ? t('companyManagement.property.emptyFocusAreas')
                  : visit.focusAreas.map((area) => area.name).join(', '),
            },
            {
              key: 'notes',
              header: t('superAdmin.visits.table.notes'),
              render: (visit) => (visit.notes?.trim() ? visit.notes : '—'),
            },
            {
              key: 'actions',
              header: t('superAdmin.visits.table.actions'),
              className: 'visits-table__actions',
              render: (visit) => (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => openEditModal(visit)}
                  >
                    {t('superAdmin.visits.editVisit')}
                  </Button>
                  {visit.status !== 'done' && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        navigate(`/workspace/admin/visits/${visit.id}/report`)
                      }
                    >
                      {t('superAdmin.visitReport.open')}
                    </Button>
                  )}
                </>
              ),
            },
          ]}
          data={visitState.visits}
          getRowKey={(visit) => visit.id}
        />
      )}

      <Modal
        open={modalState.open}
        onClose={closeModal}
        title={
          editingVisit
            ? t('superAdmin.visits.forms.editTitle')
            : t('superAdmin.visits.forms.title')
        }
        description={
          editingVisit
            ? t('superAdmin.visits.forms.editDescription')
            : t('superAdmin.visits.forms.description')
        }
      >
        <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            id="visit-company"
            label={t('superAdmin.visits.forms.company')}
            error={form.formState.errors.companyId?.message}
          >
            <select
              id="visit-company"
              className="modal-select"
              name={companyField.name}
              ref={companyField.ref}
              value={form.watch('companyId')}
              onBlur={companyField.onBlur}
              onChange={(event) => {
                companyField.onChange(event)
                handleCompanyChange(event.target.value)
              }}
              disabled={Boolean(editingVisit)}
            >
              <option value="">{t('superAdmin.selectCompany')}</option>
              {modalState.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </FormField>

          {modalState.loadingSnapshot && (
            <p>{t('companyManagement.loading')}</p>
          )}

          {selectedSnapshot && (
            <>
              <FormField
                id="visit-property"
                label={t('superAdmin.visits.forms.property')}
                error={form.formState.errors.propertyId?.message}
              >
                <select
                  id="visit-property"
                  className="modal-select"
                  name={propertyField.name}
                  ref={propertyField.ref}
                  value={form.watch('propertyId')}
                  onBlur={propertyField.onBlur}
                  onChange={(event) => {
                    propertyField.onChange(event)
                    form.setValue('propertyId', event.target.value, {
                      shouldValidate: true,
                    })
                    form.setValue('focusAreaIds', [], { shouldValidate: true })
                  }}
                >
                  <option value="">{t('companyManagement.empty')}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} ({property.city})
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedProperty && (
                <FormField
                  id="visit-focus-areas"
                  label={t('superAdmin.visits.forms.focusAreas')}
                  error={form.formState.errors.focusAreaIds?.message}
                  helperText={t('superAdmin.visits.forms.focusAreasHelper')}
                >
                  <select
                    id="visit-focus-areas"
                    className="modal-select"
                    multiple
                    name={focusField.name}
                    ref={focusField.ref}
                    value={focusAreaSelection}
                    onBlur={focusField.onBlur}
                    onChange={(event) => {
                      const selected = Array.from(event.target.selectedOptions).map(
                        (option) => option.value,
                      )
                      form.setValue('focusAreaIds', selected, {
                        shouldValidate: true,
                      })
                    }}
                  >
                    {selectedProperty.focusAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </>
          )}

          <FormField
            id="visit-shopper"
            label={t('superAdmin.visits.forms.shopper')}
            error={form.formState.errors.shopperId?.message}
          >
            <input type="hidden" {...shopperField} />
            {!selectedSnapshot ? (
              <p>{t('superAdmin.selectCompany')}</p>
            ) : (
              <>
                <Input
                  id="visit-shopper"
                  placeholder={t('superAdmin.visits.forms.shopper')}
                  value={selectedShopper?.fullName ?? shopperQuery}
                  onChange={(event) => {
                    setSelectedShopper(null)
                    setShopperQuery(event.target.value)
                    form.setValue('shopperId', '', { shouldValidate: true })
                  }}
                />
                {selectedShopper && (
                  <p className="shopper-selected">
                    {selectedShopper.fullName} ({selectedShopper.email})
                  </p>
                )}
                {isSearchingShoppers && <p>{t('superAdmin.loading')}</p>}
                {!isSearchingShoppers && shopperQuery && (
                  <ul className="shopper-results">
                    {shopperResults.map((shopper) => (
                      <li key={shopper.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShopper(shopper)
                            setShopperQuery('')
                            form.setValue('shopperId', shopper.id, {
                              shouldValidate: true,
                            })
                          }}
                        >
                          <strong>{shopper.fullName}</strong>
                          <span>{shopper.email}</span>
                        </button>
                      </li>
                    ))}
                    {shopperResults.length === 0 && (
                      <li className="shopper-results__empty">
                        {t('superAdmin.shoppers.empty')}
                      </li>
                    )}
                  </ul>
                )}
              </>
            )}
          </FormField>

          <FormField
            id="visit-date"
            label={t('superAdmin.visits.forms.scheduledFor')}
            error={form.formState.errors.scheduledFor?.message}
          >
            <Input
              id="visit-date"
              type="date"
              {...form.register('scheduledFor')}
              hasError={Boolean(form.formState.errors.scheduledFor)}
            />
          </FormField>

          <FormField id="visit-notes" label={t('superAdmin.visits.forms.notes')}>
            <Textarea id="visit-notes" {...form.register('notes')} />
          </FormField>

          <div className="modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('superAdmin.visits.forms.cancel')}
            </Button>
            <Button type="submit" disabled={!form.formState.isValid}>
              {editingVisit
                ? t('superAdmin.visits.forms.submitEdit')
                : t('superAdmin.visits.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


