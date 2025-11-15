import { useMemo } from 'react'
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '../components/ui/Button.tsx'
import { Card } from '../components/ui/Card.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Logo } from '../components/Logo.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import './signup-page.css'

type SignUpValues = {
  name: string
  companyName: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
}

const passwordScore = (password: string) => {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return (score / 4) * 100
}

export function SignUpPage() {
  const { t, i18n } = useTranslation()

  const validationSchema = useMemo(
    () =>
      z
        .object({
          name: z
            .string()
            .min(2, t('validation.nameLength'))
            .nonempty(t('validation.required')),
          companyName: z
            .string()
            .min(2, t('validation.companyLength'))
            .nonempty(t('validation.required')),
          email: z
            .string()
            .nonempty(t('validation.required'))
            .email(t('validation.email')),
          password: z
            .string()
            .min(8, t('validation.passwordLength')),
          confirmPassword: z
            .string()
            .min(8, t('validation.passwordLength')),
          terms: z
            .boolean()
            .refine((value) => value, t('validation.terms')),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('validation.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )

  const form = useForm<SignUpValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: async (values: SignUpValues) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
            pending_company_name: values.companyName,
          },
          emailRedirectTo: `${window.location.origin}/onboarding/company`,
        },
      })
      if (error) throw new Error(error.message)
    },
  })

  const onSubmit: SubmitHandler<SignUpValues> = (values) => {
    mutation.mutate(values)
  }

  const isSuccess = mutation.isSuccess

  const pwd = useWatch({
    control: form.control,
    name: 'password',
    defaultValue: '',
  })
  const pwdStrength = passwordScore(pwd)

  const dir = i18n.dir()

  return (
    <div className="signup-page" dir={dir}>
      <header className="signup-page__header">
        <Logo size="sm" />
        <div className="signup-page__header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="signup-page__content">
        <section className="signup-page__hero">
          <span className="hero-badge">{t('hero.badge')}</span>
          <h1>{t('signup.title')}</h1>
          <p>{t('signup.subtitle')}</p>
          <div className="hero-highlight">{t('hero.highlight')}</div>
          <ul>
            {(t('hero.points', { returnObjects: true }) as string[]).map(
              (point) => (
                <li key={point}>{point}</li>
              ),
            )}
          </ul>
        </section>

        <Card className="signup-card">
          {isSuccess ? (
            <div className="signup-success">
              <h2>{t('signup.successTitle')}</h2>
              <p>{t('signup.successBody')}</p>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="signup-form"
            >
              <FormField
                id="name"
                label={t('signup.name')}
                error={form.formState.errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder={t('signup.namePlaceholder')}
                  {...form.register('name')}
                  hasError={Boolean(form.formState.errors.name)}
                  aria-invalid={Boolean(form.formState.errors.name)}
                />
              </FormField>

              <FormField
                id="company"
                label={t('signup.company')}
                helperText={t('signup.companyHelper')}
                error={form.formState.errors.companyName?.message}
              >
                <Input
                  id="company"
                  placeholder={t('signup.companyPlaceholder')}
                  {...form.register('companyName')}
                  hasError={Boolean(form.formState.errors.companyName)}
                  aria-invalid={Boolean(form.formState.errors.companyName)}
                />
              </FormField>

              <FormField
                id="email"
                label={t('signup.email')}
                error={form.formState.errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  {...form.register('email')}
                  hasError={Boolean(form.formState.errors.email)}
                  aria-invalid={Boolean(form.formState.errors.email)}
                />
              </FormField>

              <FormField
                id="password"
                label={t('signup.password')}
                helperText={t('signup.passwordStrength', {
                  value: Math.round(pwdStrength),
                })}
                error={form.formState.errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  placeholder={t('signup.passwordPlaceholder')}
                  {...form.register('password')}
                  hasError={Boolean(form.formState.errors.password)}
                  aria-invalid={Boolean(form.formState.errors.password)}
                />
                <div className="password-meter">
                  <span
                    className="password-meter__fill"
                    style={{ width: `${pwdStrength}%` }}
                  />
                </div>
              </FormField>

              <FormField
                id="confirmPassword"
                label={t('signup.confirmPassword')}
                error={form.formState.errors.confirmPassword?.message}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('signup.passwordPlaceholder')}
                  {...form.register('confirmPassword')}
                  hasError={Boolean(
                    form.formState.errors.confirmPassword,
                  )}
                  aria-invalid={Boolean(
                    form.formState.errors.confirmPassword,
                  )}
                />
              </FormField>

              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  aria-invalid={Boolean(form.formState.errors.terms)}
                  {...form.register('terms')}
                />
                <span>{t('signup.terms')}</span>
              </label>
              {form.formState.errors.terms && (
                <span className="terms-error">
                  {form.formState.errors.terms.message}
                </span>
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
                {t('signup.submit')}
              </Button>

              <p className="signin-hint">
                {t('signup.alreadyHaveAccount')}{' '}
                <Link to="/signin">{t('signup.signIn')}</Link>
              </p>
            </form>
          )}
        </Card>
      </main>
    </div>
  )
}

