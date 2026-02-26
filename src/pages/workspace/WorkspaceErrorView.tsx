import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'

type WorkspaceErrorViewProps = {
  message: string
}

export function WorkspaceErrorView({ message }: WorkspaceErrorViewProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="workspace-page">
      <Card className="workspace-card">
        <p className="workspace-subtitle">{message}</p>
        <Button type="button" onClick={() => navigate('/signin')}>
          {t('workspace.back')}
        </Button>
      </Card>
    </div>
  )
}
