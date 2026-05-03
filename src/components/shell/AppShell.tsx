import type { ReactNode, RefObject } from 'react'
import type { Toast } from '../../hooks/useToast'
import type { Movement } from '../../lib/finance'
import type { ActiveView } from '../../lib/routing'
import { appStorage, type PortableDiagnostics } from '../../lib/storage'
import { AppCommandBar } from './AppCommandBar'
import { AppTitleBar } from './AppTitleBar'
import { LocalStatusBar } from './LocalStatusBar'
import { NavigationPane } from './NavigationPane'
import { PageHeader } from './PageHeader'

export function AppShell({
  activeView,
  selectedYear,
  movements,
  diagnostics,
  hasUpdateAvailable,
  toast,
  backupInputRef,
  children,
  modals,
  onSelectView,
  onSetYear,
  onNewMovement,
  onExport,
  onImportFile,
}: {
  activeView: ActiveView
  selectedYear: number
  availableYears: number[]
  movements: Movement[]
  diagnostics: PortableDiagnostics | null
  hasUpdateAvailable?: boolean
  toast: Toast | null
  backupInputRef: RefObject<HTMLInputElement | null>
  children: ReactNode
  modals?: ReactNode
  onSelectView: (view: ActiveView) => void
  onSetYear: (year: number) => void
  onNewMovement: () => void
  onExport: () => void
  onImportFile: (file?: File) => void
}) {
  const storageLabel = appStorage.mode === 'tauri'
    ? 'SQLite locale'
    : 'Dati locali browser'

  return (
    <main className="ledger-app">
      <AppTitleBar />
      <NavigationPane activeView={activeView} hasUpdateAvailable={hasUpdateAvailable} onSelectView={onSelectView} />
      <section className="workspace">
        <PageHeader
          activeView={activeView}
          selectedYear={selectedYear}
          storageLabel={storageLabel}
          onSetYear={onSetYear}
        />
        <AppCommandBar
          activeView={activeView}
          onNewMovement={onNewMovement}
          onExport={onExport}
          onImport={() => backupInputRef.current?.click()}
          onGoToProfile={() => onSelectView('profile')}
        />
        {children}
        <input
          ref={backupInputRef}
          hidden
          type="file"
          accept="application/json"
          onChange={(event) => onImportFile(event.target.files?.[0])}
        />
        <LocalStatusBar diagnostics={diagnostics} movementCount={movements.length} />
      </section>
      {toast ? (
        <div className={hasUpdateAvailable ? 'toast toast-with-floating-update' : 'toast'} role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.onAction && toast.actionLabel ? (
            <button type="button" onClick={toast.onAction}>{toast.actionLabel}</button>
          ) : null}
        </div>
      ) : null}
      {modals}
    </main>
  )
}
