import { formatCurrency, type FiscalEstimate } from '../lib/finance'

export function ReserveRows({ estimate }: { estimate: FiscalEstimate }) {
  if (estimate.totalReserve <= 0) {
    return (
      <div className="empty-ledger compact-empty">
        <strong>Accantonamenti non ancora calcolabili</strong>
        <span>Registra un introito nell’anno selezionato per stimare imposta e contributi.</span>
      </div>
    )
  }

  const rows = [
    ['Imposta sostitutiva', estimate.substituteTaxDue, estimate.substituteTaxDue * 1.65],
    ['Contributo soggettivo', estimate.pensionDue, estimate.pensionDue * 1.65],
    ['Contributo integrativo', estimate.integrativeDue, estimate.integrativeDue * 2],
  ] as const
  const max = Math.max(...rows.map(([, , projected]) => projected), 1)

  return (
    <div className="reserve-rows">
      {rows.map(([label, value, projected]) => (
        <div className="reserve-row" key={label}>
          <span>{label}</span>
          <strong>{formatCurrency(value)}</strong>
          <div className="reserve-track">
            <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
            <em style={{ width: `${Math.min(100, (projected / max) * 100)}%` }} />
          </div>
          <b>{formatCurrency(projected)}</b>
        </div>
      ))}
      <div className="reserve-total">
        <span>Totale da accantonare</span>
        <strong>{formatCurrency(estimate.totalReserve)}</strong>
      </div>
    </div>
  )
}
