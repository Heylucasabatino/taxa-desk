import { ReserveRows } from '../components/ReserveRows'
import { SectionHeader } from '../components/SectionHeader'
import { helpText } from '../constants/helpText'
import { formatPercent, type FiscalEstimate, type TaxProfile } from '../lib/finance'

export function ReservesView({
  estimate,
  profile,
  compact = false,
}: {
  estimate: FiscalEstimate
  profile: TaxProfile
  compact?: boolean
}) {
  return (
    <section className="ledger-section">
      <SectionHeader
        title="Accantonamenti"
        detail={compact ? 'Stima immediata' : 'Stima aggiornata in tempo reale'}
        help={helpText.reserves}
      />
      <ReserveRows estimate={estimate} />
      {estimate.grossIncome > 0 && estimate.totalReserve > estimate.grossIncome ? (
        <p className="reserve-warning">
          I minimi previdenziali configurati superano gli introiti dell’anno:
          la stima iniziale può risultare più alta dei primi incassi.
        </p>
      ) : null}
      {!compact ? (
        <p className="section-note">
          Coefficiente {formatPercent(profile.taxableCoefficient)}, imposta{' '}
          {formatPercent(profile.substituteTaxRate)}, contributi configurabili.
        </p>
      ) : null}
    </section>
  )
}
