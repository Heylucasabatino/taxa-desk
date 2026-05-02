import { ArrowDownToLine, ArrowUpFromLine, Database, DownloadCloud, ExternalLink, FolderOpen, MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@fluentui/react-components'
import type { PortableDiagnostics } from '../lib/storage'
import { FEEDBACK_HAS_PUBLIC_FORM, openFeedbackGithubPage, type UpdateState } from '../lib/updates'
import { AppIcon } from '../components/ui/AppIcon'

export function BackupView({
  diagnostics,
  updateState,
  onExport,
  onImport,
  onStartBackupMigration,
  onCheckUpdates,
  onInstallUpdate,
  onOpenDownloadPage,
  onOpenFeedbackPage,
}: {
  diagnostics: PortableDiagnostics | null
  updateState: UpdateState
  onExport: () => void
  onImport: () => void
  onStartBackupMigration: () => void
  onCheckUpdates: () => void
  onInstallUpdate: () => void
  onOpenDownloadPage: () => void
  onOpenFeedbackPage: () => void
}) {
  const busy = ['checking', 'backup', 'downloading', 'installing'].includes(updateState.phase)
  const canInstall = updateState.phase === 'available'

  return (
    <section className="backup-view dense-view">
      <div className="section-panel">
        <div className="section-panel-header">
          <div>
            <h2>Archivio SQLite</h2>
            <p>Dati salvati in locale, senza backend, account o telemetria.</p>
          </div>
          <span className="integrity-badge">
            <AppIcon icon={ShieldCheck} size={16} />
            {diagnostics?.writable === false ? 'Da verificare' : 'Integro'}
          </span>
        </div>
        <dl className="backup-definition-list">
          <div>
            <dt>Modalita</dt>
            <dd>{diagnostics ? 'Tauri portable' : 'Browser locale'}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd title={diagnostics?.databasePath ?? 'Archivio IndexedDB locale'}>{diagnostics?.databasePath ?? 'Archivio IndexedDB locale'}</dd>
          </div>
          <div>
            <dt>Cartella dati</dt>
            <dd title={diagnostics?.dataDir ?? 'Non disponibile nel browser'}>{diagnostics?.dataDir ?? 'Non disponibile nel browser'}</dd>
          </div>
          <div>
            <dt>Scrittura</dt>
            <dd>{diagnostics ? diagnostics.writable ? 'Disponibile' : 'Non disponibile' : 'Gestita dal browser'}</dd>
          </div>
        </dl>
      </div>

      <div className="backup-grid">
        <section className="section-panel">
          <div className="section-panel-header">
            <div>
              <h2>Backup locali</h2>
              <p>Esporta un file JSON ripristinabile dopo conferma.</p>
            </div>
          </div>
          <div className="backup-action-list">
            <Button appearance="primary" icon={<AppIcon icon={ArrowDownToLine} size={16} />} onClick={onExport}>
              Crea backup JSON
            </Button>
            <Button appearance="secondary" icon={<AppIcon icon={ArrowUpFromLine} size={16} />} onClick={onImport}>
              Importa backup JSON
            </Button>
          </div>
          <dl className="backup-definition-list compact">
            <div>
              <dt>Cartella backup</dt>
              <dd title={diagnostics?.backupsDir ?? 'Download del browser'}>{diagnostics?.backupsDir ?? 'Download del browser'}</dd>
            </div>
            <div>
              <dt>Contenuto</dt>
              <dd>Movimenti, obiettivi, profilo fiscale, categorie</dd>
            </div>
          </dl>
        </section>

        <section className="section-panel">
          <div className="section-panel-header">
            <div>
              <h2>Cartelle locali</h2>
              <p>Percorsi della distribuzione portable.</p>
            </div>
          </div>
          <div className="local-folder-list">
            <FolderRow icon={Database} label="Database" value={diagnostics?.databasePath ?? 'Non disponibile'} />
            <FolderRow icon={FolderOpen} label="Backup" value={diagnostics?.backupsDir ?? 'Non disponibile'} />
            <FolderRow icon={FolderOpen} label="Log" value={diagnostics?.logsDir ?? 'Non disponibile'} />
          </div>
        </section>
      </div>

      <section className="section-panel migration-panel">
        <div className="section-panel-header">
          <div>
            <h2>Migrazione dati</h2>
            <p>Porta nell’installazione attuale un backup creato da una precedente cartella portable.</p>
          </div>
        </div>
        <p className="feedback-privacy">
          La migrazione legge solo il file locale scelto da te. Prima dell’import Taxa Desk crea un backup dell’archivio attuale.
        </p>
        <div className="backup-action-list">
          <Button appearance="primary" icon={<AppIcon icon={ArrowUpFromLine} size={16} />} onClick={onStartBackupMigration}>
            Importa dati da backup
          </Button>
        </div>
      </section>

      <section className="section-panel feedback-panel">
        <div className="section-panel-header">
          <div>
            <h2>Feedback beta</h2>
            <p>Taxa Desk è gratuito in beta. Le segnalazioni reali aiutano a scegliere cosa migliorare.</p>
          </div>
        </div>
        <p className="feedback-privacy">
          Il feedback apre una pagina esterna. Non allegare backup, database SQLite o dati fiscali reali.
        </p>
        <div className="backup-action-list">
          <Button appearance="secondary" icon={<AppIcon icon={MessageSquareText} size={16} />} onClick={onOpenFeedbackPage}>
            Invia feedback
          </Button>
          {FEEDBACK_HAS_PUBLIC_FORM ? (
            <Button appearance="subtle" icon={<AppIcon icon={ExternalLink} size={16} />} onClick={() => { void openFeedbackGithubPage() }}>
              Apri issue tecnica su GitHub
            </Button>
          ) : null}
        </div>
      </section>

      <section className="section-panel update-panel">
        <div className="section-panel-header">
          <div>
            <h2>Aggiornamenti</h2>
            <p>Controllo manuale, nessun aggiornamento silenzioso.</p>
          </div>
          <span className={`update-state-badge ${updateState.phase}`}>{getUpdateLabel(updateState)}</span>
        </div>

        <dl className="backup-definition-list update-definition-list">
          <div>
            <dt>Versione installata</dt>
            <dd>{updateState.currentVersion}</dd>
          </div>
          <div>
            <dt>Canale</dt>
            <dd>{updateState.channel === 'portable' ? 'Portable' : updateState.channel === 'installer' ? 'Installer' : 'Da verificare'}</dd>
          </div>
          <div>
            <dt>Nuova versione</dt>
            <dd>{getAvailableVersionLabel(updateState)}</dd>
          </div>
          <div>
            <dt>Backup pre-update</dt>
            <dd title={updateState.backupPath ?? 'Creato solo prima dell’installazione'}>{updateState.backupPath ?? 'Creato prima di installare'}</dd>
          </div>
        </dl>

        {updateState.changelog ? (
          <div className="update-notes">
            <strong>Note versione</strong>
            <p>{updateState.changelog}</p>
          </div>
        ) : null}

        {updateState.error ? <p className="update-error">{updateState.error}</p> : null}

        <p className="update-privacy">
          Il controllo aggiornamenti scarica solo informazioni sulla versione. Nel canale portable l’app scarica il pacchetto, crea un backup locale e sostituisce solo i file applicativi. I dati dell’archivio restano sul dispositivo.
        </p>

        <div className="backup-action-list">
          <Button appearance="secondary" icon={<AppIcon icon={RefreshCw} size={16} />} disabled={busy} onClick={onCheckUpdates}>
            Verifica aggiornamenti
          </Button>
          {canInstall ? (
            <Button appearance="primary" icon={<AppIcon icon={DownloadCloud} size={16} />} onClick={onInstallUpdate}>
              Scarica e installa
            </Button>
          ) : null}
          <Button appearance="subtle" icon={<AppIcon icon={ExternalLink} size={16} />} onClick={onOpenDownloadPage}>
            Apri pagina download
          </Button>
        </div>
      </section>
    </section>
  )
}

function getAvailableVersionLabel(updateState: UpdateState) {
  if (updateState.availableVersion) return updateState.availableVersion
  if (updateState.phase === 'none') return 'Nessuna'
  if (updateState.phase === 'checking') return 'Verifica in corso'
  return 'Non verificata'
}

function getUpdateLabel(updateState: UpdateState) {
  switch (updateState.phase) {
    case 'checking':
      return 'Verifica in corso'
    case 'none':
      return 'Nessun aggiornamento'
    case 'available':
      return 'Disponibile'
    case 'backup':
      return 'Backup in corso'
    case 'downloading':
      return 'Download in corso'
    case 'installing':
      return 'Installazione'
    case 'installed':
      return 'Installato'
    case 'unsupported':
      return 'Solo app desktop'
    case 'error':
      return 'Errore'
    default:
      return 'Da verificare'
  }
}

function FolderRow({
  icon,
  label,
  value,
}: {
  icon: typeof Database
  label: string
  value: string
}) {
  return (
    <div className="folder-row">
      <AppIcon icon={icon} size={16} />
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  )
}
