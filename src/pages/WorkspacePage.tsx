import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { getSessionContext } from '../lib/session.ts'
import './workspace-page.css'

export function WorkspacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  return (
    <div className="workspace-page">
      <Card className="workspace-card">
        <p className="workspace-label">{t('brand.name')}</p>
        <h1>{t('workspace.title')}</h1>
        <p className="workspace-subtitle">{t('workspace.subtitle')}</p>
        <div className="workspace-actions">
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate('/signup')}
          >
            {t('workspace.back')}
          </Button>
          <Button type="button" onClick={handleSignOut}>
            {t('workspace.signOut')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

