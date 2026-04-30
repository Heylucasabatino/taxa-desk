import { useState, type ReactNode, type RefObject } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Home,
  MoreHorizontal,
  SlidersHorizontal,
  Target,
  WalletCards,
} from 'lucide-react'
import type { Toast } from '../hooks/useToast'
import { formatPercent, type TaxProfile } from '../lib/finance'
import { viewTitle } from '../lib/formatters'
import type { ActiveView } from '../lib/routing'

const navItems: Array<[ActiveView, string, typeof Home]> = [
  ['overview', 'Panoramica', Home],
  ['movements', 'Movimenti', ArrowUpFromLine],
  ['reserves', 'Accantonamenti', WalletCards],
  ['goals', 'Obiettivi', Target],
  ['deadlines', 'Scadenze', CalendarDays],
  ['analytics', 'Analisi', BarChart3],
  ['profile', 'Profilo fiscale', SlidersHorizontal],
  ['backup', 'Dati & backup', Database],
]

export function AppFrame({
  activeView,
  selectedYear,
  availableYears,
  profile,
  toast,
  backupInputRef,
  children,
  modals,
  onSelectView,
  onSetYear,
  onExport,
  onImportFile,
}: {
  activeView: ActiveView
  selectedYear: number
  availableYears: number[]
  profile: TaxProfile
  toast: Toast | null
  backupInputRef: RefObject<HTMLInputElement | null>
  children: ReactNode
  modals?: ReactNode
  onSelectView: (view: ActiveView) => void
  onSetYear: (year: number) => void
  onExport: () => void
  onImportFile: (file?: File) => void
}) {
  return (
    <main className="ledger-app">
      <Sidebar activeView={activeView} onSelectView={onSelectView} />
      <section className="workspace">
        <Topbar
          activeView={activeView}
          selectedYear={selectedYear}
          availableYears={availableYears}
          backupInputRef={backupInputRef}
          onSetYear={onSetYear}
          onExport={onExport}
          onImportFile={onImportFile}
        />
        {children}
        <footer className="app-footer">
          <span>Le cifre sono stime operative basate sul profilo fiscale configurato.</span>
          {activeView === 'profile' || activeView === 'backup' ? (
            <span>
              Profilo: Forfettario {formatPercent(profile.substituteTaxRate)} ·
              Coeff. {formatPercent(profile.taxableCoefficient)}
            </span>
          ) : null}
        </footer>
      </section>
      <MobileBottomNav activeView={activeView} onSelectView={onSelectView} />
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
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

function Sidebar({
  activeView,
  onSelectView,
}: {
  activeView: ActiveView
  onSelectView: (view: ActiveView) => void
}) {
  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="sidebar-head">
        <div className="app-mark" aria-hidden="true">FT</div>
      </div>
      <nav>
        {navItems.slice(0, 6).map(([view, label, Icon]) => (
          <button className={activeView === view ? 'active' : ''} type="button" key={view} onClick={() => onSelectView(view)}>
            <Icon size={19} />
            {label}
          </button>
        ))}
      </nav>
      <div className="nav-secondary">
        {navItems.slice(6).map(([view, label, Icon]) => (
          <button className={activeView === view ? 'active' : ''} type="button" key={view} onClick={() => onSelectView(view)}>
            <Icon size={19} />
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}

function Topbar({
  activeView,
  selectedYear,
  availableYears,
  backupInputRef,
  onSetYear,
  onExport,
  onImportFile,
}: {
  activeView: ActiveView
  selectedYear: number
  availableYears: number[]
  backupInputRef: RefObject<HTMLInputElement | null>
  onSetYear: (year: number) => void
  onExport: () => void
  onImportFile: (file?: File) => void
}) {
  return (
    <header className="topbar">
      <div>
        <h1>{viewTitle(activeView)}</h1>
        <p>Dati locali nel tuo browser <span aria-hidden="true" /></p>
      </div>
      <div className="topbar-actions">
        <div className="year-stepper">
          <button type="button" aria-label="Anno precedente" onClick={() => onSetYear(selectedYear - 1)}>
            <ChevronLeft size={17} />
          </button>
          <select aria-label="Anno fiscale" value={selectedYear} onChange={(event) => onSetYear(Number(event.target.value))}>
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="button" aria-label="Anno successivo" onClick={() => onSetYear(selectedYear + 1)}>
            <ChevronRight size={17} />
          </button>
        </div>
        <button className="outline-button" type="button" onClick={onExport}>
          <ArrowDownToLine size={16} />
          Backup
        </button>
        <button className="outline-button" type="button" onClick={() => backupInputRef.current?.click()}>
          <ArrowUpFromLine size={16} />
          Importa
        </button>
        <input ref={backupInputRef} hidden type="file" accept="application/json" onChange={(event) => onImportFile(event.target.files?.[0])} />
      </div>
    </header>
  )
}

function MobileBottomNav({
  activeView,
  onSelectView,
}: {
  activeView: ActiveView
  onSelectView: (view: ActiveView) => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryViews: ActiveView[] = ['overview', 'movements', 'reserves', 'goals']
  const secondaryItems = navItems.filter(([view]) => !primaryViews.includes(view))
  const isSecondaryActive = secondaryItems.some(([view]) => view === activeView)

  function selectMobileView(view: ActiveView) {
    setMoreOpen(false)
    onSelectView(view)
  }

  return (
    <>
      {moreOpen ? (
        <div className="mobile-more-panel" role="menu">
          {secondaryItems.map(([view, label, Icon]) => (
            <button
              className={activeView === view ? 'active' : ''}
              type="button"
              key={view}
              role="menuitem"
              onClick={() => selectMobileView(view)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <nav className="mobile-bottom-nav" aria-label="Navigazione mobile">
        {navItems.filter(([view]) => primaryViews.includes(view)).map(([view, label, Icon]) => (
          <button className={activeView === view ? 'active' : ''} type="button" key={view} onClick={() => selectMobileView(view)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
        <button
          className={isSecondaryActive || moreOpen ? 'active' : ''}
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <MoreHorizontal size={18} />
          Altro
        </button>
      </nav>
    </>
  )
}
