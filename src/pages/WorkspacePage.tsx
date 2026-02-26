import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { getSessionContext, type SessionContext } from '../lib/session.ts'
import {
  WorkspaceLoadingView,
  WorkspaceErrorView,
  WorkspaceCreateCompanyView,
  WorkspaceShell,
} from './workspace/index.ts'
import './workspace-page.css'

export type { WorkspaceOutletContext } from './workspace/index.ts'

export function WorkspacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'needsCompany'>('loading')
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
              if (!isAdminRoute) {
                navigate('/workspace/admin/companies', { replace: true })
              }
            }
            return
          }
          if (context.isShopper) {
            if (!cancelled) {
              setSession(context)
              setStatus('ready')
              const isVisitsRoute =
                location.pathname === '/workspace/visits' ||
                location.pathname.startsWith('/workspace/visits/')
              if (!isVisitsRoute) {
                navigate('/workspace/visits', { replace: true })
              }
            }
            return
          }
          // No membership yet: try once to create company from signup metadata (in case it wasn't available on first load)
          const pendingName = (context.user?.user_metadata?.pending_company_name as string | undefined)?.trim() ?? ''
          if (pendingName.length >= 2) {
            const supabase = getSupabaseClient()
            const { error } = await supabase.rpc('create_company_with_owner', {
              company_name: pendingName,
            })
            if (!cancelled && !error) {
              await supabase.auth.updateUser({ data: { pending_company_name: null } })
              const next = await getSessionContext()
              setSession(next)
              setStatus('ready')
              return
            }
          }
          if (!cancelled) {
            setSession(context)
            setStatus('needsCompany')
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

  const handleCompanyCreated = async () => {
    const context = await getSessionContext()
    setSession(context)
    setStatus('ready')
  }

  if (status === 'loading') {
    return <WorkspaceLoadingView />
  }

  if (status === 'error' && errorMessage) {
    return <WorkspaceErrorView message={errorMessage} />
  }

  if (status === 'needsCompany') {
    return <WorkspaceCreateCompanyView onSuccess={handleCompanyCreated} />
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
