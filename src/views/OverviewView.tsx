import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, Database, Plus } from 'lucide-react'
import { Button } from '@fluentui/react-components'
import { ChartModeSelector } from '../components/charts/ChartModeSelector'
import { MonthlyCashflowChart } from '../components/charts/MonthlyCashflowChart'
import { buildMonthlyChartRows, calculateSuggestedSafetyThreshold } from '../lib/chartData'
import { formatCurrency, formatPercent, type AppPreferences, type FiscalEstimate, type Goal, type Movement, type TaxProfile } from '../lib/finance'
import { formatDate, statusLabel } from '../lib/formatters'
import { useChartMode } from '../hooks/useChartMode'
import type { PortableDiagnostics } from '../lib/storage'
import { AppIcon } from '../components/ui/AppIcon'

export function OverviewView({
  movements,
  goals,
  profile,
  estimate,
  preferences,
  diagnostics,
  onSavePreferences,
  onGoToMovements,
  onGoToReserves,
  onGoToGoals,
  onGoToProfile,
}: {
  movements: Movement[]
  goals: Goal[]
  profile: TaxProfile
  estimate: FiscalEstimate
  preferences: AppPreferences
  diagnostics: PortableDiagnostics | null
  onSavePreferences: (preferences: AppPreferences) => Promise<void>
  onGoToMovements: () => void
  onGoToReserves: () => void
  onGoToGoals: () => void
  onGoToProfile: () => void
}) {
  const latestMovements = movements.slice(0, 5)
  const showStartPrompt = movements.length === 0
  const [chartMode, setChartMode] = useChartMode()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [thresholdInput, setThresholdInput] = useState(
    preferences.safetyThresholdAmount ? String(preferences.safetyThresholdAmount) : '',
  )
  const monthlyRows = useMemo(
    () => buildMonthlyChartRows(movements, estimate.effectiveReserveRate),
    [estimate.effectiveReserveRate, movements],
  )
  const suggestedThreshold = useMemo(
    () => calculateSuggestedSafetyThreshold(monthlyRows, estimate),
    [estimate, monthlyRows],
  )
  const activeThreshold = preferences.safetyThresholdAmount ?? suggestedThreshold
  const monthlyNetTrend = monthlyRows.map((row) => row.net)
  const monthlyIncomeTrend = monthlyRows.map((row) => row.income)

  return (
    <section className="overview-page">
      <div className="compact-metrics" aria-label="Sintesi anno">
        <Metric
          label="Disponibile stimato"
          value={formatCurrency(estimate.availableAfterReserve, true)}
          detail="Incassato meno spese pagate e accantonamenti"
          tone={estimate.availableAfterReserve < 0 ? 'danger' : 'positive'}
          trend={monthlyNetTrend}
        />
        <Metric label="Da accantonare" value={formatCurrency(estimate.totalReserve, true)} detail={`Quote fiscali/previdenziali separate (${formatPercent(estimate.effectiveReserveRate)})`} tone="warning" />
        <Metric label="Margine operativo" value={formatCurrency(estimate.grossIncome - estimate.expenses, true)} detail="Introiti incassati meno spese pagate" trend={monthlyNetTrend} />
        <Metric label="Incassato" value={formatCurrency(estimate.grossIncome, true)} detail={`Introiti incassati, ${movements.length} movimenti`} trend={monthlyIncomeTrend} />
      </div>

      {showStartPrompt ? (
        <section className="first-action-strip">
          <div>
            <AppIcon icon={Plus} size={20} />
            <span>
              <strong>Inizia a tracciare la tua attivita</strong>
              <small>Le stime diventano operative appena inserisci un introito o una spesa.</small>
            </span>
          </div>
          <Button appearance="primary" size="small" onClick={onGoToMovements}>Registra</Button>
        </section>
      ) : null}

      <div className="overview-workgrid compact">
        <section className="section-panel">
          <div className="section-panel-header slim">
            <div>
              <h2>Stato operativo</h2>
              <p>Controlli essenziali dell'anno selezionato.</p>
            </div>
          </div>
          <div className="task-list compact">
            <TaskRow done={movements.length > 0} label="Movimenti presenti" actionLabel="Registro" onAction={onGoToMovements} />
            <TaskRow done={profile.setupCompleted === true} label="Profilo fiscale configurato" actionLabel="Profilo" onAction={onGoToProfile} />
            <TaskRow done={goals.length > 0} label="Obiettivi impostati" actionLabel="Obiettivi" onAction={onGoToGoals} />
            <TaskRow done={Boolean(diagnostics)} label="Archivio locale pronto" actionLabel="Dati" onAction={onGoToProfile} />
          </div>
        </section>
        <section className="section-panel local-state-panel">
          <div className="section-panel-header slim">
            <div>
              <h2>Stato fiscale e dati</h2>
              <p>Parametri e archivio usati dai calcoli locali.</p>
            </div>
          </div>
          <dl className="definition-grid">
            <div>
              <dt>Regime</dt>
              <dd>Forfettario</dd>
            </div>
            <div>
              <dt>Coefficiente redditivita</dt>
              <dd>{formatPercent(profile.taxableCoefficient)}</dd>
            </div>
            <div>
              <dt>Imposta sostitutiva</dt>
              <dd>{formatPercent(profile.substituteTaxRate)}</dd>
            </div>
            <div>
              <dt>Archivio</dt>
              <dd>{diagnostics ? 'SQLite locale' : 'Browser locale'}</dd>
            </div>
          </dl>
          <div className="local-path-row" title={diagnostics?.databasePath ?? 'Dati locali nel browser'}>
            <AppIcon icon={Database} size={16} />
            <span>{diagnostics ? 'fondi-e-tasse.sqlite' : 'Dati locali nel browser'}</span>
          </div>
        </section>
      </div>

      <section className="section-panel reserve-strip-panel">
        <div className="section-panel-header slim">
          <div>
            <h2>Accantonamenti</h2>
            <p>Quote da tenere separate dalla disponibilita.</p>
          </div>
          <Button appearance="subtle" size="small" onClick={onGoToReserves}>Dettaglio</Button>
        </div>
        <div className="reserve-strip">
          <ReserveLine label="ENPAP soggettivo" value={estimate.pensionDue} />
          <ReserveLine label="ENPAP integrativo" value={estimate.integrativeDue} />
          <ReserveLine label="Imposta sostitutiva" value={estimate.substituteTaxDue} />
        </div>
      </section>

      <section className="section-panel chart-panel overview-chart-panel">
        <div className="section-panel-header slim">
          <div>
            <h2>Andamento anno</h2>
            <p>Lettura mensile dei movimenti registrati.</p>
          </div>
          <ChartModeSelector value={chartMode} onChange={setChartMode} />
        </div>
        <MonthlyCashflowChart activeThreshold={activeThreshold} mode={chartMode} rows={monthlyRows} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
        <div className="threshold-controls">
          <span>Soglia suggerita: <strong>{formatCurrency(suggestedThreshold)}</strong></span>
          <label>
            Soglia personalizzata
            <input
              inputMode="decimal"
              placeholder="Usa suggerita"
              value={thresholdInput}
              onChange={(event) => setThresholdInput(event.target.value)}
            />
          </label>
          <Button size="small" onClick={() => onSavePreferences({
            ...preferences,
            safetyThresholdAmount: Number(thresholdInput) > 0 ? Number(thresholdInput) : null,
          })}>
            Salva soglia
          </Button>
        </div>
      </section>

      <div className="overview-workgrid single-column">
        <section className="section-panel">
          <div className="section-panel-header">
            <div>
              <h2>Ultimi movimenti</h2>
              <p>Registro sintetico dell'anno selezionato.</p>
            </div>
            <Button appearance="subtle" size="small" onClick={onGoToMovements}>Apri registro</Button>
          </div>
          <div className="table-wrap desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrizione</th>
                  <th>Stato</th>
                  <th>Importo</th>
                </tr>
              </thead>
              <tbody>
                {latestMovements.length > 0 ? latestMovements.map((movement) => (
                  <tr key={movement.id ?? `${movement.date}-${movement.description}`}>
                    <td>{formatDate(movement.date)}</td>
                    <td>{movement.type === 'income' ? 'Introito' : 'Spesa'}</td>
                    <td>{movement.description}</td>
                    <td><span className="status-chip">{statusLabel(movement.status)}</span></td>
                    <td className={movement.type === 'income' ? 'amount-income' : 'amount-expense'}>{formatCurrency(movement.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5}>
                      <button className="inline-empty-action" type="button" onClick={onGoToMovements}>
                        Registra il primo movimento
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  detail,
  tone,
  trend,
}: {
  label: string
  value: string
  detail: string
  tone?: 'positive' | 'warning' | 'danger'
  trend?: number[]
}) {
  return (
    <article className="compact-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      {trend && trend.some((value) => value !== 0) ? <Sparkline values={trend} /> : null}
      <small>{detail}</small>
    </article>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 40 : (index / (values.length - 1)) * 80
    const y = 20 - ((value - min) / range) * 18

    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')

  return (
    <svg className="metric-sparkline" viewBox="0 0 80 22" role="img" aria-label="Andamento mensile">
      <polyline points={points} />
    </svg>
  )
}

function TaskRow({
  done,
  label,
  actionLabel,
  onAction,
}: {
  done: boolean
  label: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="task-row">
      <AppIcon icon={done ? CheckCircle2 : Circle} size={16} />
      <span>{label}</span>
      <Button appearance="subtle" size="small" onClick={onAction}>{actionLabel}</Button>
    </div>
  )
}

function ReserveLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="reserve-mini-line">
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
      <i aria-hidden="true" />
    </div>
  )
}
