import { useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '../components/ui/Textarea.tsx'
import {
  fetchCompanyDirectory,
  fetchCompanySnapshot,
  fetchVisits,
  createVisit,
  type CompanyDirectoryItem,
  type CompanySnapshot,
  type Visit,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './super-admin-visits-page.css'

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
  focusAreaIds: string[]
  scheduledFor: string
  notes?: string
}

export function SuperAdminVisitsPage() {
  const { t } = useTranslation()
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

  const visitSchema = useMemo(
    () =>
      z.object({
        companyId: z.string().uuid(t('console.uuid.error')),
        propertyId: z.string().uuid(t('console.uuid.error')),
        focusAreaIds: z.array(z.string().uuid()).min(1, t('superAdmin.visits.forms.focusAreasHelper')),
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
      focusAreaIds: [],
      scheduledFor: '',
      notes: '',
    },
    mode: 'onChange',
  })
const companyField = form.register('companyId')
const propertyField = form.register('propertyId')
const focusField = form.register('focusAreaIds')

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

  useEffect(() => {
    if (!session.isSuperAdmin) {
      setVisitState({
        status: 'error',
        visits: [],
        errorMessage: t('superAdmin.errors.unauthorized'),
      })
      return
    }
    refreshVisits()
  }, [session.isSuperAdmin, t])

  const openModal = async () => {
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
        focusAreaIds: [],
        scheduledFor: '',
        notes: '',
      })
    } catch {
      // ignore for now
    }
  }

  const closeModal = () => {
    setModalState((prev) => ({
      ...prev,
      open: false,
      selectedCompanyId: null,
      selectedSnapshot: null,
    }))
  }

  const handleCompanyChange = async (companyId: string) => {
    form.setValue('companyId', companyId, { shouldValidate: true })
    form.setValue('propertyId', '', { shouldValidate: true })
    form.setValue('focusAreaIds', [], { shouldValidate: true })
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
    await createVisit({
      companyId: values.companyId,
      propertyId: values.propertyId,
      focusAreaIds: values.focusAreaIds,
      scheduledFor: values.scheduledFor,
      notes: values.notes ?? '',
    })
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
        <div className="super-admin-table visits-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.visits.table.company')}</span>
            <span>{t('superAdmin.visits.table.property')}</span>
            <span>{t('superAdmin.visits.table.date')}</span>
            <span>{t('superAdmin.visits.table.focusAreas')}</span>
            <span>{t('superAdmin.visits.table.notes')}</span>
          </div>
          {visitState.visits.map((visit) => (
            <div key={visit.id} className="super-admin-table__row visits-table__row">
              <span>{visit.company.name}</span>
              <span>
                {visit.property.name} · {visit.property.city}, {visit.property.country}
              </span>
              <span>
                {new Date(visit.scheduledFor).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>
                {visit.focusAreas.length === 0
                  ? t('companyManagement.property.emptyFocusAreas')
                  : visit.focusAreas.map((area) => area.name).join(', ')}
              </span>
              <span>{visit.notes?.trim() ? visit.notes : '—'}</span>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalState.open}
        onClose={closeModal}
        title={t('superAdmin.visits.forms.title')}
        description={t('superAdmin.visits.forms.description')}
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
              {t('superAdmin.visits.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


