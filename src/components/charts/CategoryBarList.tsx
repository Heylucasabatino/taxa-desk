import { formatCurrency } from '../../lib/finance'

export function CategoryBarList({
  rows,
  tone,
}: {
  rows: Array<{ label: string; value: number }>
  tone: 'income' | 'expense'
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  if (rows.length === 0) {
    return (
      <div className="analysis-empty-row">
        <span>Nessun movimento nell'anno selezionato</span>
      </div>
    )
  }

  return (
    <div className={`category-bar-list ${tone}`}>
      {rows.map((row) => (
        <div className="category-bar-row" key={row.label}>
          <span>{row.label}</span>
          <div aria-hidden="true">
            <i style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <strong>{formatCurrency(row.value)}</strong>
        </div>
      ))}
    </div>
  )
}
