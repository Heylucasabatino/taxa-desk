import { FirstRunGuide } from '../components/FirstRunGuide'
import { OverviewCard } from '../components/OverviewCard'
import { formatCurrency, type FiscalEstimate, type Goal, type Movement } from '../lib/finance'

export function OverviewView({
  movements,
  goals,
  estimate,
  onGoToMovements,
  onGoToReserves,
  onGoToGoals,
  onGoToProfile,
}: {
  movements: Movement[]
  goals: Goal[]
  estimate: FiscalEstimate
  onGoToMovements: () => void
  onGoToReserves: () => void
  onGoToGoals: () => void
  onGoToProfile: () => void
}) {
  return (
    <section className="overview-page">
      {movements.length === 0 && goals.length === 0 ? (
        <FirstRunGuide
          onGoToMovements={onGoToMovements}
          onGoToProfile={onGoToProfile}
        />
      ) : null}

      <div className="overview-grid">
        <OverviewCard
          title="Movimenti"
          detail="Registra introiti e spese dell’anno selezionato."
          value={`${movements.length}`}
          valueLabel={movements.length === 1 ? 'movimento' : 'movimenti'}
          actionLabel="Apri movimenti"
          onAction={onGoToMovements}
        />
        <OverviewCard
          title="Accantonamenti"
          detail="Controlla cosa non considerare spendibile."
          value={formatCurrency(estimate.totalReserve)}
          valueLabel="da congelare"
          actionLabel="Vedi accantonamenti"
          onAction={onGoToReserves}
        />
        <OverviewCard
          title="Obiettivi"
          detail="Trasforma una spesa futura in rata mensile."
          value={`${goals.length}`}
          valueLabel={goals.length === 1 ? 'obiettivo' : 'obiettivi'}
          actionLabel="Gestisci obiettivi"
          onAction={onGoToGoals}
        />
        <OverviewCard
          title="Profilo fiscale"
          detail="Rivedi aliquote, coefficienti e minimi usati nelle stime."
          value="Stime"
          valueLabel="configurabili"
          actionLabel="Apri profilo"
          onAction={onGoToProfile}
        />
      </div>
    </section>
  )
}
