import { BarPanel } from '../components/BarPanel'
import { SectionHeader } from '../components/SectionHeader'
import { groupByMonth, groupMovements } from '../lib/aggregations'
import { formatCurrency, type Movement } from '../lib/finance'

export function AnalyticsView({ movements }: { movements: Movement[] }) {
  const incomeByCategory = groupMovements(movements, 'income')
  const expenseByCategory = groupMovements(movements, 'expense')
  const monthlyRows = groupByMonth(movements)

  return (
    <section className="ledger-section analytics-view">
      <SectionHeader title="Analisi" detail="Distribuzione per anno selezionato" />
      <div className="analytics-grid">
        <BarPanel title="Introiti per categoria" rows={incomeByCategory} tone="income" />
        <BarPanel title="Spese per categoria" rows={expenseByCategory} tone="expense" />
      </div>
      <div className="analysis-panel wide-analysis">
        <h3>Andamento mensile</h3>
        <div className="monthly-bars">
          {monthlyRows.map((row) => {
            const max = Math.max(...monthlyRows.map((item) => item.total), 1)

            return (
              <div className="month-row" key={row.label}>
                <span>{row.label}</span>
                <div>
                  <i style={{ width: `${(row.income / max) * 100}%` }} />
                  <em style={{ width: `${(row.expense / max) * 100}%` }} />
                </div>
                <strong>{formatCurrency(row.income - row.expense)}</strong>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
