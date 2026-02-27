import { useEffect, useMemo, type ChangeEvent } from 'react'
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate } from 'react-router-dom'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { Card } from '../components/ui/Card.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Select } from '../components/ui/Select.tsx'
import { Textarea } from '../components/ui/Textarea.tsx'
import { EmailInput } from '../components/ui/EmailInput.tsx'
import { PhoneInput } from '../components/ui/PhoneInput.tsx'
import { MultiSelect } from '../components/ui/MultiSelect.tsx'
import { LocationPicker, type LocationValue } from '../components/ui/LocationPicker.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import { COUNTRIES } from '../data/countries.ts'
import { LANGUAGES, FLUENCY_LEVELS } from '../data/languages.ts'
import './shopper-info-page.css'

type LanguageSpoken = { language: string; fluency: string }
type ChildEntry = { dateOfBirth: string }

const languageOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name }))
const fluencyOptions = FLUENCY_LEVELS.map((f) => ({ value: f.code, label: f.name }))

type ShopperInfoFormValues = {
  fullName: string
  dateOfBirth: string
  gender: string
  nationalities: string[]
  location: LocationValue
  residentVisa: string
  email: string
  phone: string
  nativeLanguage: string
  languagesSpoken: LanguageSpoken[]
  maritalStatus: string
  children: ChildEntry[]
  accessibilityNeeds: boolean
  accessibilityNotes: string
}

const shopperInfoSchema = (t: (key: string) => string) =>
  z.object({
    fullName: z.string().min(2, t('validation.nameLength')),
    dateOfBirth: z.string().min(1, t('validation.required')),
    gender: z.string(),
    nationalities: z.array(z.string()),
    location: z.object({
      country: z.string(),
      city: z.string(),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
    }),
    residentVisa: z.string(),
    email: z.string().email(t('validation.email')),
    phone: z.string(),
    nativeLanguage: z.string(),
    languagesSpoken: z.array(z.object({ language: z.string(), fluency: z.string() })),
    maritalStatus: z.string(),
    children: z.array(z.object({ dateOfBirth: z.string() })),
    accessibilityNeeds: z.boolean(),
    accessibilityNotes: z.string(),
  })

