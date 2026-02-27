import { useEffect, useMemo, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext, useParams, useNavigate, NavLink } from 'react-router-dom'
import { z } from 'zod'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { Card } from '../components/ui/Card.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import { getDisplayName } from '../components/workspace/UserAccountDropdown.tsx'
import './account-page.css'

type UpdateNameValues = {
  fullName: string
}

type ChangePasswordValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const VALID_TABS = ['profile', 'security'] as const
type TabId = (typeof VALID_TABS)[number]

function isValidTab(tab: string | undefined): tab is TabId {
  return tab === 'profile' || tab === 'security'
}

export function AccountPage() {
  const { t, i18n } = useTranslation()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const queryClient = useQueryClient()
  const { tab: tabParam } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : 'profile'
  const [nameSuccess, setNameSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  usePageMetadata(
    `${t('meta.account.title')} | ${t('brand.name')}`,
    t('meta.account.description'),
  )
  const dir = i18n.dir()

  const user = session?.user ?? null
  const isShopper = Boolean(session?.isShopper && session?.shopperId)
  const shopperId = session?.shopperId ?? null

  const { data: shopper } = useQuery({
    queryKey: ['shopper-profile', shopperId],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('shoppers')
        .select('full_name')
        .eq('id', shopperId)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(shopperId),
  })

  const displayName = (() => {
    if (!user) return ''
    const fromAuth = (user.user_metadata?.full_name as string | undefined)?.trim()
    if (fromAuth) return fromAuth
    if (isShopper && shopper?.full_name?.trim()) return shopper.full_name.trim()
    return user.email ?? ''
  })()

  const nameSchema = useMemo(
    () =>
      z.object({
        fullName: z
          .string()
          .min(2, t('validation.nameLength'))
          .nonempty(t('validation.required')),
      }),
    [t],
  )

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().nonempty(t('validation.required')),
          newPassword: z
            .string()
            .min(8, t('validation.passwordLength')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t('validation.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )

  const nameForm = useForm<UpdateNameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: displayName },
    mode: 'onChange',
  })

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  useEffect(() => {
    if (displayName) {
      nameForm.reset({ fullName: displayName })
    }
  }, [displayName, nameForm])

  const updateNameMutation = useMutation({
    mutationFn: async (fullName: string) => {
      const supabase = getSupabaseClient()
      const trimmed = fullName.trim()
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      })
      if (authError) throw new Error(authError.message)
      if (isShopper && shopperId) {
        const { error: shoppersError } = await supabase
          .from('shoppers')
          .update({ full_name: trimmed })
          .eq('id', shopperId)
        if (shoppersError) throw new Error(shoppersError.message)
      }
    },
    onSuccess: () => {
      if (shopperId) {
        queryClient.invalidateQueries({ queryKey: ['shopper-profile', shopperId] })
      }
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 4000)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (values: ChangePasswordValues) => {
      const supabase = getSupabaseClient()
      const email = user?.email
      if (!email) throw new Error(t('validation.generic'))
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: values.currentPassword,
      })
      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid') || signInError.message.toLowerCase().includes('password')) {
          throw new Error(t('account.changePassword.wrongPassword'))
        }
        throw new Error(signInError.message)
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      })
      if (updateError) throw new Error(updateError.message)
    },
    onSuccess: () => {
      setPasswordSuccess(true)
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setTimeout(() => setPasswordSuccess(false), 4000)
    },
  })

  const onNameSubmit: SubmitHandler<UpdateNameValues> = (values) => {
    updateNameMutation.mutate(values.fullName)
  }

  const onPasswordSubmit: SubmitHandler<ChangePasswordValues> = (values) => {
    changePasswordMutation.mutate(values)
  }

  useEffect(() => {
    if (tabParam && !isValidTab(tabParam)) {
      navigate('/workspace/account/profile', { replace: true })
    }
  }, [tabParam, navigate])

  if (!session?.user) {
    return null
  }

  return (
    <div className="account-page" dir={dir}>
      <div className="account-page__inner">
        <h1 className="account-page__title">{t('account.title')}</h1>

        <nav className="account-page__tabs" role="tablist" aria-label={t('account.title')}>
          <NavLink
            to="/workspace/account/profile"
            role="tab"
            aria-selected={activeTab === 'profile' ? 'true' : 'false'}
            aria-controls="account-panel-profile"
            id="account-tab-profile"
            className={({ isActive }) =>
              `account-page__tab${isActive ? ' account-page__tab--active' : ''}`
            }
            end
          >
            {t('account.tabProfile')}
          </NavLink>
          <NavLink
            to="/workspace/account/security"
            role="tab"
            aria-selected={activeTab === 'security' ? 'true' : 'false'}
            aria-controls="account-panel-security"
            id="account-tab-security"
            className={({ isActive }) =>
              `account-page__tab${isActive ? ' account-page__tab--active' : ''}`
            }
          >
            {t('account.tabSecurity')}
          </NavLink>
        </nav>

        {activeTab === 'profile' && (
          <Card
            id="account-panel-profile"
            className="account-page__card"
            role="tabpanel"
            aria-labelledby="account-tab-profile"
          >
            <h2 className="account-page__section-title">
              {t('account.updateName.title')}
            </h2>
            <p className="account-page__section-desc">
              {t('account.updateName.description')}
            </p>
            <form
            className="account-page__form"
            onSubmit={nameForm.handleSubmit(onNameSubmit)}
          >
            <FormField
              id="account-full-name"
              label={t('account.updateName.nameLabel')}
              error={nameForm.formState.errors.fullName?.message}
            >
              <Input
                id="account-full-name"
                type="text"
                placeholder={t('account.updateName.namePlaceholder')}
                {...nameForm.register('fullName')}
                hasError={Boolean(nameForm.formState.errors.fullName)}
                aria-invalid={Boolean(nameForm.formState.errors.fullName)}
                autoComplete="name"
              />
            </FormField>
            {nameSuccess && (
              <p className="account-page__success" role="status">
                {t('account.updateName.saved')}
              </p>
            )}
            {updateNameMutation.isError && (
              <p className="form-error">
                {updateNameMutation.error instanceof Error
                  ? updateNameMutation.error.message
                  : t('validation.generic')}
              </p>
            )}
            <Button
              type="submit"
              loading={updateNameMutation.isPending}
              disabled={!nameForm.formState.isValid}
            >
              {t('account.updateName.save')}
            </Button>
          </form>
          </Card>
        )}

        {activeTab === 'security' && (
          <Card
            id="account-panel-security"
            className="account-page__card"
            role="tabpanel"
            aria-labelledby="account-tab-security"
          >
            <h2 className="account-page__section-title">
              {t('account.changePassword.title')}
            </h2>
            <p className="account-page__section-desc">
              {t('account.changePassword.description')}
            </p>
            <form
              className="account-page__form"
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            >
            <FormField
              id="account-current-password"
              label={t('account.changePassword.currentPassword')}
              error={passwordForm.formState.errors.currentPassword?.message}
            >
              <Input
                id="account-current-password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register('currentPassword')}
                hasError={Boolean(passwordForm.formState.errors.currentPassword)}
                aria-invalid={Boolean(passwordForm.formState.errors.currentPassword)}
                autoComplete="current-password"
              />
            </FormField>
            <FormField
              id="account-new-password"
              label={t('account.changePassword.newPassword')}
              error={passwordForm.formState.errors.newPassword?.message}
            >
              <Input
                id="account-new-password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register('newPassword')}
                hasError={Boolean(passwordForm.formState.errors.newPassword)}
                aria-invalid={Boolean(passwordForm.formState.errors.newPassword)}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              id="account-confirm-password"
              label={t('account.changePassword.confirmPassword')}
              error={passwordForm.formState.errors.confirmPassword?.message}
            >
              <Input
                id="account-confirm-password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register('confirmPassword')}
                hasError={Boolean(passwordForm.formState.errors.confirmPassword)}
                aria-invalid={Boolean(passwordForm.formState.errors.confirmPassword)}
                autoComplete="new-password"
              />
            </FormField>
            {passwordSuccess && (
              <p className="account-page__success" role="status">
                {t('account.changePassword.success')}
              </p>
            )}
            {changePasswordMutation.isError && (
              <p className="form-error">
                {changePasswordMutation.error instanceof Error
                  ? changePasswordMutation.error.message
                  : t('validation.generic')}
              </p>
            )}
            <Button
              type="submit"
              loading={changePasswordMutation.isPending}
              disabled={!passwordForm.formState.isValid}
            >
              {t('account.changePassword.submit')}
            </Button>
          </form>
          </Card>
        )}
      </div>
    </div>
  )
}
