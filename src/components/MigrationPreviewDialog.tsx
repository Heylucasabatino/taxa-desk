import { SectionHeader } from './SectionHeader'
import { formatDate } from '../lib/formatters'
import type { BackupFilePreview } from '../lib/storage'

export function MigrationPreviewDialog({
  preview,
  importing,
  onCancel,
  onConfirm,
}: {
  preview: BackupFilePreview
  importing: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-preview-title"
      >
        <SectionHeader
          title="Anteprima migrazione"
          detail={preview.sourcePath}
        />
        <dl className="import-summary">
          <div>
            <dt>Movimenti</dt>
            <dd>{preview.movements}</dd>
          </div>
          <div>
            <dt>Obiettivi</dt>
            <dd>{preview.goals}</dd>
          </div>
          <div>
            <dt>Categorie</dt>
            <dd>{preview.categories}</dd>
          </div>
          <div>
            <dt>Scadenze</dt>
            <dd>{preview.deadlines}</dd>
          </div>
          <div>
            <dt>Profilo fiscale</dt>
            <dd>{preview.hasProfile ? 'Presente' : 'Da verificare'}</dd>
          </div>
          <div>
            <dt>Esportato il</dt>
            <dd>{formatDate(preview.exportedAt.slice(0, 10))}</dd>
          </div>
        </dl>
        <p className="section-note">
          Confermando, Taxa Desk crea prima un backup locale dell’archivio attuale
          e poi sostituisce i dati con quelli del file selezionato. Il file scelto
          resta locale e non viene modificato.
        </p>
        <div className="dialog-actions">
          <button className="outline-button" type="button" onClick={onCancel} disabled={importing}>
            Annulla
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} disabled={importing}>
            {importing ? 'Importazione...' : 'Importa dati'}
          </button>
        </div>
      </section>
    </div>
  )
}