export function ShopperInfoPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  usePageMetadata(
    `${t('shopperInfo.title')} | ${t('brand.name')}`,
    t('shopperInfo.description'),
  )

  const shopperId = session?.shopperId ?? null
  const schema = useMemo(() => shopperInfoSchema(t), [t])
  const countryOptions = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: t(`countries.${c.code}`) || c.name,
      })),
    [t],
  )

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      nationalities: [],
      location: { country: '', city: '', lat: null, lng: null },
      residentVisa: '',
      email: '',
      phone: '',
      nativeLanguage: '',
      languagesSpoken: [],
      maritalStatus: '',
      children: [],
      accessibilityNeeds: false,
      accessibilityNotes: '',
    },
    mode: 'onChange',
  })

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control: form.control,
    name: 'languagesSpoken',
  })
  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: 'children',
  })

  const { data: shopper, isLoading } = useQuery({
    queryKey: ['shopper-info', shopperId],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('shoppers')
        .select(
          'id, full_name, email, date_of_birth, gender, nationalities, location_country, location_city, location_lat, location_lng, resident_visa, phone, native_language, languages_spoken, marital_status, children, accessibility_needs, accessibility_notes, status',
        )
        .eq('id', shopperId)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(shopperId),
  })

  useEffect(() => {
    if (!shopper) return
    form.reset({
      fullName: shopper.full_name ?? '',
      dateOfBirth: shopper.date_of_birth ? String(shopper.date_of_birth).slice(0, 10) : '',
      gender: shopper.gender ?? '',
      nationalities: Array.isArray(shopper.nationalities) ? shopper.nationalities : [],
      location: {
        country: shopper.location_country ?? '',
        city: shopper.location_city ?? '',
        lat: shopper.location_lat ?? null,
        lng: shopper.location_lng ?? null,
      },
      residentVisa: shopper.resident_visa ?? '',
      email: shopper.email ?? '',
      phone: shopper.phone ?? '',
      nativeLanguage: shopper.native_language ?? '',
      languagesSpoken: Array.isArray(shopper.languages_spoken)
        ? (shopper.languages_spoken as LanguageSpoken[]).map((x) => ({ language: x?.language ?? '', fluency: x?.fluency ?? '' }))
        : [],
      maritalStatus: shopper.marital_status ?? '',
      children: Array.isArray(shopper.children)
        ? (shopper.children as ChildEntry[]).map((x) => ({ dateOfBirth: x?.dateOfBirth ?? '' }))
        : [],
      accessibilityNeeds: Boolean(shopper.accessibility_needs),
      accessibilityNotes: shopper.accessibility_notes ?? '',
    })
  }, [shopper, form])

  const mutation = useMutation({
    mutationFn: async (values: ShopperInfoFormValues) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('shoppers')
        .update({
          full_name: values.fullName.trim(),
          date_of_birth: values.dateOfBirth || null,
          gender: values.gender || null,
          nationalities: values.nationalities?.length ? values.nationalities : [],
          location_country: values.location.country || null,
          location_city: values.location.city || null,
          location_lat: values.location.lat,
          location_lng: values.location.lng,
          resident_visa: values.residentVisa || null,
          phone: values.phone?.trim() || null,
          native_language: values.nativeLanguage || null,
          languages_spoken: values.languagesSpoken?.filter((x) => x.language && x.fluency) ?? [],
          marital_status: values.maritalStatus || null,
          children: values.children?.filter((c) => c.dateOfBirth).map((c) => ({ date_of_birth: c.dateOfBirth })) ?? [],
          accessibility_needs: values.accessibilityNeeds,
          accessibility_notes: values.accessibilityNeeds ? (values.accessibilityNotes?.trim() || null) : null,
          status: 'under_review',
          info_submitted_at: new Date().toISOString(),
        })
        .eq('id', shopperId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopper-info', shopperId] })
      queryClient.invalidateQueries({ queryKey: ['shopper-profile', shopperId] })
      // Reload so session is refetched with new status (under_review)
      window.location.href = '/workspace/visits'
    },
  })

  const onSubmit: SubmitHandler<ShopperInfoFormValues> = (values) => {
    mutation.mutate(values)
  }

  if (!session?.isShopper || !shopperId) {
    navigate('/workspace', { replace: true })
    return null
  }

  if (shopper?.status && shopper.status !== 'pending') {
    return (
      <div className="shopper-info-page">
        <Card>
          <h1 className="shopper-info-page__title">{t('shopperInfo.title')}</h1>
          <p className="shopper-info-page__subtitle">{t('shopperInfo.underReview')}</p>
          <Button type="button" onClick={() => navigate('/workspace/visits')}>
            {t('workspace.sidebar.visits')}
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="shopper-info-page">
        <Card>
          <p>{t('onboarding.loading')}</p>
        </Card>
      </div>
    )
  }

  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  return (
    <div className="shopper-info-page">
      <Card>
        <h1 className="shopper-info-page__title">{t('shopperInfo.title')}</h1>
        <p className="shopper-info-page__subtitle">{t('shopperInfo.description')}</p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="shopper-info-page__form">
          <section className="shopper-info-page__section">
            <h2 className="shopper-info-page__section-title">Personal Information</h2>
            <FormField
              id="shopper-info-fullName"
              label={t('shopperInfo.fullName')}
              error={form.formState.errors.fullName?.message}
            >
              <Input
                id="shopper-info-fullName"
                {...form.register('fullName')}
                hasError={Boolean(form.formState.errors.fullName)}
              />
            </FormField>
            <FormField
              id="shopper-info-dateOfBirth"
              label={t('shopperInfo.dateOfBirth')}
              helperText={t('shopperInfo.dateOfBirthHelper')}
              error={form.formState.errors.dateOfBirth?.message}
            >
              <Input
                id="shopper-info-dateOfBirth"
                type="date"
                {...form.register('dateOfBirth')}
                hasError={Boolean(form.formState.errors.dateOfBirth)}
              />
            </FormField>
            <FormField id="shopper-info-gender" label={t('shopperInfo.gender')}>
              <Select id="shopper-info-gender" {...form.register('gender')}>
                <option value="">{t('shopperInfo.genderPlaceholder')}</option>
                <option value="female">{t('shopperInfo.genderFemale')}</option>
                <option value="male">{t('shopperInfo.genderMale')}</option>
                <option value="non_binary">{t('shopperInfo.genderNonBinary')}</option>
                <option value="other">{t('shopperInfo.genderOther')}</option>
              </Select>
            </FormField>
            <FormField id="shopper-info-nationalities" label={t('shopperInfo.nationalities')}>
              <MultiSelect
                id="shopper-info-nationalities"
                options={countryOptions}
                value={form.watch('nationalities') ?? []}
                onChange={(v) => form.setValue('nationalities', v, { shouldValidate: true })}
                placeholder={t('shopperInfo.nationalitiesPlaceholder')}
                searchPlaceholder={t('shopperInfo.nationalitiesPlaceholder')}
              />
            </FormField>
          </section>

          <section className="shopper-info-page__section">
            <h2 className="shopper-info-page__section-title">{t('shopperInfo.currentLocation')}</h2>
            <p className="shopper-info-page__helper">{t('shopperInfo.currentLocationHelper')}</p>
            <LocationPicker
              id="shopper-info-location"
              value={form.watch('location')}
              onChange={(v) => form.setValue('location', v, { shouldValidate: true })}
              googleMapsApiKey={googleMapsKey}
            />
          </section>

          <section className="shopper-info-page__section">
            <FormField id="shopper-info-residentVisa" label={t('shopperInfo.residentVisa')}>
              <Select
                id="shopper-info-residentVisa"
                value={form.watch('residentVisa')}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => form.setValue('residentVisa', e.target.value, { shouldValidate: true })}
              >
                <option value="">{t('shopperInfo.genderPlaceholder')}</option>
                <option value="citizen">{t('shopperInfo.residentVisaCitizen')}</option>
                <option value="yes">{t('shopperInfo.residentVisaYes')}</option>
                <option value="no">{t('shopperInfo.residentVisaNo')}</option>
              </Select>
            </FormField>
          </section>

          <section className="shopper-info-page__section">
            <h2 className="shopper-info-page__section-title">Contact Information</h2>
            <FormField
              id="shopper-info-email"
              label={t('shopperInfo.contactEmail')}
              error={form.formState.errors.email?.message}
            >
              <EmailInput
                id="shopper-info-email"
                {...form.register('email')}
                hasError={Boolean(form.formState.errors.email)}
              />
            </FormField>
            <FormField
              id="shopper-info-phone"
              label={t('shopperInfo.contactPhone')}
              error={form.formState.errors.phone?.message}
            >
              <PhoneInput
                id="shopper-info-phone"
                {...form.register('phone')}
                hasError={Boolean(form.formState.errors.phone)}
              />
            </FormField>
          </section>

          <section className="shopper-info-page__section">
            <h2 className="shopper-info-page__section-title">{t('shopperInfo.nativeLanguage')} & {t('shopperInfo.otherLanguages')}</h2>
            <FormField id="shopper-info-nativeLanguage" label={t('shopperInfo.nativeLanguage')}>
              <Select id="shopper-info-nativeLanguage" {...form.register('nativeLanguage')}>
                <option value="">{t('shopperInfo.genderPlaceholder')}</option>
                {languageOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </FormField>
            <div className="shopper-info-page__array">
              <p className="shopper-info-page__array-label">{t('shopperInfo.otherLanguages')}</p>
              {languageFields.map((field, i) => (
                <div key={field.id} className="shopper-info-page__array-row">
                  <Select
                    value={form.watch(`languagesSpoken.${i}.language`)}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => form.setValue(`languagesSpoken.${i}.language`, e.target.value)}
                  >
                    <option value="">{t('shopperInfo.language')}</option>
                    {languageOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                  <Select
                    value={form.watch(`languagesSpoken.${i}.fluency`)}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => form.setValue(`languagesSpoken.${i}.fluency`, e.target.value)}
                  >
                    <option value="">{t('shopperInfo.fluency')}</option>
                    {fluencyOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                  <Button type="button" variant="ghost" onClick={() => removeLanguage(i)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => appendLanguage({ language: '', fluency: '' })}>
                {t('shopperInfo.addLanguage')}
              </Button>
            </div>
          </section>

          <section className="shopper-info-page__section">
            <FormField id="shopper-info-maritalStatus" label={t('shopperInfo.maritalStatus')}>
              <Select id="shopper-info-maritalStatus" {...form.register('maritalStatus')}>
                <option value="">{t('shopperInfo.maritalStatusPlaceholder')}</option>
                <option value="single">{t('shopperInfo.maritalSingle')}</option>
                <option value="married">{t('shopperInfo.maritalMarried')}</option>
                <option value="divorced">{t('shopperInfo.maritalDivorced')}</option>
                <option value="widowed">{t('shopperInfo.maritalWidowed')}</option>
                <option value="other">{t('shopperInfo.maritalOther')}</option>
              </Select>
            </FormField>
            <div className="shopper-info-page__array">
              <p className="shopper-info-page__array-label">{t('shopperInfo.children')}</p>
              {childFields.map((field, i) => (
                <div key={field.id} className="shopper-info-page__array-row">
                  <Input
                    type="date"
                    {...form.register(`children.${i}.dateOfBirth`)}
                    placeholder={t('shopperInfo.childDateOfBirth')}
                  />
                  <Button type="button" variant="ghost" onClick={() => removeChild(i)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => appendChild({ dateOfBirth: '' })}>
                {t('shopperInfo.addChild')}
              </Button>
            </div>
          </section>

          <section className="shopper-info-page__section">
            <FormField id="shopper-info-accessibility" label={t('shopperInfo.accessibilityNeeds')}>
              <div className="shopper-info-page__radio-row">
                <label>
                  <input
                    type="radio"
                    name="accessibilityNeeds"
                    checked={form.watch('accessibilityNeeds') === false}
                    onChange={() => form.setValue('accessibilityNeeds', false, { shouldValidate: true })}
                  />
                  {t('shopperInfo.accessibilityNeedsNo')}
                </label>
                <label>
                  <input
                    type="radio"
                    name="accessibilityNeeds"
                    checked={form.watch('accessibilityNeeds') === true}
                    onChange={() => form.setValue('accessibilityNeeds', true, { shouldValidate: true })}
                  />
                  {t('shopperInfo.accessibilityNeedsYes')}
                </label>
              </div>
            </FormField>
            {form.watch('accessibilityNeeds') && (
              <FormField id="shopper-info-accessibilityNotes" label={t('shopperInfo.accessibilitySpecify')}>
                <Textarea id="shopper-info-accessibilityNotes" {...form.register('accessibilityNotes')} />
              </FormField>
            )}
          </section>

          {mutation.isError && (
            <p className="form-error">
              {mutation.error instanceof Error ? mutation.error.message : t('validation.generic')}
            </p>
          )}
          <div className="shopper-info-page__actions">
            <Button type="submit" loading={mutation.isPending} disabled={!form.formState.isValid}>
              {mutation.isPending ? t('shopperInfo.submitting') : t('shopperInfo.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
