import type { BackupPayload } from '../lib/db'
import { getAvailableYears } from '../lib/finance'
import { formatDate } from '../lib/formatters'
import { SectionHeader } from './SectionHeader'

export type PendingImport = {
  fileName: string
  payload: BackupPayload
}

const currentYear = new Date().getFullYear()

export function ImportPreviewDialog({
  pendingImport,
  onCancel,
  onConfirm,
}: {
  pendingImport: PendingImport
  onCancel: () => void
  onConfirm: () => void
}) {
  const { payload } = pendingImport
  const years = getAvailableYears(payload.movements, currentYear).join(', ')
  const exportedAt = formatDate(payload.meta.exportedAt.slice(0, 10))

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
      >
        <SectionHeader
          title="Anteprima import"
          detail={pendingImport.fileName}
        />
        <dl className="import-summary">
          <div>
            <dt>Movimenti</dt>
            <dd>{payload.movements.length}</dd>
          </div>
          <div>
            <dt>Obiettivi</dt>
            <dd>{payload.goals.length}</dd>
          </div>
          <div>
            <dt>Anni inclusi</dt>
            <dd>{years}</dd>
          </div>
          <div>
            <dt>Esportato il</dt>
            <dd>{exportedAt}</dd>
          </div>
        </dl>
        <p className="section-note">
          Confermando, movimenti e obiettivi locali verranno sostituiti con il
          contenuto di questo backup. Il profilo fiscale verrà aggiornato con
          quello del file.
        </p>
        <div className="dialog-actions">
          <button className="outline-button" type="button" onClick={onCancel}>
            Annulla
          </button>
          <button className="primary-button" type="button" onClick={onConfirm}>
            Importa backup
          </button>
        </div>
      </section>
    </div>
  )
}
