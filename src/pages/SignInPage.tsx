import { useMemo, useState } from 'react'
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
import './signin-page.css'

type SignInValues = {
  email: string
  password: string
  remember: boolean
}

export function SignInPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dir = i18n.dir()
  const [resetFeedback, setResetFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const validationSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .nonempty(t('validation.required'))
          .email(t('validation.email')),
        password: z
          .string()
          .nonempty(t('validation.required'))
          .min(8, t('validation.passwordLength')),
        remember: z.boolean().catch(false),
      }),
    [t],
  )

  const form = useForm<SignInValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: async (values: SignInValues) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      navigate('/workspace')
    },
  })

  const onSubmit: SubmitHandler<SignInValues> = (values) => {
    setResetFeedback(null)
    mutation.mutate(values)
  }

  const handlePasswordReset = async () => {
    const email = form.getValues('email')
    if (!email) {
      form.setError('email', {
        type: 'manual',
        message: t('validation.email'),
      })
      return
    }
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/signin`,
      })
      if (error) throw new Error(error.message)
      setResetFeedback({
        type: 'success',
        message: t('signin.resetSuccess'),
      })
    } catch (error) {
      setResetFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : t('validation.generic'),
      })
    }
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
          <span className="hero-badge">{t('hero.badge')}</span>
          <h1>{t('signin.title')}</h1>
          <p>{t('signin.subtitle')}</p>
        </section>

        <Card className="signin-card">
          <form className="signin-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              id="signin-email"
              label={t('signin.email')}
              error={form.formState.errors.email?.message}
            >
              <Input
                id="signin-email"
                type="email"
                placeholder={t('signin.emailPlaceholder')}
                {...form.register('email')}
                hasError={Boolean(form.formState.errors.email)}
                aria-invalid={Boolean(form.formState.errors.email)}
                autoComplete="username"
              />
            </FormField>

            <FormField
              id="signin-password"
              label={t('signin.password')}
              error={form.formState.errors.password?.message}
            >
              <Input
                id="signin-password"
                type="password"
                placeholder={t('signin.passwordPlaceholder')}
                {...form.register('password')}
                hasError={Boolean(form.formState.errors.password)}
                aria-invalid={Boolean(form.formState.errors.password)}
                autoComplete="current-password"
              />
            </FormField>

            <div className="signin-form__meta">
              <label className="remember-checkbox">
                <input type="checkbox" {...form.register('remember')} />
                <span>{t('signin.remember')}</span>
              </label>
              <button
                className="text-link"
                type="button"
                onClick={handlePasswordReset}
              >
                {t('signin.forgot')}
              </button>
            </div>

            {resetFeedback && (
              <p
                className={`reset-feedback reset-feedback--${resetFeedback.type}`}
              >
                {resetFeedback.message}
              </p>
            )}

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
              {t('signin.submit')}
            </Button>

            <p className="signup-hint">
              {t('signin.noAccount')}{' '}
              <Link to="/signup">{t('signin.createAccount')}</Link>
            </p>
          </form>
        </Card>
      </main>
    </div>
  )
}

