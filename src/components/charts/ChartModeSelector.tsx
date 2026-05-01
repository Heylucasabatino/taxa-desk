import type { ChartMode } from '../../lib/chartData'

const labels: Record<ChartMode, string> = {
  available: 'Disponibile',
  cashflow: 'Introiti/spese',
  reserve: 'Accantonamenti',
}

export function ChartModeSelector({
  value,
  onChange,
}: {
  value: ChartMode
  onChange: (value: ChartMode) => void
}) {
  return (
    <div className="chart-mode-selector" role="group" aria-label="Modalita grafico">
      {(Object.keys(labels) as ChartMode[]).map((mode) => (
        <button
          aria-pressed={value === mode}
          className={value === mode ? 'active' : undefined}
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  )
}
