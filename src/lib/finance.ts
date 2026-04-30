export type TaxProfile = {
  taxableCoefficient: number
  substituteTaxRate: number
  pensionRate: number
  pensionMinimum: number
  integrativeRate: number
  integrativeMinimum: number
  activityYear: number
  setupCompleted?: boolean
}

export type Income = {
  id?: string
  date: string
  description: string
  amount: number
  category: string
}

export type Expense = {
  id?: string
  date: string
  description: string
  amount: number
  category: string
}

export type MovementType = 'income' | 'expense'

export type MovementStatus =
  | 'collected'
  | 'pending'
  | 'paid'
  | 'to_pay'

export type Movement = {
  id?: string
  date: string
  type: MovementType
  description: string
  category: string
  amount: number
  status: MovementStatus
  notes?: string
}

export type Goal = {
  id?: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: string
}

export type FiscalEstimate = {
  grossIncome: number
  expenses: number
  projectedIncome: number
  projectedExpenses: number
  forecastGrossIncome: number
  forecastExpenses: number
  taxableRevenue: number
  pensionDue: number
  integrativeDue: number
  substituteTaxDue: number
  totalReserve: number
  availableAfterReserve: number
  projectedAvailableAfterReserve: number
  effectiveReserveRate: number
}

export const enpapMinimums = {
  standard: 856,
  newMember: 286,
  integrative: 66,
} as const

export const defaultTaxProfile: TaxProfile = {
  taxableCoefficient: 0.78,
  substituteTaxRate: 0.05,
  pensionRate: 0.1,
  pensionMinimum: enpapMinimums.standard,
  integrativeRate: 0.02,
  integrativeMinimum: enpapMinimums.integrative,
  activityYear: 2,
  setupCompleted: false,
}

export function sumAmounts<T extends { amount: number }>(items: T[]) {
  return items.reduce((total, item) => total + safeMoney(item.amount), 0)
}

export function estimateFiscalPosition(
  movements: Movement[],
  profile: TaxProfile,
): FiscalEstimate {
  const incomes = movements.filter(
    (movement) => movement.type === 'income' && movement.status === 'collected',
  )
  const expenses = movements.filter(
    (movement) => movement.type === 'expense' && movement.status === 'paid',
  )
  const projectedIncomes = movements.filter(
    (movement) => movement.type === 'income' && movement.status === 'pending',
  )
  const projectedExpenses = movements.filter(
    (movement) => movement.type === 'expense' && movement.status === 'to_pay',
  )
  const grossIncome = sumAmounts(incomes)
  const expenseTotal = sumAmounts(expenses)
  const projectedIncome = sumAmounts(projectedIncomes)
  const projectedExpenseTotal = sumAmounts(projectedExpenses)
  const forecastGrossIncome = grossIncome + projectedIncome
  const forecastExpenses = expenseTotal + projectedExpenseTotal
  const taxableRevenue = grossIncome * profile.taxableCoefficient
  const forecastTaxableRevenue = forecastGrossIncome * profile.taxableCoefficient
  const pensionDue = grossIncome > 0
    ? Math.max(taxableRevenue * profile.pensionRate, profile.pensionMinimum)
    : 0
  const integrativeDue = grossIncome > 0
    ? Math.max(grossIncome * profile.integrativeRate, profile.integrativeMinimum)
    : 0
  const substituteTaxDue = Math.max(
    0,
    (taxableRevenue - pensionDue) * profile.substituteTaxRate,
  )
  const totalReserve = pensionDue + integrativeDue + substituteTaxDue
  const availableAfterReserve = grossIncome - expenseTotal - totalReserve
  const forecastPensionDue = forecastGrossIncome > 0
    ? Math.max(forecastTaxableRevenue * profile.pensionRate, profile.pensionMinimum)
    : 0
  const forecastIntegrativeDue = forecastGrossIncome > 0
    ? Math.max(forecastGrossIncome * profile.integrativeRate, profile.integrativeMinimum)
    : 0
  const forecastSubstituteTaxDue = Math.max(
    0,
    (forecastTaxableRevenue - forecastPensionDue) * profile.substituteTaxRate,
  )
  const forecastReserve =
    forecastPensionDue + forecastIntegrativeDue + forecastSubstituteTaxDue
  const projectedAvailableAfterReserve =
    forecastGrossIncome - forecastExpenses - forecastReserve

  return {
    grossIncome,
    expenses: expenseTotal,
    projectedIncome,
    projectedExpenses: projectedExpenseTotal,
    forecastGrossIncome,
    forecastExpenses,
    taxableRevenue,
    pensionDue,
    integrativeDue,
    substituteTaxDue,
    totalReserve,
    availableAfterReserve,
    projectedAvailableAfterReserve,
    effectiveReserveRate: grossIncome > 0 ? totalReserve / grossIncome : 0,
  }
}

export function filterMovementsByYear(movements: Movement[], year: number) {
  return movements.filter((movement) => {
    const movementYear = new Date(`${movement.date}T00:00:00`).getFullYear()

    return movementYear === year
  })
}

export function getAvailableYears(movements: Movement[], fallbackYear: number) {
  const years = new Set<number>([fallbackYear])

  for (const movement of movements) {
    const movementYear = new Date(`${movement.date}T00:00:00`).getFullYear()

    if (Number.isFinite(movementYear)) {
      years.add(movementYear)
    }
  }

  return [...years].sort((a, b) => b - a)
}

export function estimateMarginalReserveRate(profile: TaxProfile) {
  const pensionImpact = profile.taxableCoefficient * profile.pensionRate
  const taxImpact =
    (profile.taxableCoefficient - pensionImpact) * profile.substituteTaxRate

  return pensionImpact + taxImpact + profile.integrativeRate
}

export function monthsUntil(targetDate: string, now = new Date()) {
  const target = new Date(`${targetDate}T00:00:00`)

  if (Number.isNaN(target.getTime())) {
    return 1
  }

  const yearDiff = target.getFullYear() - now.getFullYear()
  const monthDiff = target.getMonth() - now.getMonth()
  const dayAdjustment = target.getDate() >= now.getDate() ? 1 : 0

  return Math.max(1, yearDiff * 12 + monthDiff + dayAdjustment)
}

export function estimateGoalPlan(goal: Goal, profile: TaxProfile) {
  const remaining = Math.max(0, safeMoney(goal.targetAmount - goal.savedAmount))
  const months = monthsUntil(goal.targetDate)
  const monthlyNet = remaining / months
  const marginalReserveRate = estimateMarginalReserveRate(profile)
  const monthlyGross = monthlyNet / Math.max(0.01, 1 - marginalReserveRate)

  return {
    remaining,
    months,
    monthlyNet,
    monthlyGross,
    marginalReserveRate,
    progress:
      goal.targetAmount > 0
        ? Math.min(1, Math.max(0, goal.savedAmount / goal.targetAmount))
        : 0,
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value || 0)
}

function safeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}
