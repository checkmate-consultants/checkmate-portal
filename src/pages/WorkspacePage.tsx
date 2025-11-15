import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import './workspace-page.css'

export function WorkspacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

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

