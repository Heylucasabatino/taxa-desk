import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'

export function BackupView({
  onExport,
  onImport,
}: {
  onExport: () => void
  onImport: () => void
}) {
  return (
    <section className="ledger-section backup-view">
      <SectionHeader
        title="Dati & backup"
        detail="Portabilità locale del database"
      />
      <div className="backup-actions">
        <button className="primary-button" type="button" onClick={onExport}>
          <ArrowDownToLine size={17} />
          Esporta backup JSON
        </button>
        <button className="outline-button" type="button" onClick={onImport}>
          <ArrowUpFromLine size={17} />
          Importa backup JSON
        </button>
      </div>
      <p className="section-note">
        Il backup include movimenti, obiettivi, impostazioni fiscali e metadati di
        versione. L’import sostituisce movimenti e obiettivi locali dopo conferma.
      </p>
    </section>
  )
}
