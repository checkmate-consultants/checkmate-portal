import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card.tsx'

export function WorkspaceLoadingView() {
  const { t } = useTranslation()
  return (
    <div className="workspace-page">
      <Card className="workspace-card">
        <p className="workspace-subtitle">{t('onboarding.loading')}</p>
      </Card>
    </div>
  )
}
