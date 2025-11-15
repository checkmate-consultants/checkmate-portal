import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Textarea } from '../components/ui/Textarea.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import {
  fetchPropertyDetails,
  createFocusArea,
  type PropertyDetailsResult,
} from '../data/companyManagement.ts'
import './property-details-page.css'

type LoadState = {
  status: 'loading' | 'ready' | 'error'
  data: PropertyDetailsResult | null
  errorMessage: string | null
}

type FocusAreaFormValues = {
  name: string
  description: string
}

export function PropertyDetailsPage() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reloadKey, setReloadKey] = useState(0)
  const [isFocusModalOpen, setFocusModalOpen] = useState(false)
  const [state, setState] = useState<LoadState>({
    status: 'loading',
    data: null,
    errorMessage: null,
  })

  const focusAreaSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('validation.nameLength')),
        description: z
          .string()
          .min(10, t('companyManagement.forms.focusArea.descriptionError')),
      }),
    [t],
  )

  const focusAreaForm = useForm<FocusAreaFormValues>({
    resolver: zodResolver(focusAreaSchema),
    defaultValues: { name: '', description: '' },
    mode: 'onChange',
  })

  const focusAreaMutation = useMutation({
    mutationFn: async (values: FocusAreaFormValues) => {
      if (!propertyId) throw new Error('Property not found')
      await createFocusArea({
        propertyId,
        name: values.name,
        description: values.description,
      })
    },
    onSuccess: () => {
      focusAreaForm.reset({ name: '', description: '' })
      setFocusModalOpen(false)
      setReloadKey((value) => value + 1)
    },
  })

  const handleFocusSubmit: SubmitHandler<FocusAreaFormValues> = (values) => {
    focusAreaMutation.mutate(values)
  }

  useEffect(() => {
    let cancelled = false
    const loadProperty = async () => {
      try {
        if (!propertyId) {
          throw new Error(t('companyManagement.property.notFound'))
        }
        const result = await fetchPropertyDetails(propertyId)
        if (!result) {
          throw new Error(t('companyManagement.property.notFound'))
        }
        if (!cancelled) {
          setState({ status: 'ready', data: result, errorMessage: null })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : t('companyManagement.property.loadError'),
          })
        }
      }
    }

    loadProperty()
    return () => {
      cancelled = true
    }
  }, [propertyId, t, reloadKey])

  if (state.status === 'loading') {
    return (
      <div className="property-details">
        <Card className="property-details__error">
          <p>{t('companyManagement.property.loading')}</p>
        </Card>
      </div>
    )
  }

  if (state.status === 'error' || !state.data) {
    return (
      <div className="property-details">
        <Card className="property-details__error">
          <p>{state.errorMessage ?? t('companyManagement.property.loadError')}</p>
          <Button type="button" onClick={() => navigate('/workspace/company')}>
            {t('companyManagement.backToList')}
          </Button>
        </Card>
      </div>
    )
  }

  const { property, company } = state.data
  const hasCoordinates =
    property.latitude !== null && property.longitude !== null

  return (
    <div className="property-details">
      <header className="property-details__hero">
        <div>
          <p className="property-details__eyebrow">
            {t('companyManagement.property.metaLabel')}
          </p>
          <h1>{property.name}</h1>
          <p className="property-details__location">
            {t('companyManagement.location', {
              city: property.city,
              country: property.country,
            })}
          </p>
          {hasCoordinates && (
            <button
              type="button"
              className="property-details__map-link"
              onClick={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
            >
              {t('companyManagement.viewMap')}
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/workspace/company')}
        >
          {t('companyManagement.backToList')}
        </Button>
      </header>

      <section className="property-details__section">
        <div className="property-details__section-head">
          <div>
            <p className="property-details__eyebrow">
              {t('companyManagement.entityLabel')}
            </p>
            <h2>{t('companyManagement.property.experiencesTitle')}</h2>
          </div>
          <Button type="button" onClick={() => setFocusModalOpen(true)}>
            {t('companyManagement.property.newFocusArea')}
          </Button>
        </div>

        {property.focusAreas.length === 0 ? (
          <Card className="property-details__card property-details__card--empty">
            <p>{t('companyManagement.property.emptyFocusAreas')}</p>
          </Card>
        ) : (
          <div className="property-details__grid">
            {property.focusAreas.map((area) => (
              <Card key={area.id} className="property-details__card">
                <div className="property-details__card-head">
                  <h3>{area.name}</h3>
                  <p>{area.description}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={isFocusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        title={t('companyManagement.forms.focusArea.title')}
        description={t('companyManagement.forms.focusArea.description')}
      >
        <form
          className="modal-form"
          onSubmit={focusAreaForm.handleSubmit(handleFocusSubmit)}
        >
          <FormField
            id="focus-name"
            label={t('companyManagement.forms.focusArea.fields.name')}
            error={focusAreaForm.formState.errors.name?.message}
          >
            <Input
              id="focus-name"
              {...focusAreaForm.register('name')}
              hasError={Boolean(focusAreaForm.formState.errors.name)}
            />
          </FormField>
          <FormField
            id="focus-description"
            label={t('companyManagement.forms.focusArea.fields.description')}
            error={focusAreaForm.formState.errors.description?.message}
          >
            <Textarea
              id="focus-description"
              {...focusAreaForm.register('description')}
              hasError={Boolean(focusAreaForm.formState.errors.description)}
            />
          </FormField>
          {focusAreaMutation.isError && (
            <p className="form-error">
              {focusAreaMutation.error instanceof Error
                ? focusAreaMutation.error.message
                : t('validation.generic')}
            </p>
          )}
          <div className="modal-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFocusModalOpen(false)}
            >
              {t('companyManagement.forms.focusArea.cancel')}
            </Button>
            <Button
              type="submit"
              loading={focusAreaMutation.isPending}
              disabled={!focusAreaForm.formState.isValid}
            >
              {t('companyManagement.forms.focusArea.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
