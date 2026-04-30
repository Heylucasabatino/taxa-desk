import { DeadlineRow } from '../components/DeadlineRow'
import { SectionHeader } from '../components/SectionHeader'

export function DeadlinesView({ selectedYear }: { selectedYear: number }) {
  const enpapAdvanceDate =
    selectedYear === 2026 ? '02/03/2026' : `01/03/${selectedYear}`

  return (
    <section className="ledger-section deadlines-view">
      <SectionHeader title="Scadenze" detail="Promemoria operativo" />
      <div className="deadline-list">
        <DeadlineRow date={enpapAdvanceDate} title="ENPAP acconto contributi" />
        <DeadlineRow
          date={`30/06/${selectedYear}`}
          title="Imposte: saldo e primo acconto"
        />
        <DeadlineRow
          date={`01/10/${selectedYear}`}
          title="ENPAP comunicazione reddituale e saldo"
        />
        <DeadlineRow date={`30/11/${selectedYear}`} title="Imposte: secondo acconto" />
      </div>
      <p className="section-note">
        Le scadenze fiscali possono slittare in caso di festivi o proroghe. Verifica
        sempre con commercialista, Agenzia Entrate ed ENPAP prima del versamento.
      </p>
    </section>
  )
}
