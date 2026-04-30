import { helpText } from '../constants/helpText'
import { formatCurrency, formatPercent, type FiscalEstimate } from '../lib/finance'
import { InfoTooltip } from './InfoTooltip'

export function SummaryStrip({
  estimate,
  expenseTotal,
}: {
  estimate: FiscalEstimate
  expenseTotal: number
}) {
  return (
    <section className="summary-strip" aria-label="Sintesi fondi">
      <SummaryItem
        label="Disponibile"
        value={formatCurrency(estimate.availableAfterReserve)}
        detail="Cassa reale stimata"
        tone="positive"
        help={helpText.available}
      />
      <SummaryItem
        label="Previsionale"
        value={formatCurrency(estimate.projectedAvailableAfterReserve)}
        detail={`${formatCurrency(estimate.projectedIncome)} da incassare`}
        tone="positive"
        help={helpText.projectedAvailable}
      />
      <SummaryItem
        label="Da accantonare"
        value={formatCurrency(estimate.totalReserve)}
        detail={`${formatPercent(estimate.effectiveReserveRate)} degli incassi`}
        tone="warning"
        help={helpText.reserve}
      />
      <SummaryItem
        label="Incassato"
        value={formatCurrency(estimate.grossIncome)}
        detail="Totale lordo reale"
        help={helpText.grossIncome}
      />
      <SummaryItem
        label="Pagato"
        value={formatCurrency(expenseTotal)}
        detail={`${formatCurrency(estimate.projectedExpenses)} da pagare`}
        help={helpText.expenses}
      />
    </section>
  )
}

export function SummaryItem({
  label,
  value,
  detail,
  tone,
  help,
}: {
  label: string
  value: string
  detail: string
  tone?: 'positive' | 'warning'
  help?: string
}) {
  return (
    <article className="summary-item">
      <div>
        <span>{label}</span>
        {help ? <InfoTooltip text={help} /> : null}
      </div>
      <strong className={tone}>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}
