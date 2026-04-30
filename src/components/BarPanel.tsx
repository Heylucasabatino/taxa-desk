import { formatCurrency } from '../lib/finance'

export function BarPanel({
  title,
  rows,
  tone,
}: {
  title: string
  rows: Array<{ label: string; value: number }>
  tone: 'income' | 'expense'
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="analysis-panel">
      <h3>{title}</h3>
      {rows.length > 0 ? (
        rows.map((row) => (
          <div className="analysis-row" key={row.label}>
            <span>{row.label}</span>
            <div>
              <i className={tone} style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
            <strong>{formatCurrency(row.value)}</strong>
          </div>
        ))
      ) : (
        <p className="empty-text">Nessun dato disponibile.</p>
      )}
    </div>
  )
}
