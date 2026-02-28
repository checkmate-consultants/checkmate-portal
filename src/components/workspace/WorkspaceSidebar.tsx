import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import brandIcon from '../../assets/brand/icon.webp'
import brandIconLight from '../../assets/brand/icon-light.webp'
import { useTheme } from '../../theme/useTheme.ts'
import './workspace-sidebar.css'

type WorkspaceSidebarProps = {
  onNavigate?: () => void
  onClose?: () => void
  isSuperAdmin?: boolean
  isAccountManager?: boolean
  isShopper?: boolean
}

type NavItem = {
  id: string
  labelKey: string
  to: string
  disabled?: boolean
}

export function WorkspaceSidebar({
  onNavigate,
  onClose,
  isSuperAdmin = false,
  isAccountManager = false,
  isShopper = false,
}: WorkspaceSidebarProps) {
  const { t } = useTranslation()
  const { mode } = useTheme()
  const showAdminNav = isSuperAdmin || isAccountManager
  const iconSrc = mode === 'dark' ? brandIconLight : brandIcon

  const defaultHomePath =
    showAdminNav ? '/workspace/admin/overview' : isShopper ? '/workspace/visits' : '/workspace/company'
  const navItems: NavItem[] = [
    ...(isShopper
      ? [
          {
            id: 'profile',
            labelKey: 'workspace.sidebar.profile',
            to: '/workspace/account/profile',
          },
          {
            id: 'visits',
            labelKey: 'workspace.sidebar.companyVisits',
            to: '/workspace/visits',
          },
        ]
      : []),
    ...(!showAdminNav && !isShopper
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
          {
            id: 'invoices',
            labelKey: 'workspace.sidebar.invoices',
            to: '/workspace/invoices',
          },
          {
            id: 'benchmarking',
            labelKey: 'workspace.sidebar.benchmarking',
            to: '/workspace/benchmarking',
          },
          {
            id: 'action-plans',
            labelKey: 'workspace.sidebar.actionPlans',
            to: '/workspace/action-plans',
          },
        ]
      : []),
    ...(showAdminNav
      ? [
          {
            id: 'overview',
            labelKey: 'workspace.sidebar.overview',
            to: '/workspace/admin/overview',
          },
          {
            id: 'companies',
            labelKey: 'workspace.sidebar.companies',
            to: '/workspace/admin/companies',
          },
          ...(isSuperAdmin
            ? [
                {
                  id: 'shoppers',
                  labelKey: 'workspace.sidebar.shoppers',
                  to: '/workspace/admin/shoppers',
                },
                {
                  id: 'account-managers',
                  labelKey: 'workspace.sidebar.accountManagers',
                  to: '/workspace/admin/account-managers',
                },
              ]
            : []),
          {
            id: 'visits',
            labelKey: 'workspace.sidebar.visits',
            to: '/workspace/admin/visits',
          },
          {
            id: 'admin-invoices',
            labelKey: 'workspace.sidebar.invoices',
            to: '/workspace/admin/invoices',
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
      <Link
        className="workspace-sidebar__brand"
        to={defaultHomePath}
        onClick={() => onNavigate?.()}
      >
        <span className="workspace-sidebar__logo">
          <img src={iconSrc} alt={t('workspace.sidebar.logoAlt')} />
        </span>
        <div>
          <p className="workspace-sidebar__label">{t('brand.name')}</p>
          <p className="workspace-sidebar__tenant">{t('workspace.sidebar.tenant')}</p>
        </div>
      </Link>

      <nav className="workspace-sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === '/workspace'}
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
    </aside>
  )
}


