import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo.tsx'
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { Card } from '../components/ui/Card.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { getSessionContext } from '../lib/session.ts'
import './company-onboarding-page.css'

type CompanyFormValues = {
  companyName: string
}

export function CompanyOnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [initializing, setInitializing] = useState(true)
  const dir = i18n.dir()

  const validationSchema = z.object({
    companyName: z
      .string()
      .min(2, t('validation.companyLength'))
      .nonempty(t('validation.required')),
  })

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { companyName: '' },
    mode: 'onChange',
  })

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      try {
        const { user, membership } = await getSessionContext({
          autoProvision: false,
        })
        if (!user) {
          navigate('/signin', { replace: true })
          return
        }
        if (membership) {
          navigate('/workspace', { replace: true })
          return
        }
        if (!cancelled) {
          form.reset({
            companyName: user.user_metadata?.pending_company_name ?? '',
          })
          setInitializing(false)
        }
      } catch (error) {
        console.error(error)
        navigate('/signin', { replace: true })
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [form, navigate])

  const mutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('create_company_with_owner', {
        company_name: values.companyName.trim(),
      })
      if (error) {
        throw new Error(error.message)
      }
      await supabase.auth.updateUser({
        data: { pending_company_name: null },
      })
      return data
    },
    onSuccess: () => {
      navigate('/workspace', { replace: true })
    },
  })

  const onSubmit: SubmitHandler<CompanyFormValues> = (values) => {
    mutation.mutate(values)
  }

  if (initializing) {
    return (
      <div className="company-onboarding-page" dir={dir}>
        <Card className="company-onboarding-card">
          <p>{t('onboarding.loading')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="company-onboarding-page" dir={dir}>
      <header className="company-onboarding__header">
        <Logo size="sm" />
        <div className="company-onboarding__header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="company-onboarding__content">
        <section className="company-onboarding__hero">
          <span className="hero-badge">{t('hero.badge')}</span>
          <h1>{t('onboarding.title')}</h1>
          <p>{t('onboarding.subtitle')}</p>
          <p className="company-onboarding__description">
            {t('onboarding.description')}
          </p>
        </section>

        <Card className="company-onboarding-card">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="company-onboarding-form"
          >
            <FormField
              id="company-name"
              label={t('onboarding.companyLabel')}
              error={form.formState.errors.companyName?.message}
            >
              <Input
                id="company-name"
                placeholder={t('signup.companyPlaceholder')}
                {...form.register('companyName')}
                hasError={Boolean(form.formState.errors.companyName)}
                aria-invalid={Boolean(form.formState.errors.companyName)}
                autoComplete="organization"
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
              {t('onboarding.submit')}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}

