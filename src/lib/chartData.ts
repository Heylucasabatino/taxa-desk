import type { FiscalEstimate, Movement } from './finance'

export type ChartMode = 'available' | 'cashflow' | 'reserve'

export type MonthlyChartRow = {
  label: string
  income: number
  expense: number
  reserve: number
  net: number
  cumulativeAvailable: number
}

const monthLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export function buildMonthlyChartRows(movements: Movement[], reserveRate: number): MonthlyChartRow[] {
  const rows = monthLabels.map((label) => ({
    label,
    income: 0,
    expense: 0,
    reserve: 0,
    net: 0,
    cumulativeAvailable: 0,
  }))

  for (const movement of movements) {
    const month = new Date(`${movement.date}T00:00:00`).getMonth()
    if (!Number.isFinite(month) || month < 0 || month >= rows.length) {
      continue
    }

    if (movement.type === 'income') {
      rows[month].income += movement.amount
      rows[month].reserve += movement.amount * reserveRate
    } else {
      rows[month].expense += movement.amount
    }
  }

  let runningAvailable = 0
  for (const row of rows) {
    row.net = row.income - row.expense
    runningAvailable += row.income - row.expense - row.reserve
    row.cumulativeAvailable = runningAvailable
  }

  return rows
}

export function hasMonthlyChartData(rows: MonthlyChartRow[]) {
  return rows.some((row) => row.income > 0 || row.expense > 0 || row.reserve > 0)
}

export function getMonthlyChartMax(rows: MonthlyChartRow[], mode: ChartMode) {
  let max = 1

  for (const row of rows) {
    if (mode === 'cashflow') {
      max = Math.max(max, row.income, row.expense)
    } else if (mode === 'reserve') {
      max = Math.max(max, row.reserve)
    } else {
      max = Math.max(max, Math.abs(row.cumulativeAvailable))
    }
  }

  return max
}

export function calculateSuggestedSafetyThreshold(rows: MonthlyChartRow[], estimate: FiscalEstimate) {
  const monthsWithExpenses = rows.filter((row) => row.expense > 0).length || 1
  const averagePaidExpenses = rows.reduce((sum, row) => sum + row.expense, 0) / monthsWithExpenses
  const suggested = Math.max(estimate.totalReserve, averagePaidExpenses * 2)

  return Math.ceil(suggested / 50) * 50
}
