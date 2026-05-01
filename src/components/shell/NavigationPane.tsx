import {
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  Database,
  Home,
  SlidersHorizontal,
  Target,
  WalletCards,
} from 'lucide-react'
import type { ActiveView } from '../../lib/routing'
import { AppIcon, type AppIconComponent } from '../ui/AppIcon'

const primaryNavItems: Array<[ActiveView, string, AppIconComponent]> = [
  ['overview', 'Panoramica', Home],
  ['movements', 'Movimenti', ArrowUpFromLine],
  ['reserves', 'Accantonamenti', WalletCards],
  ['goals', 'Obiettivi', Target],
  ['deadlines', 'Scadenze', CalendarDays],
  ['analytics', 'Analisi', BarChart3],
]

const secondaryNavItems: Array<[ActiveView, string, AppIconComponent]> = [
  ['profile', 'Profilo fiscale', SlidersHorizontal],
  ['backup', 'Dati & backup', Database],
]

export function NavigationPane({
  activeView,
  onSelectView,
}: {
  activeView: ActiveView
  onSelectView: (view: ActiveView) => void
}) {
  return (
    <aside className="navigation-pane" aria-label="Navigazione principale">
      <div className="navigation-brand">
        <div className="app-mark" aria-hidden="true">TD</div>
        <div>
          <strong>Taxa Desk</strong>
          <span>Entrate, tasse, scadenze</span>
        </div>
      </div>
      <nav className="navigation-list">
        {primaryNavItems.map(([view, label, Icon]) => (
          <button
            className={activeView === view ? 'active' : ''}
            type="button"
            key={view}
            onClick={() => onSelectView(view)}
          >
            <AppIcon icon={Icon} size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <nav className="navigation-list navigation-list-secondary">
        {secondaryNavItems.map(([view, label, Icon]) => (
          <button
            className={activeView === view ? 'active' : ''}
            type="button"
            key={view}
            onClick={() => onSelectView(view)}
          >
            <AppIcon icon={Icon} size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
