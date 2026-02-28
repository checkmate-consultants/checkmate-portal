import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import type { SessionContext } from '../../lib/session.ts'
import { WorkspaceSidebar } from '../../components/workspace/WorkspaceSidebar.tsx'
import { UserAccountDropdown } from '../../components/workspace/UserAccountDropdown.tsx'

export type WorkspaceOutletContext = {
  session: SessionContext
}

type WorkspaceShellProps = {
  session: SessionContext
  isSidebarOpen: boolean
  onOpenSidebar: () => void
  onCloseSidebar: () => void
  onSignOut: () => void
}

export function WorkspaceShell({
  session,
  isSidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  onSignOut,
}: WorkspaceShellProps) {
  const { t } = useTranslation()

  return (
    <div className="workspace-shell" data-sidebar-open={isSidebarOpen}>
      <WorkspaceSidebar
        onNavigate={onCloseSidebar}
        onClose={isSidebarOpen ? onCloseSidebar : undefined}
        isSuperAdmin={session.isSuperAdmin}
        isAccountManager={session.isAccountManager}
        isShopper={session.isShopper}
      />
      <main className="workspace-main">
        <header className="workspace-topbar">
          <button
            type="button"
            className="workspace-menu-button"
            aria-label={t('workspace.sidebar.open')}
            onClick={onOpenSidebar}
          >
            <span />
          </button>
          <div className="workspace-topbar__actions">
            {session.user && (
              <UserAccountDropdown user={session.user} onSignOut={onSignOut} />
            )}
          </div>
        </header>
        <div className="workspace-content">
          <Outlet context={{ session }} />
        </div>
      </main>
      {isSidebarOpen && (
        <button
          type="button"
          className="workspace-sidebar-overlay"
          aria-label={t('workspace.sidebar.close')}
          onClick={onCloseSidebar}
        />
      )}
    </div>
  )
}
