import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOutletContext } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import {
  fetchAccountManagers,
  createAccountManager,
  removeAccountManager,
  type AccountManagerProfile,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './super-admin-account-managers-page.css'

type PageState = {
  status: 'loading' | 'ready' | 'error'
  list: AccountManagerProfile[]
  errorMessage: string | null
}

type FormValues = {
  email: string
  fullName: string
}

export function SuperAdminAccountManagersPage() {
  const { t } = useTranslation()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<PageState>({
    status: 'loading',
    list: [],
    errorMessage: null,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    email: string
    tempPassword?: string
  } | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('validation.required')).email(t('validation.email')),
        fullName: z.string(),
      }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', fullName: '' },
    mode: 'onChange',
  })

  const loadList = async () => {
    try {
      const list = await fetchAccountManagers()
      setState({ status: 'ready', list, errorMessage: null })
    } catch (error) {
      setState({
        status: 'error',
        list: [],
        errorMessage:
          error instanceof Error
            ? error.message
            : t('superAdmin.errors.generic'),
      })
    }
  }

  useEffect(() => {
    if (!session.isSuperAdmin) {
      setState({
        status: 'error',
        list: [],
        errorMessage: t('superAdmin.errors.unauthorized'),
      })
      return
    }
    loadList()
  }, [session.isSuperAdmin, t])

  const openModal = () => {
    form.reset({ email: '', fullName: '' })
    setCreationResult(null)
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const result = await createAccountManager({
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
    if (!window.confirm(t('superAdmin.accountManagers.confirmRemove'))) return
    setRemovingId(userId)
    try {
      await removeAccountManager(userId)
      await loadList()
    } catch (error) {
      console.error(error)
    } finally {
      setRemovingId(null)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{state.errorMessage}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.accountManagers.title')}</h1>
          <p>{t('superAdmin.accountManagers.subtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={openModal}>
          {t('superAdmin.accountManagers.add')}
        </Button>
      </header>

      {state.list.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.accountManagers.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table account-managers-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.accountManagers.table.name')}</span>
            <span>{t('superAdmin.accountManagers.table.email')}</span>
            <span>{t('superAdmin.accountManagers.table.actions')}</span>
          </div>
          {state.list.map((am) => (
            <div key={am.id} className="super-admin-table__row account-managers-table__row">
              <span>{am.fullName || '—'}</span>
              <span>{am.email || '—'}</span>
              <span>
                <Button
                  type="button"
                  variant="ghost"
                  className="account-managers-table__remove"
                  onClick={() => handleRemove(am.id)}
                  disabled={removingId === am.id}
                >
                  {removingId === am.id
                    ? t('superAdmin.accountManagers.removing')
                    : t('superAdmin.accountManagers.remove')}
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('superAdmin.accountManagers.forms.title')}
        description={t('superAdmin.accountManagers.forms.description')}
      >
        <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            id="am-email"
            label={t('superAdmin.accountManagers.forms.email')}
            error={form.formState.errors.email?.message}
          >
            <Input
              id="am-email"
              type="email"
              {...form.register('email')}
              hasError={Boolean(form.formState.errors.email)}
            />
          </FormField>
          <FormField
            id="am-full-name"
            label={t('superAdmin.accountManagers.forms.fullName')}
            error={form.formState.errors.fullName?.message}
          >
            <Input
              id="am-full-name"
              {...form.register('fullName')}
              hasError={Boolean(form.formState.errors.fullName)}
            />
          </FormField>

          {creationResult && (
            <Card className="account-manager-result-card">
              <p>{t('superAdmin.accountManagers.success', { email: creationResult.email })}</p>
              {creationResult.tempPassword && (
                <p>
                  {t('superAdmin.accountManagers.tempPassword')}{' '}
                  <strong>{creationResult.tempPassword}</strong>
                </p>
              )}
            </Card>
          )}

          <div className="modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('superAdmin.accountManagers.forms.cancel')}
            </Button>
            <Button type="submit" disabled={!form.formState.isValid}>
              {t('superAdmin.accountManagers.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
