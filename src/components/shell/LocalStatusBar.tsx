import type { PortableDiagnostics } from '../../lib/storage'

export function LocalStatusBar({
  diagnostics,
  movementCount,
}: {
  diagnostics: PortableDiagnostics | null
  movementCount: number
}) {
  const archivePath = diagnostics?.databasePath ?? 'Archivio locale nel browser'
  const backupPath = diagnostics?.backupsDir ?? 'Backup JSON locale'
  const archiveLabel = diagnostics ? 'fondi-e-tasse.sqlite' : 'IndexedDB locale'
  const backupLabel = diagnostics ? 'cartella backups' : 'backup JSON locale'
  const writableLabel = diagnostics
    ? diagnostics.writable ? 'scrivibile' : 'sola lettura'
    : 'browser'

  return (
    <footer className="local-statusbar" aria-label="Stato archivio locale">
      <span title={archivePath}>SQLite locale: {archiveLabel}</span>
      <span>{writableLabel}</span>
      <span>{movementCount} movimenti</span>
      <span title={backupPath}>Backup: {backupLabel}</span>
      <span>Nessun cloud</span>
    </footer>
  )
}
