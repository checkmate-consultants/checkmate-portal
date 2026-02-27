import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { getSessionContext, type SessionContext } from '../lib/session.ts'
import {
  WorkspaceLoadingView,
  WorkspaceErrorView,
  WorkspaceShell,
} from './workspace/index.ts'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import './workspace-page.css'

export type { WorkspaceOutletContext } from './workspace/index.ts'

export function WorkspacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'noCompany' | 'shopperSetupError'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [session, setSession] = useState<SessionContext | null>(null)

  useEffect(() => {
    let cancelled = false
    const ensureSession = async () => {
      try {
        const context = await getSessionContext()
        if (!context.user) {
          navigate('/signin', { replace: true })
          return
        }
        if (!context.membership) {
          if (context.isSuperAdmin || context.isAccountManager) {
            if (!cancelled) {
              setSession(context)
              setStatus('ready')
              const isAdminRoute = location.pathname.startsWith('/workspace/admin')
              const isAccountRoute = location.pathname.startsWith('/workspace/account')
              if (!isAdminRoute && !isAccountRoute) {
                navigate('/workspace/admin/overview', { replace: true })
              }
            }
            return
          }
          if (context.isShopper) {
            if (!cancelled) {
              setSession(context)
              setStatus('ready')
              const isShopperRoute =
                location.pathname === '/workspace/visits' ||
                location.pathname.startsWith('/workspace/visits/') ||
                location.pathname === '/workspace/profile' ||
                location.pathname.startsWith('/workspace/account')
              if (!isShopperRoute) {
                navigate('/workspace/visits', { replace: true })
              }
            }
            return
          }
          // Shopper signup but shopper row not provisioned yet: retry session (provision shopper) so we never show "no company" to shoppers
          const isShopperSignup = context.user?.user_metadata?.signup_type === 'shopper'
          if (isShopperSignup) {
            const retry = await getSessionContext()
            if (!cancelled && retry.isShopper) {
              setSession(retry)
              setStatus('ready')
              const isShopperRoute =
                location.pathname === '/workspace/visits' ||
                location.pathname.startsWith('/workspace/visits/') ||
                location.pathname === '/workspace/profile' ||
                location.pathname.startsWith('/workspace/account')
              if (!isShopperRoute) {
                navigate('/workspace/visits', { replace: true })
              }
              return
            }
            if (!cancelled) {
              setSession(retry)
              setStatus('shopperSetupError')
            }
            return
          }
          if (!cancelled) {
            setSession(context)
            setStatus('noCompany')
          }
          return
        }
        if (!cancelled) {
          setSession(context)
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
    ensureSession()
    return () => {
      cancelled = true
    }
  }, [navigate, t, location.pathname])

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
    return <WorkspaceLoadingView />
  }

  if (status === 'error' && errorMessage) {
    return <WorkspaceErrorView message={errorMessage} />
  }

  if (status === 'noCompany') {
    return (
      <div className="workspace-page">
        <Card className="workspace-card">
          <p className="workspace-subtitle">{t('workspace.noCompany')}</p>
          <Button type="button" onClick={handleSignOut}>
            {t('workspace.signOut')}
          </Button>
        </Card>
      </div>
    )
  }

  if (status === 'shopperSetupError') {
    return (
      <div className="workspace-page">
        <Card className="workspace-card">
          <p className="workspace-subtitle">{t('workspace.shopperSetupError')}</p>
          <Button type="button" onClick={handleSignOut}>
            {t('workspace.signOut')}
          </Button>
        </Card>
      </div>
    )
  }

  if (status === 'ready' && session) {
    return (
      <WorkspaceShell
        session={session}
        isSidebarOpen={isSidebarOpen}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCloseSidebar={() => setSidebarOpen(false)}
        onSignOut={handleSignOut}
      />
    )
  }

  return <WorkspaceLoadingView />
}
