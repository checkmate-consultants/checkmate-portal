import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
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
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './shopper-profile-page.css'

type ProfileFormValues = {
  fullName: string
  email: string
}

export function ShopperProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const queryClient = useQueryClient()
  usePageMetadata(
    `${t('profile.shopper.title')} | ${t('brand.name')}`,
    t('profile.shopper.description'),
  )
  const dir = i18n.dir()

  const schema = useMemo(
    () =>
      z.object({
        fullName: z
          .string()
          .min(2, t('validation.nameLength'))
          .nonempty(t('validation.required')),
        email: z
          .string()
          .nonempty(t('validation.required'))
          .email(t('validation.email')),
      }),
    [t],
  )

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '' },
    mode: 'onChange',
  })

  const shopperId = session?.shopperId ?? null

  const { data: shopper, isLoading, error } = useQuery({
    queryKey: ['shopper-profile', shopperId],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      const { data, error: e } = await supabase
        .from('shoppers')
        .select('id, full_name, email')
        .eq('id', shopperId)
        .single()
      if (e) throw e
      return data
    },
    enabled: Boolean(shopperId),
  })

  useEffect(() => {
    if (shopper) {
      form.reset({
        fullName: shopper.full_name ?? '',
        email: shopper.email ?? '',
      })
    }
  }, [shopper, form])

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const supabase = getSupabaseClient()
      const { error: e } = await supabase
        .from('shoppers')
        .update({
          full_name: values.fullName.trim(),
          email: values.email.trim().toLowerCase(),
        })
        .eq('id', shopperId)
      if (e) throw new Error(e.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopper-profile', shopperId] })
    },
  })

  const onSubmit: SubmitHandler<ProfileFormValues> = (values) => {
    mutation.mutate(values)
  }

  if (session && !session.isShopper) {
    navigate('/workspace', { replace: true })
    return null
  }
  if (!session?.isShopper || !shopperId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="shopper-profile-page" dir={dir}>
        <Card>
          <p>{t('onboarding.loading')}</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="shopper-profile-page" dir={dir}>
        <Card>
          <p className="form-error">{t('validation.generic')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="shopper-profile-page" dir={dir}>
      <Card>
        <h1 className="shopper-profile-page__title">{t('profile.shopper.title')}</h1>
        <p className="shopper-profile-page__subtitle">{t('profile.shopper.description')}</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="shopper-profile-page__form">
          <FormField
            id="fullName"
            label={t('signup.name')}
            error={form.formState.errors.fullName?.message}
          >
            <Input
              id="fullName"
              placeholder={t('signup.namePlaceholder')}
              {...form.register('fullName')}
              hasError={Boolean(form.formState.errors.fullName)}
              aria-invalid={Boolean(form.formState.errors.fullName)}
            />
          </FormField>
          <FormField
            id="profileEmail"
            label={t('signup.email')}
            error={form.formState.errors.email?.message}
          >
            <Input
              id="profileEmail"
              type="email"
              placeholder={t('signup.emailPlaceholder')}
              {...form.register('email')}
              hasError={Boolean(form.formState.errors.email)}
              aria-invalid={Boolean(form.formState.errors.email)}
            />
          </FormField>
          {mutation.isError && (
            <p className="form-error">
              {mutation.error instanceof Error ? mutation.error.message : t('validation.generic')}
            </p>
          )}
          {mutation.isSuccess && (
            <p className="form-success">{t('profile.shopper.saved')}</p>
          )}
          <Button type="submit" loading={mutation.isPending} disabled={!form.formState.isDirty}>
            {t('profile.shopper.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
