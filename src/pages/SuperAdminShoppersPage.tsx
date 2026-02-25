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
  fetchShoppers,
  createShopper,
  type Shopper,
} from '../data/companyManagement.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import { usePageMetadata } from '../hooks/usePageMetadata.ts'
import './super-admin-shoppers-page.css'

type ShopperState = {
  status: 'loading' | 'ready' | 'error'
  shoppers: Shopper[]
  errorMessage: string | null
}

type ShopperFormValues = {
  fullName: string
  email: string
}

export function SuperAdminShoppersPage() {
  const { t } = useTranslation()
  usePageMetadata(
    `${t('meta.superAdminShoppers.title')} | ${t('brand.name')}`,
    t('meta.superAdminShoppers.description'),
  )
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [shopperState, setShopperState] = useState<ShopperState>({
    status: 'loading',
    shoppers: [],
    errorMessage: null,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    email: string
    password: string
  } | null>(null)

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t('validation.nameLength')),
        email: z.string().email(t('validation.email')),
      }),
    [t],
  )

  const form = useForm<ShopperFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
    },
    mode: 'onChange',
  })

  const loadShoppers = async () => {
    try {
      const shoppers = await fetchShoppers()
      setShopperState({ status: 'ready', shoppers, errorMessage: null })
    } catch (error) {
      setShopperState({
        status: 'error',
        shoppers: [],
        errorMessage:
          error instanceof Error
            ? error.message
            : t('superAdmin.errors.generic'),
      })
    }
  }

  useEffect(() => {
    if (!session.isSuperAdmin) {
      setShopperState({
        status: 'error',
        shoppers: [],
        errorMessage: t('superAdmin.errors.unauthorized'),
      })
      return
    }
    loadShoppers()
  }, [session.isSuperAdmin, t])

  const openModal = async () => {
    form.reset({ fullName: '', email: '' })
    setCreationResult(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
  }

  const onSubmit: SubmitHandler<ShopperFormValues> = async (values) => {
    const result = await createShopper({
      fullName: values.fullName,
      email: values.email,
    })
    setCreationResult({
      email: values.email,
      password: result.tempPassword,
    })
    await loadShoppers()
    form.reset({ fullName: '', email: '' })
  }

  if (shopperState.status === 'loading') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{t('superAdmin.loading')}</p>
        </Card>
      </div>
    )
  }

  if (shopperState.status === 'error') {
    return (
      <div className="super-admin-page">
        <Card className="super-admin-card">
          <p>{shopperState.errorMessage}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="super-admin-page">
      <header className="super-admin-header">
        <div>
          <p className="super-admin-eyebrow">{t('superAdmin.eyebrow')}</p>
          <h1>{t('superAdmin.shoppers.title')}</h1>
          <p>{t('superAdmin.shoppers.subtitle')}</p>
        </div>
        <Button type="button" variant="ghost" onClick={openModal}>
          {t('superAdmin.shoppers.newShopper')}
        </Button>
      </header>

      {shopperState.shoppers.length === 0 ? (
        <Card className="super-admin-card">
          <p>{t('superAdmin.shoppers.empty')}</p>
        </Card>
      ) : (
        <div className="super-admin-table shoppers-table">
          <div className="super-admin-table__head">
            <span>{t('superAdmin.shoppers.table.name')}</span>
            <span>{t('superAdmin.shoppers.table.email')}</span>
            <span>{t('superAdmin.shoppers.table.created')}</span>
          </div>
          {shopperState.shoppers.map((shopper) => (
            <div key={shopper.id} className="super-admin-table__row shoppers-table__row">
              <span>{shopper.fullName}</span>
              <span>{shopper.email}</span>
              <span>
                {new Date(shopper.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('superAdmin.shoppers.forms.title')}
        description={t('superAdmin.shoppers.forms.description')}
      >
        <form className="modal-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            id="shopper-full-name"
            label={t('superAdmin.shoppers.forms.fullName')}
            error={form.formState.errors.fullName?.message}
          >
            <Input
              id="shopper-full-name"
              {...form.register('fullName')}
              hasError={Boolean(form.formState.errors.fullName)}
            />
          </FormField>

          <FormField
            id="shopper-email"
            label={t('superAdmin.shoppers.forms.email')}
            error={form.formState.errors.email?.message}
          >
            <Input
              id="shopper-email"
              type="email"
              {...form.register('email')}
              hasError={Boolean(form.formState.errors.email)}
            />
          </FormField>

          {creationResult && (
            <Card className="shopper-result-card">
              <p>{t('superAdmin.shoppers.success', { email: creationResult.email })}</p>
              <p>
                {t('superAdmin.shoppers.tempPassword')}{' '}
                <strong>{creationResult.password}</strong>
              </p>
            </Card>
          )}

          <div className="modal-form__actions">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {t('superAdmin.shoppers.forms.cancel')}
            </Button>
            <Button type="submit" disabled={!form.formState.isValid}>
              {t('superAdmin.shoppers.forms.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


