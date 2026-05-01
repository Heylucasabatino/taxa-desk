import { useMemo, useState } from 'react'
import { CategoryBarList } from '../components/charts/CategoryBarList'
import { ChartModeSelector } from '../components/charts/ChartModeSelector'
import { MonthlyCashflowChart } from '../components/charts/MonthlyCashflowChart'
import { SectionHeader } from '../components/SectionHeader'
import { useChartMode } from '../hooks/useChartMode'
import { groupMovements } from '../lib/aggregations'
import { buildMonthlyChartRows, calculateSuggestedSafetyThreshold } from '../lib/chartData'
import { formatCurrency, type AppPreferences, type FiscalEstimate, type Movement } from '../lib/finance'

export function AnalyticsView({
  movements,
  estimate,
  preferences,
  onSavePreferences,
}: {
  movements: Movement[]
  estimate: FiscalEstimate
  preferences: AppPreferences
  onSavePreferences: (preferences: AppPreferences) => Promise<void>
}) {
  const [chartMode, setChartMode] = useChartMode()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [thresholdInput, setThresholdInput] = useState(
    preferences.safetyThresholdAmount ? String(preferences.safetyThresholdAmount) : '',
  )
  const incomeByCategory = groupMovements(movements, 'income')
  const expenseByCategory = groupMovements(movements, 'expense')
  const monthlyRows = useMemo(
    () => buildMonthlyChartRows(movements, estimate.effectiveReserveRate),
    [estimate.effectiveReserveRate, movements],
  )
  const suggestedThreshold = useMemo(
    () => calculateSuggestedSafetyThreshold(monthlyRows, estimate),
    [estimate, monthlyRows],
  )
  const activeThreshold = preferences.safetyThresholdAmount ?? suggestedThreshold

  return (
    <section className="ledger-section analytics-view">
      <SectionHeader title="Analisi" detail="Distribuzione per anno selezionato" />
      <div className="analysis-panel wide-analysis chart-panel">
        <div className="section-panel-header slim">
          <div>
            <h3>Andamento mensile</h3>
            <p>Vista configurabile sui movimenti dell'anno.</p>
          </div>
          <ChartModeSelector value={chartMode} onChange={setChartMode} />
        </div>
        <MonthlyCashflowChart activeThreshold={activeThreshold} mode={chartMode} rows={monthlyRows} selectedMonth={selectedMonth} size="large" onSelectMonth={setSelectedMonth} />
        <div className="threshold-controls">
          <span>Soglia attiva: <strong>{formatCurrency(activeThreshold)}</strong></span>
          <span>Suggerita: {formatCurrency(suggestedThreshold)}</span>
          <label>
            Personalizzata
            <input
              inputMode="decimal"
              placeholder="Usa suggerita"
              value={thresholdInput}
              onChange={(event) => setThresholdInput(event.target.value)}
            />
          </label>
          <button className="text-button compact-command" type="button" onClick={() => onSavePreferences({
            ...preferences,
            safetyThresholdAmount: Number(thresholdInput) > 0 ? Number(thresholdInput) : null,
          })}>
            Salva
          </button>
        </div>
      </div>
      <div className="analytics-grid">
        <div className="analysis-panel">
          <h3>Introiti per categoria</h3>
          <CategoryBarList rows={incomeByCategory} tone="income" />
        </div>
        <div className="analysis-panel">
          <h3>Spese per categoria</h3>
          <CategoryBarList rows={expenseByCategory} tone="expense" />
        </div>
      </div>
    </section>
  )
}
