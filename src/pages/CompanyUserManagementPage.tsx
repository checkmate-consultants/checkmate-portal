import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Table } from '../components/ui/Table.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import {
  fetchCompanyMembers,
  fetchCompanyDirectory,
  inviteCompanyUser,
  removeCompanyMember,
  resetUserPassword,
  type CompanyMember,
  type CompanyDirectoryItem,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './company-user-management-page.css'

type PageState = {
  status: 'loading' | 'ready' | 'error' | 'forbidden'
  list: CompanyMember[]
  errorMessage: string | null
}

type FormValues = {
  email: string
  fullName: string
  companyId?: string
}

export function CompanyUserManagementPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('companyUserManagement.metaTitle')} | ${t('brand.name')}`,
    t('companyUserManagement.metaDescription'),
  )
  const navigate = useNavigate()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const { companyId: routeCompanyId } = useParams<{ companyId?: string }>()
  const isAdminContext = Boolean(routeCompanyId)
  const companyId =
    routeCompanyId ?? session.membership?.company_id ?? null
  const isCompanyAdmin = session.membership?.role === 'company_admin'
  const isSuperAdmin = session.isSuperAdmin

  const canAccess =
    companyId &&
    ((isCompanyAdmin && !isAdminContext) || (isSuperAdmin && isAdminContext))

  const [state, setState] = useState<PageState>({
    status: 'loading',
    list: [],
    errorMessage: null,
  })
  const [companies, setCompanies] = useState<CompanyDirectoryItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    email: string
    tempPassword?: string
  } | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{
    email: string
    tempPassword: string
  } | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('validation.required')).email(t('validation.email')),
        fullName: z.string(),
        companyId: isSuperAdmin
          ? z.string().min(1, t('validation.required'))
          : z.string().optional(),
      }),
    [t, isSuperAdmin],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      email: '',
      fullName: '',
      companyId: companyId ?? '',
    },
    mode: 'onChange',
  })

  const loadList = async () => {
    if (!companyId) return
    try {
      const list = await fetchCompanyMembers(companyId)
      setState({ status: 'ready', list, errorMessage: null })
    } catch (error) {
      setState({
        status: 'error',
        list: [],
        errorMessage:
          error instanceof Error
            ? error.message
            : t('companyManagement.errors.generic'),
      })
    }
  }

  useEffect(() => {
    if (!canAccess) {
      setState({
        status: 'forbidden',
        list: [],
        errorMessage: t('companyUserManagement.forbidden'),
      })
      return
    }
    loadList()
  }, [canAccess, companyId, t])

  useEffect(() => {
    if (companyId && form.getValues('companyId') !== companyId) {
      form.setValue('companyId', companyId)
    }
  }, [companyId, form])

  useEffect(() => {
    if (!isSuperAdmin) return
    const loadCompanies = async () => {
      try {
        const list = await fetchCompanyDirectory()
        setCompanies(list)
      } catch {
        setCompanies([])
      }
    }
    loadCompanies()
  }, [isSuperAdmin])

  const openModal = () => {
    form.reset({
      email: '',
      fullName: '',
      companyId: companyId ?? '',
    })
    setCreationResult(null)
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const targetId = isSuperAdmin ? values.companyId : companyId
    if (!targetId) return
    const result = await inviteCompanyUser({
      companyId: targetId,
      email: values.email,
      fullName: values.fullName.trim() || undefined,
    })
    setCreationResult({
      email: values.email,
      tempPassword: result.tempPassword,
    })
    await loadList()
    form.reset({ email: '', fullName: '' })
  }

  const handleRemove = async (userId: string) => {
    if (!companyId) return
    if (!window.confirm(t('companyUserManagement.confirmRemove'))) return
    setRemovingId(userId)
    try {
      await removeCompanyMember(companyId, userId)
      await loadList()
    } catch (error) {
      console.error(error)
    } finally {
      setRemovingId(null)
    }
  }

  const handleResetPassword = async (member: CompanyMember) => {
    if (!window.confirm(t('companyUserManagement.confirmResetPassword'))) return
    setResettingId(member.userId)
    setResetResult(null)
    try {
      const { tempPassword } = await resetUserPassword({
        userId: member.userId,
        ...(companyId && { companyId }),
      })
      setResetResult({
        email: member.email ?? member.fullName ?? member.userId,
        tempPassword,
      })
    } catch (error) {
      console.error(error)
      setResetResult(null)
    } finally {
      setResettingId(null)
    }
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case 'company_admin':
        return t('companyUserManagement.roleAdmin')
      case 'company_member':
        return t('companyUserManagement.roleMember')
      case 'company_viewer':
        return t('companyUserManagement.roleViewer')
      default:
        return role
    }
  }

  const backPath = isAdminContext
    ? `/workspace/admin/companies/${companyId}`
    : '/workspace/company'

  if (state.status === 'forbidden') {
    return (
      <div className="company-user-management company-user-management--centered">
        <Card className="company-user-management__card">
          <p>{state.errorMessage}</p>
          <Button type="button" onClick={() => navigate(backPath)}>
            {t('companyManagement.backToList')}
          </Button>
        </Card>
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="company-user-management company-user-management--centered">
        <Card className="company-user-management__card">
          <p>{t('companyManagement.loading')}</p>
        </Card>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="company-user-management company-user-management--centered">
        <Card className="company-user-management__card">
          <p>{state.errorMessage}</p>
          <Button type="button" onClick={() => loadList()}>
            {t('companyManagement.retry')}
          </Button>
        </Card>
      </div>
    )
  }

  const currentUserId = session.user?.id

  return (
    <div className="company-user-management">
      <header className="company-user-management__header">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="company-user-management__back"
            onClick={() => navigate(backPath)}
          >
            ← {t('companyManagement.backToList')}
          </Button>
          <h1>{t('companyUserManagement.title')}</h1>
          <p>{t('companyUserManagement.subtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={openModal}>
          {t('companyUserManagement.addUser')}
        </Button>
      </header>

      {state.list.length === 0 ? (
        <Card className="company-user-management__card">
          <p>{t('companyUserManagement.empty')}</p>
        </Card>
      ) : (
        <Table<CompanyMember>
          columns={[
            {
              key: 'fullName',
              header: t('companyUserManagement.table.name'),
              render: (m) => m.fullName || '—',
            },
            {
              key: 'email',
              header: t('companyUserManagement.table.email'),
              render: (m) => m.email || '—',
            },
            {
              key: 'role',
              header: t('companyUserManagement.table.role'),
              render: (m) => roleLabel(m.role),
            },
            {
              key: 'actions',
              header: t('companyUserManagement.table.actions'),
              render: (m) => (
                <div className="company-user-management__row-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    className="company-user-management__reset-pwd"
                    onClick={() => handleResetPassword(m)}
                    disabled={resettingId === m.userId}
                  >
                    {resettingId === m.userId
                      ? t('companyUserManagement.resettingPassword')
                      : t('companyUserManagement.resetPassword')}
                  </Button>
                  {m.role !== 'company_admin' && m.userId !== currentUserId && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="company-user-management__remove"
                      onClick={() => handleRemove(m.userId)}
                      disabled={removingId === m.userId}
                    >
                      {removingId === m.userId
                        ? t('companyUserManagement.removing')
                        : t('companyUserManagement.remove')}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={state.list}
          getRowKey={(m) => m.userId}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('companyUserManagement.forms.title')}
        description={t('companyUserManagement.forms.description')}
      >
        <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
          {isSuperAdmin && (
            <FormField
              id="cum-company"
              label={t('companyUserManagement.forms.company')}
              error={form.formState.errors.companyId?.message}
            >
              <select
                id="cum-company"
                className="company-user-management__select"
                {...form.register('companyId')}
                aria-invalid={Boolean(form.formState.errors.companyId)}
              >
                <option value="">
                  {t('superAdmin.selectCompany')}
                </option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField
            id="cum-email"
            label={t('companyUserManagement.forms.email')}
            error={form.formState.errors.email?.message}
          >
            <Input
              id="cum-email"
              type="email"
              {...form.register('email')}
              hasError={Boolean(form.formState.errors.email)}
            />
          </FormField>
          <FormField
            id="cum-full-name"
            label={t('companyUserManagement.forms.fullName')}
            error={form.formState.errors.fullName?.message}
          >
            <Input
              id="cum-full-name"
              {...form.register('fullName')}
              hasError={Boolean(form.formState.errors.fullName)}
            />
          </FormField>

          {creationResult && (
            <Card className="company-user-management__result-card">
              <p>
                {t('companyUserManagement.success', { email: creationResult.email })}
              </p>
              {creationResult.tempPassword && (
                <p>
                  {t('companyUserManagement.tempPassword')}{' '}
                  <strong>{creationResult.tempPassword}</strong>
                </p>
              )}
            </Card>
          )}

          <div className="modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('companyUserManagement.forms.cancel')}
            </Button>
            <Button type="submit" disabled={!form.formState.isValid}>
              {t('companyUserManagement.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title={t('companyUserManagement.resetPasswordTitle')}
        description={t('companyUserManagement.resetPasswordDescription')}
      >
        {resetResult && (
          <div className="company-user-management__result-card">
            <p>
              {t('companyUserManagement.resetPasswordSuccess', {
                email: resetResult.email,
              })}
            </p>
            <p>
              {t('companyUserManagement.tempPassword')}{' '}
              <strong>{resetResult.tempPassword}</strong>
            </p>
          </div>
        )}
        <div className="modal-form__actions">
          <Button type="button" onClick={() => setResetResult(null)}>
            {t('companyUserManagement.close')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
