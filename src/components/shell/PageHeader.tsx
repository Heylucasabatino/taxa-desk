import { ChevronLeft, ChevronRight, Database } from 'lucide-react'
import type { ActiveView } from '../../lib/routing'
import { viewTitle } from '../../lib/formatters'
import { AppIcon } from '../ui/AppIcon'

const viewSubtitles: Record<ActiveView, string> = {
  overview: 'Anno fiscale e stato operativo',
  movements: 'Registro annuale introiti e spese',
  reserves: 'Quote da non considerare spendibili',
  goals: 'Obiettivi personali e risparmio',
  deadlines: 'Promemoria fiscali e previdenziali',
  analytics: 'Lettura sintetica dei movimenti',
  profile: 'Parametri usati per le stime',
  backup: 'Archivio, backup e importazione locale',
}

export function PageHeader({
  activeView,
  selectedYear,
  storageLabel,
  onSetYear,
}: {
  activeView: ActiveView
  selectedYear: number
  storageLabel: string
  onSetYear: (year: number) => void
}) {
  return (
    <header className="page-header">
      <div className="page-title">
        <h1>{viewTitle(activeView)}</h1>
        <p>{viewSubtitles[activeView]}</p>
      </div>
      <div className="page-context">
        <div className="year-stepper" aria-label="Selezione anno fiscale">
          <button type="button" aria-label="Anno precedente" onClick={() => onSetYear(selectedYear - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="year-stepper-value" aria-label="Anno fiscale">{selectedYear}</span>
          <button type="button" aria-label="Anno successivo" onClick={() => onSetYear(selectedYear + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="local-data-badge">
          <AppIcon icon={Database} size={16} />
          {storageLabel}
        </span>
      </div>
    </header>
  )
}
