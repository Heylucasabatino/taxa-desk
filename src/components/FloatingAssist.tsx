import { Button } from '@fluentui/react-components'
import { ArrowDownToLine, Database, MessageSquareText } from 'lucide-react'
import type { UpdateState } from '../lib/updates'
import { AppIcon } from './ui/AppIcon'

export function FloatingAssist({
  updateState,
  onInstallUpdate,
  onOpenFeedbackPage,
  onShowUpdates,
}: {
  updateState: UpdateState
  onInstallUpdate: () => void
  onOpenFeedbackPage: () => void
  onShowUpdates: () => void
}) {
  const updateAvailable = updateState.phase === 'available'

  return (
    <div className="floating-assist" aria-label="Azioni rapide">
      {updateAvailable ? (
        <section className="floating-update" aria-label="Aggiornamento disponibile">
          <button className="floating-update-info" type="button" onClick={onShowUpdates}>
            <AppIcon icon={Database} size={16} />
            <span>
              <strong>Update {updateState.availableVersion}</strong>
              <small>Backup locale prima dell’installazione</small>
            </span>
          </button>
          <Button appearance="primary" icon={<AppIcon icon={ArrowDownToLine} size={16} />} onClick={onInstallUpdate}>
            Installa
          </Button>
        </section>
      ) : null}

      <Button
        appearance="secondary"
        className="floating-feedback-button"
        icon={<AppIcon icon={MessageSquareText} size={20} />}
        onClick={onOpenFeedbackPage}
      >
        Segnala
      </Button>
    </div>
  )
}
