import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { FormField } from '../components/ui/FormField.tsx'
import { Input } from '../components/ui/Input.tsx'
import { Modal } from '../components/ui/Modal.tsx'
import { Table, type TableColumn } from '../components/ui/Table.tsx'
import {
  fetchActionPlanItems,
  createActionPlanItem,
  updateActionPlanItem,
  deleteActionPlanItem,
  type ActionPlanItem,
  type ActionPlanStatus,
} from '../data/actionPlans.ts'
import type { WorkspaceOutletContext } from './WorkspacePage.tsx'
import './action-plans-page.css'

type ActionPlansState = {
  status: 'loading' | 'ready' | 'error'
  items: ActionPlanItem[]
  errorMessage: string | null
}

type ItemFormValues = {
  issue: string
  suggestedAction: string
  responsible: string
  deadline: string
  status: ActionPlanStatus
}

export function ActionPlansPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { companyId: routeCompanyId } = useParams<{ companyId?: string }>()
  const { session } = useOutletContext<WorkspaceOutletContext>()
  const [state, setState] = useState<ActionPlansState>({
    status: 'loading',
    items: [],
    errorMessage: null,
  })
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActionPlanItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const menuPortalRef = useRef<HTMLDivElement | null>(null)

  const updateMenuPosition = useCallback(() => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + 4, left: rect.right - 120 })
    }
  }, [])

  useEffect(() => {
    if (openMenuId === null) {
      setMenuPosition(null)
      return
    }
    const raf = requestAnimationFrame(() => {
      updateMenuPosition()
    })
    const onScrollOrResize = () => updateMenuPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [openMenuId, updateMenuPosition])

  useEffect(() => {
    if (openMenuId === null) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuButtonRef.current?.contains(target) || menuPortalRef.current?.contains(target))
        return
      setOpenMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openMenuId])

  const isAdminView = Boolean(session.isSuperAdmin && routeCompanyId)
  const effectiveCompanyId = routeCompanyId ?? session.membership?.company_id ?? null

  const itemSchema = useMemo(
    () =>
      z.object({
        issue: z.string().min(1, t('validation.required')),
        suggestedAction: z.string().min(1, t('validation.required')),
        responsible: z.string().min(1, t('validation.required')),
        deadline: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed']) as z.ZodType<ActionPlanStatus>,
      }),
    [t],
  )

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      issue: '',
      suggestedAction: '',
      responsible: '',
      deadline: '',
      status: 'pending',
    },
    mode: 'onChange',
  })

  const loadItems = useCallback(async () => {
    if (!effectiveCompanyId) {
      setState({
        status: 'error',
        items: [],
        errorMessage: isAdminView
          ? t('superAdmin.selectCompany')
          : t('superAdmin.errors.generic'),
      })
      return
    }
    try {
      const items = await fetchActionPlanItems(effectiveCompanyId)
      setState({ status: 'ready', items, errorMessage: null })
    } catch (error) {
      setState({
        status: 'error',
        items: [],
        errorMessage:
          error instanceof Error
            ? error.message
            : t('superAdmin.errors.generic'),
      })
    }
  }, [effectiveCompanyId, isAdminView, t])

  useEffect(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    loadItems()
  }, [loadItems])

  const openAddModal = () => {
    setEditingItem(null)
    form.reset({
      issue: '',
      suggestedAction: '',
      responsible: '',
      deadline: '',
      status: 'pending',
    })
    setModalOpen(true)
  }

  const openEditModal = (item: ActionPlanItem) => {
    setOpenMenuId(null)
    setEditingItem(item)
    form.reset({
      issue: item.issue,
      suggestedAction: item.suggestedAction,
      responsible: item.responsible,
      deadline: item.deadline ? item.deadline : '',
      status: item.status,
    })
    setModalOpen(true)
  }

  const requestDelete = (id: string) => {
    setOpenMenuId(null)
    setDeleteConfirmId(id)
  }

  const columns = useMemo<TableColumn<ActionPlanItem>[]>(
    () => [
      {
        key: 'issue',
        header: t('actionPlans.table.issue'),
        width: '18%',
      },
      {
        key: 'suggestedAction',
        header: t('actionPlans.table.suggestedAction'),
        width: '22%',
      },
      {
        key: 'responsible',
        header: t('actionPlans.table.responsible'),
        width: '16%',
      },
      {
        key: 'deadline',
        header: t('actionPlans.table.deadline'),
        width: '14%',
        render: (item) =>
          item.deadline
            ? new Date(item.deadline).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—',
      },
      {
        key: 'status',
        header: t('actionPlans.table.status'),
        width: '14%',
        render: (item) => (
          <span
            className={`action-plans-page__status action-plans-page__status--${item.status}`}
          >
            {t(`actionPlans.status.${item.status}`)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('actionPlans.table.actions'),
        width: '48px',
        align: 'right',
        className: 'action-plans-page__cell-actions',
        render: (item) => (
          <span className="action-plans-page__row-actions">
            <button
              type="button"
              ref={(el) => {
                if (openMenuId === item.id && el)
                  (menuButtonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el
              }}
              className="action-plans-page__kebab"
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenuId((id) => (id === item.id ? null : item.id))
              }}
              aria-label={t('actionPlans.table.actions')}
              aria-expanded={openMenuId === item.id}
              aria-haspopup="true"
            >
              <span className="action-plans-page__kebab-dot" />
              <span className="action-plans-page__kebab-dot" />
              <span className="action-plans-page__kebab-dot" />
            </button>
          </span>
        ),
      },
    ],
    [
      t,
      openMenuId,
      openEditModal,
      requestDelete,
    ],
  )

  const handleSubmit: SubmitHandler<ItemFormValues> = async (values) => {
    if (!effectiveCompanyId) return
    try {
      if (editingItem) {
        await updateActionPlanItem(editingItem.id, {
          issue: values.issue,
          suggestedAction: values.suggestedAction,
          responsible: values.responsible,
          deadline: values.deadline.trim() || null,
          status: values.status,
        })
      } else {
        await createActionPlanItem({
          companyId: effectiveCompanyId,
          issue: values.issue,
          suggestedAction: values.suggestedAction,
          responsible: values.responsible,
          deadline: values.deadline.trim() || null,
          status: values.status,
        })
      }
      setModalOpen(false)
      await loadItems()
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('superAdmin.errors.generic'),
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteActionPlanItem(id)
      setDeleteConfirmId(null)
      await loadItems()
    } catch {
      setDeleteConfirmId(null)
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
          {isAdminView && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/workspace/admin/companies')}
            >
              {t('superAdmin.back')}
            </Button>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="super-admin-page action-plans-page">
      <header className="super-admin-header">
        <div>
          {isAdminView && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                navigate(`/workspace/admin/companies/${routeCompanyId}`)
              }
            >
              {t('superAdmin.back')}
            </Button>
          )}
          <h1>{t('actionPlans.title')}</h1>
        </div>
      </header>

      <section className="action-plans-page__section">
        <h2 className="action-plans-page__section-title">
          {t('actionPlans.improvementSuggestions')}
        </h2>
        <div className="action-plans-page__cards">
          <Card className="action-plans-page__suggestion-card">
            <span className="action-plans-page__pill action-plans-page__pill--ai">
              {t('actionPlans.dummyCardAI')}
            </span>
            <p className="action-plans-page__suggestion-text">
              {t('actionPlans.dummyCardAIText')}
            </p>
          </Card>
          <Card className="action-plans-page__suggestion-card">
            <span className="action-plans-page__pill action-plans-page__pill--insight">
              {t('actionPlans.dummyCardInsight')}
            </span>
            <p className="action-plans-page__suggestion-text">
              {t('actionPlans.dummyCardInsightText')}
            </p>
          </Card>
        </div>
      </section>

      <section className="action-plans-page__section">
        <div className="action-plans-page__tracker-header">
          <h2 className="action-plans-page__section-title">
            {t('actionPlans.actionTracker')}
          </h2>
          <div className="action-plans-page__tracker-actions">
            <span className="action-plans-page__filter-label">
              <span className="action-plans-page__filter-icon" aria-hidden />
              {t('actionPlans.filter')}
            </span>
            <Button type="button" variant="ghost" onClick={openAddModal}>
              {t('actionPlans.addAction')}
            </Button>
          </div>
        </div>

        {state.items.length === 0 ? (
          <Card className="super-admin-card">
            <p>{t('actionPlans.empty')}</p>
          </Card>
        ) : (
          <Table<ActionPlanItem>
            columns={columns}
            data={state.items}
            getRowKey={(item) => item.id}
            className="action-plans-page__table"
          />
        )}
      </section>

      {openMenuId &&
        menuPosition &&
        (() => {
          const item = state.items.find((i) => i.id === openMenuId)
          if (!item) return null
          return createPortal(
            <div
              ref={menuPortalRef}
              className="action-plans-page__menu action-plans-page__menu--portal"
              role="menu"
              style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 9999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="action-plans-page__menu-item"
                onClick={() => openEditModal(item)}
              >
                {t('actionPlans.editAction')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="action-plans-page__menu-item action-plans-page__menu-item--danger"
                onClick={() => requestDelete(item.id)}
              >
                {t('actionPlans.deleteAction')}
              </button>
            </div>,
            document.body,
          )
        })()}

      {deleteConfirmId && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirmId(null)}
          title={t('actionPlans.confirmDelete')}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmId(null)}
              >
                {t('actionPlans.form.cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              >
                {t('actionPlans.confirmDeleteYes')}
              </Button>
            </>
          }
        >
          <p className="action-plans-page__confirm-text">
            {t('actionPlans.confirmDelete')}
          </p>
        </Modal>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingItem
            ? t('actionPlans.form.editTitle')
            : t('actionPlans.form.addTitle')
        }
        description={t('actionPlans.form.description')}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              {t('actionPlans.form.cancel')}
            </Button>
            <Button
              type="submit"
              form="action-plan-item-form"
              disabled={form.formState.isSubmitting}
              loading={form.formState.isSubmitting}
            >
              {t('actionPlans.form.submit')}
            </Button>
          </>
        }
      >
        <form
          className="modal-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          id="action-plan-item-form"
        >
          {form.formState.errors.root && (
            <p className="form-error">{form.formState.errors.root.message}</p>
          )}
          <FormField
            id="action-issue"
            label={t('actionPlans.form.issue')}
            error={form.formState.errors.issue?.message}
          >
            <Input
              id="action-issue"
              {...form.register('issue')}
              hasError={Boolean(form.formState.errors.issue)}
            />
          </FormField>
          <FormField
            id="action-suggested"
            label={t('actionPlans.form.suggestedAction')}
            error={form.formState.errors.suggestedAction?.message}
          >
            <Input
              id="action-suggested"
              {...form.register('suggestedAction')}
              hasError={Boolean(form.formState.errors.suggestedAction)}
            />
          </FormField>
          <FormField
            id="action-responsible"
            label={t('actionPlans.form.responsible')}
            error={form.formState.errors.responsible?.message}
          >
            <Input
              id="action-responsible"
              {...form.register('responsible')}
              hasError={Boolean(form.formState.errors.responsible)}
            />
          </FormField>
          <FormField
            id="action-deadline"
            label={t('actionPlans.form.deadline')}
            error={form.formState.errors.deadline?.message}
          >
            <Input
              id="action-deadline"
              type="date"
              {...form.register('deadline')}
              hasError={Boolean(form.formState.errors.deadline)}
            />
          </FormField>
          <FormField
            id="action-status"
            label={t('actionPlans.form.status')}
            error={form.formState.errors.status?.message}
          >
            <select
              id="action-status"
              {...form.register('status')}
              className="action-plans-page__select"
            >
              <option value="pending">{t('actionPlans.status.pending')}</option>
              <option value="in_progress">
                {t('actionPlans.status.in_progress')}
              </option>
              <option value="completed">{t('actionPlans.status.completed')}</option>
            </select>
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
