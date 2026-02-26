import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Card } from '../../components/ui/Card.tsx'
import { FormField } from '../../components/ui/FormField.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { getSupabaseClient } from '../../lib/supabaseClient.ts'

type CreateCompanyFormValues = {
  companyName: string
}

type WorkspaceCreateCompanyViewProps = {
  onSuccess: () => void
}

export function WorkspaceCreateCompanyView({ onSuccess }: WorkspaceCreateCompanyViewProps) {
  const { t } = useTranslation()

  const schema = useMemo(
    () =>
      z.object({
        companyName: z
          .string()
          .min(2, t('validation.companyLength'))
          .nonempty(t('validation.required')),
      }),
    [t],
  )

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { companyName: '' },
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: async (companyName: string) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.rpc('create_company_with_owner', {
        company_name: companyName.trim(),
      })
      if (error) throw new Error(error.message)
      await supabase.auth.updateUser({ data: { pending_company_name: null } })
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const onSubmit: SubmitHandler<CreateCompanyFormValues> = (values) => {
    mutation.mutate(values.companyName)
  }

  return (
    <div className="workspace-page">
      <Card className="workspace-card">
        <h2 className="workspace-subtitle">{t('onboarding.title')}</h2>
        <p className="workspace-subtitle">{t('onboarding.description')}</p>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="workspace-create-company-form"
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
    </div>
  )
}
