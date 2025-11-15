import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { getSessionContext } from '../lib/session.ts'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx'
import './workspace-page.css'

export function WorkspacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const ensureCompany = async () => {
      try {
        const { user, membership } = await getSessionContext()
        if (!user) {
          navigate('/signin', { replace: true })
          return
        }
        if (!membership) {
          navigate('/onboarding/company', { replace: true })
          return
        }
        if (!cancelled) {
          setStatus('ready')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : t('validation.generic'),
          )
          setStatus('error')
        }
      }
    }
    ensureCompany()
    return () => {
      cancelled = true
    }
  }, [navigate, t])

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    } finally {
      navigate('/signin', { replace: true })
    }
  }

  if (status === 'loading') {
    return (
      <div className="workspace-page">
        <Card className="workspace-card">
          <p className="workspace-subtitle">{t('onboarding.loading')}</p>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="workspace-page">
        <Card className="workspace-card">
          <p className="workspace-subtitle">{errorMessage}</p>
          <Button type="button" onClick={() => navigate('/signin')}>
            {t('workspace.back')}
          </Button>
        </Card>
      </div>
    )
  }

  const closeSidebar = () => setSidebarOpen(false)
  const openSidebar = () => setSidebarOpen(true)

  return (
    <div className="workspace-shell" data-sidebar-open={isSidebarOpen}>
      <WorkspaceSidebar
        onSignOut={handleSignOut}
        onNavigate={closeSidebar}
        onClose={isSidebarOpen ? closeSidebar : undefined}
      />
      <main className="workspace-main">
        <header className="workspace-topbar">
          <button
            type="button"
            className="workspace-menu-button"
            aria-label={t('workspace.sidebar.open')}
            onClick={openSidebar}
          >
            <span />
          </button>
          <p className="workspace-topbar__title">
            {t('workspace.sidebar.company')}
          </p>
          <div className="workspace-topbar__actions">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>
        <div className="workspace-content">
          <Outlet />
        </div>
      </main>
      {isSidebarOpen && (
        <button
          type="button"
          className="workspace-sidebar-overlay"
          aria-label={t('workspace.sidebar.close')}
          onClick={closeSidebar}
        />
      )}
    </div>
  )
}

