import { formatCurrency } from '../../lib/finance'
import {
  getMonthlyChartMax,
  hasMonthlyChartData,
  type ChartMode,
  type MonthlyChartRow,
} from '../../lib/chartData'

const chartWidth = 720
const compactHeight = 104
const largeHeight = 230
const compactPlotTop = 14
const largePlotTop = 24
const compactPlotBottom = 24
const largePlotBottom = 30

export function MonthlyCashflowChart({
  activeThreshold,
  onSelectMonth,
  rows,
  selectedMonth,
  mode,
  size = 'compact',
}: {
  activeThreshold?: number
  onSelectMonth?: (index: number) => void
  rows: MonthlyChartRow[]
  selectedMonth?: number
  mode: ChartMode
  size?: 'compact' | 'large'
}) {
  const hasData = hasMonthlyChartData(rows)
  const height = size === 'large' ? largeHeight : compactHeight
  const plotTop = size === 'large' ? largePlotTop : compactPlotTop
  const plotBottom = size === 'large' ? largePlotBottom : compactPlotBottom
  const plotHeight = height - plotTop - plotBottom
  const max = Math.max(getMonthlyChartMax(rows, mode), activeThreshold ?? 0)
  const zeroY = mode === 'available'
    ? plotTop + (plotHeight / 2)
    : plotTop + plotHeight
  const selectedRow = rows[selectedMonth ?? rows.findIndex((row) => row.income > 0 || row.expense > 0)] ?? rows[0]

  if (!hasData) {
    return (
      <div className={`monthly-chart monthly-chart-${size} empty`}>
        <span>Aggiungi movimenti per vedere l'andamento annuale.</span>
      </div>
    )
  }

  return (
    <figure className={`monthly-chart monthly-chart-${size}`}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} role="img" aria-label={getChartLabel(mode)}>
        {mode === 'available' && activeThreshold && activeThreshold > 0 ? (
          <ThresholdLine max={max} plotHeight={plotHeight} plotTop={plotTop} threshold={activeThreshold} zeroY={zeroY} />
        ) : null}
        <line className="chart-axis" x1="24" x2="696" y1={zeroY} y2={zeroY} />
        {rows.map((row, index) => (
          <MonthMark
            active={selectedMonth === index}
            index={index}
            key={row.label}
            max={max}
            mode={mode}
            onSelectMonth={onSelectMonth}
            plotHeight={plotHeight}
            plotTop={plotTop}
            row={row}
            threshold={activeThreshold}
            zeroY={zeroY}
          />
        ))}
      </svg>
      {selectedRow ? (
        <figcaption className="chart-month-summary">
          <strong>{selectedRow.label}</strong>
          <span>Introiti {formatCurrency(selectedRow.income)}</span>
          <span>Spese {formatCurrency(selectedRow.expense)}</span>
          <span>Accantonamento {formatCurrency(selectedRow.reserve)}</span>
          <span>Disponibile {formatCurrency(selectedRow.cumulativeAvailable)}</span>
        </figcaption>
      ) : null}
    </figure>
  )
}

function MonthMark({
  active,
  index,
  max,
  mode,
  onSelectMonth,
  plotHeight,
  plotTop,
  row,
  threshold,
  zeroY,
}: {
  active: boolean
  index: number
  max: number
  mode: ChartMode
  onSelectMonth?: (index: number) => void
  plotHeight: number
  plotTop: number
  row: MonthlyChartRow
  threshold?: number
  zeroY: number
}) {
  const slot = 672 / 12
  const x = 24 + (index * slot) + (slot / 2)
  const labelY = plotTop + plotHeight + 22
  const handleSelect = () => onSelectMonth?.(index)

  if (mode === 'cashflow') {
    const incomeHeight = row.income > 0 ? Math.max(2, (row.income / max) * plotHeight) : 0
    const expenseHeight = row.expense > 0 ? Math.max(2, (row.expense / max) * plotHeight) : 0

    return (
      <g className={active ? 'chart-month active' : 'chart-month'} onClick={handleSelect} onMouseEnter={handleSelect}>
        <title>{`${row.label}: introiti ${formatCurrency(row.income)}, spese ${formatCurrency(row.expense)}`}</title>
        <rect className="chart-hit-area" height={plotHeight + 30} width={slot} x={x - slot / 2} y={plotTop} />
        <rect className="chart-bar income" height={incomeHeight} rx="2" width="8" x={x - 9} y={zeroY - incomeHeight} />
        <rect className="chart-bar expense" height={expenseHeight} rx="2" width="8" x={x + 1} y={zeroY - expenseHeight} />
        <text className="chart-month-label" textAnchor="middle" x={x - 4} y={labelY}>{row.label}</text>
      </g>
    )
  }

  if (mode === 'reserve') {
    const reserveHeight = row.reserve > 0 ? Math.max(2, (row.reserve / max) * plotHeight) : 0

    return (
      <g className={active ? 'chart-month active' : 'chart-month'} onClick={handleSelect} onMouseEnter={handleSelect}>
        <title>{`${row.label}: accantonamento stimato ${formatCurrency(row.reserve)}`}</title>
        <rect className="chart-hit-area" height={plotHeight + 30} width={slot} x={x - slot / 2} y={plotTop} />
        <rect className="chart-bar reserve" height={reserveHeight} rx="2" width="12" x={x - 6} y={zeroY - reserveHeight} />
        <text className="chart-month-label" textAnchor="middle" x={x} y={labelY}>{row.label}</text>
      </g>
    )
  }

  const value = row.cumulativeAvailable
  const netHeight = value !== 0 ? Math.max(2, (Math.abs(value) / max) * (plotHeight / 2)) : 0
  const positive = value >= 0
  const y = positive ? zeroY - netHeight : zeroY
  const belowThreshold = typeof threshold === 'number' && value < threshold

  return (
    <g className={active ? 'chart-month active' : 'chart-month'} onClick={handleSelect} onMouseEnter={handleSelect}>
      <title>{`${row.label}: disponibile stimata ${formatCurrency(value)}`}</title>
      <rect className="chart-hit-area" height={plotHeight + 30} width={slot} x={x - slot / 2} y={plotTop} />
      <rect className={`chart-bar ${belowThreshold ? 'net-warning' : positive ? 'net-positive' : 'net-negative'}`} height={netHeight} rx="2" width="14" x={x - 7} y={y} />
      <text className="chart-month-label" textAnchor="middle" x={x} y={labelY}>{row.label}</text>
    </g>
  )
}

function ThresholdLine({
  max,
  plotHeight,
  plotTop,
  threshold,
  zeroY,
}: {
  max: number
  plotHeight: number
  plotTop: number
  threshold: number
  zeroY: number
}) {
  const y = zeroY - ((threshold / max) * (plotHeight / 2))
  const clampedY = Math.max(plotTop, Math.min(plotTop + plotHeight, y))

  return (
    <g className="chart-threshold">
      <rect height={Math.max(0, plotTop + plotHeight - clampedY)} width="672" x="24" y={clampedY} />
      <line x1="24" x2="696" y1={clampedY} y2={clampedY} />
      <text x="28" y={Math.max(12, clampedY - 5)} textAnchor="start">
        Soglia {formatCurrency(threshold)}
      </text>
    </g>
  )
}

function getChartLabel(mode: ChartMode) {
  if (mode === 'cashflow') {
    return 'Andamento mensile introiti e spese'
  }

  if (mode === 'reserve') {
    return 'Andamento mensile accantonamenti stimati'
  }

  return 'Andamento mensile della disponibilita stimata'
}
