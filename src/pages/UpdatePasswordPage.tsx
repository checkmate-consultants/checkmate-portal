import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '../components/Logo.tsx'
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { Card } from '../components/ui/Card.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './signin-page.css'

type UpdatePasswordValues = {
  password: string
  confirmPassword: string
}

export function UpdatePasswordPage() {
  const { t, i18n } = useTranslation()
  usePageMetadata(
    `${t('meta.updatePassword.title')} | ${t('brand.name')}`,
    t('meta.updatePassword.description'),
  )
  const navigate = useNavigate()
  const dir = i18n.dir()

  const validationSchema = useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, t('validation.passwordLength')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('validation.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: async (password: string) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      navigate('/signin', {
        replace: true,
        state: { message: t('updatePassword.success') },
      })
    },
  })

  useEffect(() => {
    const supabase = getSupabaseClient()
    const hasRecoveryHash = window.location.hash.length > 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return
      if (!hasRecoveryHash) {
        navigate('/signin', { replace: true })
        return
      }
      // Give Supabase time to parse the recovery hash from the URL, then re-check once
      timeoutId = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (!s) navigate('/signin', { replace: true })
        })
      }, 500)
    })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [navigate])

  const onSubmit: SubmitHandler<UpdatePasswordValues> = (values) => {
    mutation.mutate(values.password)
  }

  return (
    <div className="signin-page" dir={dir}>
      <header className="signin-page__header">
        <Logo size="sm" />
        <div className="signin-page__header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="signin-page__content">
        <section className="signin-page__hero">
          <h1>{t('updatePassword.title')}</h1>
          <p>{t('updatePassword.subtitle')}</p>
        </section>

        <Card className="signin-card">
          <form
            className="signin-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              id="update-password"
              label={t('updatePassword.newPassword')}
              error={form.formState.errors.password?.message}
            >
              <Input
                id="update-password"
                type="password"
                placeholder={t('signin.passwordPlaceholder')}
                {...form.register('password')}
                hasError={Boolean(form.formState.errors.password)}
                aria-invalid={Boolean(form.formState.errors.password)}
                autoComplete="new-password"
              />
            </FormField>

            <FormField
              id="update-password-confirm"
              label={t('updatePassword.confirmPassword')}
              error={form.formState.errors.confirmPassword?.message}
            >
              <Input
                id="update-password-confirm"
                type="password"
                placeholder={t('signin.passwordPlaceholder')}
                {...form.register('confirmPassword')}
                hasError={Boolean(form.formState.errors.confirmPassword)}
                aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                autoComplete="new-password"
              />
            </FormField>

            {mutation.isError && (
              <p className="form-error">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : t('validation.generic')}
              </p>
            )}

            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!form.formState.isValid}
            >
              {t('updatePassword.submit')}
            </Button>

            <p className="signup-hint">
              <Link to="/signin">{t('updatePassword.backToSignIn')}</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  )
}
