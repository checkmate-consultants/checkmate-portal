import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  assignVisitShopper,
  searchShoppers,
  fetchReportTemplateSections,
  type CompanyDirectoryItem,
  type CompanySnapshot,
  type Visit,
  type VisitStatus,
  type VisitReportFilter,
  updateVisitStatus,
  type Shopper,
  type ReportTemplateSection,
  type FocusAreaTemplateSectionIds,
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
import { EditVisitReportFormModal } from '../components/visit-report/EditVisitReportFormModal.tsx'
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

type VisitFormValues = {
  companyId: string
  propertyId: string
  shopperId?: string
  focusAreaIds: string[]
  /** Template section IDs per focus area id */
  focusAreaTemplateSectionIds?: FocusAreaTemplateSectionIds
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const filterStatus = searchParams.get('status') ?? ''
  const filterReport = searchParams.get('filter') ?? ''
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
  const [templateSections, setTemplateSections] = useState<ReportTemplateSection[]>([])
  const [assignShopperVisit, setAssignShopperVisit] = useState<Visit | null>(null)
  const [assignShopperQuery, setAssignShopperQuery] = useState('')
  const [assignShopperResults, setAssignShopperResults] = useState<Shopper[]>([])
  const [assignShopperSelected, setAssignShopperSelected] = useState<Shopper | null>(null)
  const [assignShopperSearching, setAssignShopperSearching] = useState(false)
  const [assignShopperSaving, setAssignShopperSaving] = useState(false)
  const [editReportFormVisit, setEditReportFormVisit] = useState<Visit | null>(null)
  const [scheduleStep, setScheduleStep] = useState<0 | 1 | 2>(0)
  const [expandedFocusAreas, setExpandedFocusAreas] = useState<Set<string>>(new Set())

  const visitSchema = useMemo(
    () =>
      z.object({
        companyId: z.string().min(1, t('validation.required')),
        propertyId: z.string().min(1, t('validation.required')),
        shopperId: z.string().optional(),
        focusAreaIds: z
          .array(z.string())
          .min(1, t('superAdmin.visits.forms.focusAreasHelper')),
        focusAreaTemplateSectionIds: z.record(z.string(), z.array(z.string())).default({}),
        scheduledFor: z.string().min(1, t('validation.required')),
        notes: z.string().optional(),
      }),
    [t],
  )

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema) as Resolver<VisitFormValues>,
    defaultValues: {
      companyId: '',
      propertyId: '',
      shopperId: '',
      focusAreaIds: [],
      focusAreaTemplateSectionIds: {} as FocusAreaTemplateSectionIds,
      scheduledFor: '',
      notes: '',
    },
    mode: 'onChange',
  })
  const companyField = form.register('companyId')
  const propertyField = form.register('propertyId')
  const shopperField = form.register('shopperId')

  const visitFilterValues = useMemo(
    () => ({ status: filterStatus, filter: filterReport }),
    [filterStatus, filterReport],
  )

  const handleVisitFilterChange = (values: Record<string, unknown>) => {
    const v = values as { status?: string; filter?: string }
    const params: Record<string, string> = {}
    if (v.status) params.status = v.status
    if (v.filter) params.filter = v.filter
    setSearchParams(params, { replace: true })
  }

  const getVisitsFilters = useMemo(() => {
    const status =
      filterStatus && [
        'scheduled',
        'under_review',
        'report_submitted',
        'feedback_requested',
        'done',
      ].includes(filterStatus)
        ? (filterStatus as VisitStatus)
        : undefined
    const reportFilter =
      filterReport &&
      ['submittedLast28', 'reviewedLast28', 'submittedToClientLast28'].includes(
        filterReport,
      )
        ? (filterReport as VisitReportFilter)
        : undefined
    return { status, reportFilter }
  }, [filterStatus, filterReport])

  const refreshVisits = async () => {
    try {
      const visits = await fetchVisits(getVisitsFilters)
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
  }, [session.isSuperAdmin, session.isAccountManager, t, getVisitsFilters])

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

  useEffect(() => {
    if (!assignShopperVisit || assignShopperQuery.trim().length < 2) {
      setAssignShopperResults([])
      return
    }
    setAssignShopperSearching(true)
    const handle = setTimeout(async () => {
      try {
        const results = await searchShoppers(assignShopperQuery.trim(), 20, { status: 'confirmed' })
        setAssignShopperResults(results)
      } catch {
        setAssignShopperResults([])
      } finally {
        setAssignShopperSearching(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [assignShopperVisit, assignShopperQuery])

  const openModal = async () => {
    try {
      const [companies, sections] = await Promise.all([
        fetchCompanyDirectory(),
        fetchReportTemplateSections(),
      ])
      setTemplateSections(sections)
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
        focusAreaTemplateSectionIds: {},
        scheduledFor: '',
        notes: '',
      })
      setShopperQuery('')
      setShopperResults([])
      setSelectedShopper(null)
      setScheduleStep(0)
      setExpandedFocusAreas(new Set())
    } catch {
      // ignore for now
    }
  }

  const openAssignShopperModal = (visit: Visit) => {
    setAssignShopperVisit(visit)
    setAssignShopperQuery('')
    setAssignShopperResults([])
    setAssignShopperSelected(
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
  }

  const closeAssignShopperModal = () => {
    setAssignShopperVisit(null)
    setAssignShopperQuery('')
    setAssignShopperResults([])
    setAssignShopperSelected(null)
  }

  const closeModal = () => {
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
    form.setValue('focusAreaTemplateSectionIds', {}, { shouldValidate: true })
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
    const sectionIds = values.focusAreaTemplateSectionIds ?? {}
    await createVisit({
      companyId: values.companyId,
      propertyId: values.propertyId,
      shopperId: values.shopperId?.trim() || undefined,
      focusAreaIds: values.focusAreaIds,
      focusAreaTemplateSectionIds: sectionIds,
      scheduledFor: values.scheduledFor,
      notes: values.notes ?? '',
    })
    closeModal()
    refreshVisits()
  }

  const handleAssignShopperSubmit = async () => {
    if (!assignShopperVisit) return
    const shopperId = assignShopperSelected?.id ?? null
    setAssignShopperSaving(true)
    try {
      await assignVisitShopper(assignShopperVisit.id, shopperId)
      closeAssignShopperModal()
      refreshVisits()
    } finally {
      setAssignShopperSaving(false)
    }
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
  const focusAreaTemplateSectionIds = form.watch('focusAreaTemplateSectionIds') ?? {}

  const canGoStep2 =
    Boolean(form.watch('companyId')) && Boolean(form.watch('propertyId'))
  const step2Valid =
    focusAreaSelection.length >= 1 &&
    focusAreaSelection.every(
      (faId) => (focusAreaTemplateSectionIds[faId]?.length ?? 0) >= 1,
    )
  const toggleFocusAreaExpanded = (focusAreaId: string) => {
    setExpandedFocusAreas((prev) => {
      const next = new Set(prev)
      if (next.has(focusAreaId)) next.delete(focusAreaId)
      else next.add(focusAreaId)
      return next
    })
  }
  const setFocusAreaSelected = (focusAreaId: string, selected: boolean) => {
    if (selected) {
      setExpandedFocusAreas((prev) => new Set(prev).add(focusAreaId))
      form.setValue(
        'focusAreaIds',
        [...focusAreaSelection.filter((id) => id !== focusAreaId), focusAreaId].sort(),
        { shouldValidate: true },
      )
      const prev = form.getValues('focusAreaTemplateSectionIds') ?? {}
      form.setValue('focusAreaTemplateSectionIds', {
        ...prev,
        [focusAreaId]: prev[focusAreaId] ?? [],
      })
    } else {
      setExpandedFocusAreas((prev) => {
        const next = new Set(prev)
        next.delete(focusAreaId)
        return next
      })
      form.setValue(
        'focusAreaIds',
        focusAreaSelection.filter((id) => id !== focusAreaId),
        { shouldValidate: true },
      )
      const prev = { ...(form.getValues('focusAreaTemplateSectionIds') ?? {}) }
      delete prev[focusAreaId]
      form.setValue('focusAreaTemplateSectionIds', prev)
    }
  }
  const setSectionIdsForFocusArea = (focusAreaId: string, sectionIds: string[]) => {
    form.setValue(
      'focusAreaTemplateSectionIds',
      { ...(form.getValues('focusAreaTemplateSectionIds') ?? {}), [focusAreaId]: sectionIds },
      { shouldValidate: true },
    )
  }

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

      {visitState.visits.length === 0 && !filterStatus && !filterReport ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.visits.empty')}</p>
        </Card>
      ) : (
        <Table<Visit>
          filterMode="server"
          filterValues={visitFilterValues}
          onFilterChange={handleVisitFilterChange}
          filters={[
            {
              key: 'status',
              label: t('superAdmin.visits.filters.status'),
              type: 'select',
              options: [
                { value: '', label: t('superAdmin.visits.filters.allStatuses') },
                ...(['scheduled', 'under_review', 'report_submitted', 'feedback_requested', 'done'] as VisitStatus[]).map(
                  (s) => ({ value: s, label: t(`superAdmin.visits.status.${s}`) }),
                ),
              ],
            },
            {
              key: 'filter',
              label: t('superAdmin.visits.filters.reportPeriod'),
              type: 'select',
              options: [
                { value: '', label: t('superAdmin.visits.filters.allPeriods') },
                { value: 'submittedLast28', label: t('superAdmin.visits.filters.submittedLast28') },
                { value: 'reviewedLast28', label: t('superAdmin.visits.filters.reviewedLast28') },
                { value: 'submittedToClientLast28', label: t('superAdmin.visits.filters.submittedToClientLast28') },
              ],
            },
          ]}
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
                    onClick={() => openAssignShopperModal(visit)}
                  >
                    {visit.shopper
                      ? t('superAdmin.visits.changeShopper')
                      : t('superAdmin.visits.assignShopper')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditReportFormVisit(visit)}
                  >
                    {t('superAdmin.visits.editReportForm')}
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
        title={t('superAdmin.visits.forms.title')}
        description={t('superAdmin.visits.forms.description')}
      >
        <div className="schedule-visit-modal">
        <form
          className="schedule-visit-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <nav className="schedule-visit-stepper" aria-label={t('superAdmin.visits.forms.stepper.location')}>
            <ol className="schedule-visit-stepper__list">
              <li className={`schedule-visit-stepper__step ${scheduleStep >= 0 ? 'schedule-visit-stepper__step--active' : ''} ${scheduleStep > 0 ? 'schedule-visit-stepper__step--done' : ''}`}>
                <span className="schedule-visit-stepper__number">1</span>
                <span className="schedule-visit-stepper__label">{t('superAdmin.visits.forms.stepper.location')}</span>
              </li>
              <li className={`schedule-visit-stepper__step ${scheduleStep >= 1 ? 'schedule-visit-stepper__step--active' : ''} ${scheduleStep > 1 ? 'schedule-visit-stepper__step--done' : ''}`}>
                <span className="schedule-visit-stepper__number">2</span>
                <span className="schedule-visit-stepper__label">{t('superAdmin.visits.forms.stepper.focusAreasAndTemplates')}</span>
              </li>
              <li className={`schedule-visit-stepper__step ${scheduleStep >= 2 ? 'schedule-visit-stepper__step--active' : ''}`}>
                <span className="schedule-visit-stepper__number">3</span>
                <span className="schedule-visit-stepper__label">{t('superAdmin.visits.forms.stepper.schedule')}</span>
              </li>
            </ol>
          </nav>

          {scheduleStep === 0 && (
            <div className="schedule-visit-step" role="tabpanel">
              <h3 className="schedule-visit-step__title">{t('superAdmin.visits.forms.stepLocationTitle')}</h3>
              <p className="schedule-visit-step__description">{t('superAdmin.visits.forms.stepLocationDescription')}</p>
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
                >
                  <option value="">{t('superAdmin.selectCompany')}</option>
                  {modalState.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </FormField>
              {modalState.loadingSnapshot && <p>{t('companyManagement.loading')}</p>}
              {selectedSnapshot && (
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
                      form.setValue('propertyId', event.target.value, { shouldValidate: true })
                      form.setValue('focusAreaIds', [], { shouldValidate: true })
                      form.setValue('focusAreaTemplateSectionIds', {})
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
              )}
            </div>
          )}

          {scheduleStep === 1 && selectedSnapshot && selectedProperty && (
            <div className="schedule-visit-step" role="tabpanel">
              <h3 className="schedule-visit-step__title">{t('superAdmin.visits.forms.stepFocusAreasTitle')}</h3>
              <p className="schedule-visit-step__description">{t('superAdmin.visits.forms.stepFocusAreasDescription')}</p>
              {selectedProperty.focusAreas.length === 0 ? (
                <p>{t('companyManagement.property.emptyFocusAreas')}</p>
              ) : (
                <div className="schedule-visit-focus-tree">
                  {selectedProperty.focusAreas.map((focusArea) => {
                    const isSelected = focusAreaSelection.includes(focusArea.id)
                    const isExpanded = expandedFocusAreas.has(focusArea.id)
                    const sectionIds = focusAreaTemplateSectionIds[focusArea.id] ?? []
                    return (
                      <div key={focusArea.id} className="schedule-visit-focus-node">
                        <div className="schedule-visit-focus-node__row">
                          {isSelected && templateSections.length > 0 ? (
                            <button
                              type="button"
                              className="schedule-visit-focus-node__expand"
                              onClick={() => toggleFocusAreaExpanded(focusArea.id)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                          ) : (
                            <span className="schedule-visit-focus-node__expand schedule-visit-focus-node__expand--placeholder" aria-hidden> </span>
                          )}
                          <label className="schedule-visit-focus-node__label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => setFocusAreaSelected(focusArea.id, e.target.checked)}
                            />
                            <span>{focusArea.name}</span>
                          </label>
                        </div>
                        {isSelected && isExpanded && templateSections.length > 0 && (
                          <div className="schedule-visit-focus-node__children">
                            <p className="schedule-visit-focus-node__children-label">
                              {t('superAdmin.visits.forms.templatesForFocusArea', { name: focusArea.name })}
                            </p>
                            <ul className="schedule-visit-template-list">
                              {templateSections.map((sec) => {
                                const checked = sectionIds.includes(sec.id)
                                return (
                                  <li key={sec.id} className="schedule-visit-template-list__item">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = e.target.checked
                                            ? [...sectionIds, sec.id]
                                            : sectionIds.filter((id) => id !== sec.id)
                                          setSectionIdsForFocusArea(focusArea.id, next)
                                        }}
                                      />
                                      <span>{sec.name}</span>
                                    </label>
                                  </li>
                                )
                              })}
                            </ul>
                            {sectionIds.length === 0 && (
                              <p className="schedule-visit-step__hint schedule-visit-step__hint--error">
                                {t('superAdmin.visits.forms.selectAtLeastOneSection')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {form.formState.errors.focusAreaIds?.message && (
                <p className="schedule-visit-step__hint schedule-visit-step__hint--error">
                  {form.formState.errors.focusAreaIds.message}
                </p>
              )}
            </div>
          )}

          {scheduleStep === 2 && (
            <div className="schedule-visit-step" role="tabpanel">
              <h3 className="schedule-visit-step__title">{t('superAdmin.visits.forms.stepScheduleTitle')}</h3>
              <p className="schedule-visit-step__description">{t('superAdmin.visits.forms.stepScheduleDescription')}</p>
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
              <FormField
                id="visit-shopper"
                label={t('superAdmin.visits.forms.shopper')}
                helperText={t('superAdmin.visits.forms.shopperOptional')}
                error={form.formState.errors.shopperId?.message}
              >
                <input type="hidden" {...shopperField} />
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
                {!isSearchingShoppers && shopperQuery && !selectedShopper && (
                  <ul className="shopper-results">
                    {shopperResults.map((shopper) => (
                      <li key={shopper.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShopper(shopper)
                            setShopperQuery('')
                            form.setValue('shopperId', shopper.id, { shouldValidate: true })
                          }}
                        >
                          <strong>{shopper.fullName}</strong>
                          <span>{shopper.email}</span>
                        </button>
                      </li>
                    ))}
                    {shopperResults.length === 0 && (
                      <li className="shopper-results__empty">{t('superAdmin.shoppers.empty')}</li>
                    )}
                  </ul>
                )}
              </FormField>
              <FormField id="visit-notes" label={t('superAdmin.visits.forms.notes')}>
                <Textarea id="visit-notes" {...form.register('notes')} />
              </FormField>
            </div>
          )}

          <div className="schedule-visit-form__actions modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('superAdmin.visits.forms.cancel')}
            </Button>
            <div className="schedule-visit-form__nav">
              {scheduleStep > 0 && (
                <Button type="button" variant="ghost" onClick={() => setScheduleStep((s) => (s - 1) as 0 | 1 | 2)}>
                  {t('superAdmin.visits.forms.back')}
                </Button>
              )}
              {scheduleStep < 2 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (scheduleStep === 0 && canGoStep2) setScheduleStep(1)
                    else if (scheduleStep === 1 && step2Valid) setScheduleStep(2)
                  }}
                  disabled={
                    (scheduleStep === 0 && !canGoStep2) || (scheduleStep === 1 && !step2Valid)
                  }
                >
                  {t('superAdmin.visits.forms.next')}
                </Button>
              ) : (
                <Button type="submit" disabled={!form.formState.isValid}>
                  {t('superAdmin.visits.forms.submit')}
                </Button>
              )}
            </div>
          </div>
        </form>
        </div>
      </Modal>

      <Modal
        open={Boolean(assignShopperVisit)}
        onClose={closeAssignShopperModal}
        title={
          assignShopperVisit?.shopper
            ? t('superAdmin.visits.assignShopperModal.changeTitle')
            : t('superAdmin.visits.assignShopperModal.assignTitle')
        }
        description={t('superAdmin.visits.assignShopperModal.description')}
      >
        {assignShopperVisit && (
          <div className="modal-form">
            <p className="visits-assign-shopper-context">
              {assignShopperVisit.property.name} · {assignShopperVisit.scheduledFor}
            </p>
            <FormField
              id="assign-shopper-search"
              label={t('superAdmin.visits.forms.shopper')}
              helperText={t('superAdmin.visits.assignShopperModal.helper')}
            >
              <Input
                id="assign-shopper-search"
                placeholder={t('superAdmin.visits.forms.shopper')}
                value={assignShopperSelected ? assignShopperSelected.fullName : assignShopperQuery}
                onChange={(e) => {
                  setAssignShopperSelected(null)
                  setAssignShopperQuery(e.target.value)
                }}
                hasError={false}
              />
              {assignShopperSelected && (
                <p className="shopper-selected">
                  {assignShopperSelected.fullName} ({assignShopperSelected.email})
                  <Button
                    type="button"
                    variant="ghost"
                    className="visits-assign-clear"
                    onClick={() => setAssignShopperSelected(null)}
                  >
                    {t('superAdmin.visits.assignShopperModal.clear')}
                  </Button>
                </p>
              )}
              {assignShopperSearching && <p>{t('superAdmin.loading')}</p>}
              {!assignShopperSearching && assignShopperQuery && !assignShopperSelected && (
                <ul className="shopper-results">
                  {assignShopperResults.map((shopper) => (
                    <li key={shopper.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignShopperSelected(shopper)
                          setAssignShopperQuery('')
                        }}
                      >
                        <strong>{shopper.fullName}</strong>
                        <span>{shopper.email}</span>
                      </button>
                    </li>
                  ))}
                  {assignShopperResults.length === 0 && (
                    <li className="shopper-results__empty">
                      {t('superAdmin.shoppers.empty')}
                    </li>
                  )}
                </ul>
              )}
            </FormField>
            <div className="modal-form__actions">
              <Button type="button" variant="ghost" onClick={closeAssignShopperModal}>
                {t('superAdmin.visits.forms.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleAssignShopperSubmit}
                loading={assignShopperSaving}
              >
                {assignShopperVisit.shopper
                  ? t('superAdmin.visits.changeShopper')
                  : t('superAdmin.visits.assignShopper')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {editReportFormVisit && (
        <EditVisitReportFormModal
          visitId={editReportFormVisit.id}
          open={Boolean(editReportFormVisit)}
          onClose={() => setEditReportFormVisit(null)}
          onSaved={() => setEditReportFormVisit(null)}
        />
      )}
    </div>
  )
}


