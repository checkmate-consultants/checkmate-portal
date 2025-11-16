import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import brandIcon from '../../assets/brand/icon.webp'
import './workspace-sidebar.css'

type WorkspaceSidebarProps = {
  onSignOut: () => void
  onNavigate?: () => void
  onClose?: () => void
  isSuperAdmin?: boolean
}

type NavItem = {
  id: string
  labelKey: string
  to: string
  disabled?: boolean
}

export function WorkspaceSidebar({
  onSignOut,
  onNavigate,
  onClose,
  isSuperAdmin = false,
}: WorkspaceSidebarProps) {
  const { t } = useTranslation()
  const navItems: NavItem[] = [
    { id: 'overview', labelKey: 'workspace.sidebar.overview', to: '/workspace' },
    ...(!isSuperAdmin
      ? [
          {
            id: 'company',
            labelKey: 'workspace.sidebar.company',
            to: '/workspace/company',
          },
          {
            id: 'company-visits',
            labelKey: 'workspace.sidebar.companyVisits',
            to: '/workspace/visits',
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            id: 'companies',
            labelKey: 'workspace.sidebar.companies',
            to: '/workspace/admin/companies',
          },
          {
            id: 'shoppers',
            labelKey: 'workspace.sidebar.shoppers',
            to: '/workspace/admin/shoppers',
          },
          {
            id: 'visits',
            labelKey: 'workspace.sidebar.visits',
            to: '/workspace/admin/visits',
          },
        ]
      : []),
  ]

  return (
    <aside className="workspace-sidebar">
      {onClose && (
        <button
          type="button"
          className="workspace-sidebar__close"
          aria-label={t('workspace.sidebar.close')}
          onClick={onClose}
        >
          ×
        </button>
      )}
      <div className="workspace-sidebar__brand">
        <span className="workspace-sidebar__logo">
          <img src={brandIcon} alt={t('workspace.sidebar.logoAlt')} />
        </span>
        <div>
          <p className="workspace-sidebar__label">{t('brand.name')}</p>
          <p className="workspace-sidebar__tenant">{t('workspace.sidebar.tenant')}</p>
        </div>
      </div>

      <nav className="workspace-sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={() => {
              if (!item.disabled) {
                onNavigate?.()
              }
            }}
            className={({ isActive }) =>
              [
                'workspace-sidebar__link',
                isActive ? 'workspace-sidebar__link--active' : '',
                item.disabled ? 'workspace-sidebar__link--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : undefined}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="workspace-sidebar__footer">
        <button
          type="button"
          className="workspace-sidebar__signout"
          onClick={() => {
            onNavigate?.()
            onSignOut()
          }}
        >
          {t('workspace.signOut')}
        </button>
      </div>
    </aside>
  )
}


