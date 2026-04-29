export type TaxProfile = {
  taxableCoefficient: number
  substituteTaxRate: number
  pensionRate: number
  pensionMinimum: number
  integrativeRate: number
  integrativeMinimum: number
  activityYear: number
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
  taxableRevenue: number
  pensionDue: number
  integrativeDue: number
  substituteTaxDue: number
  totalReserve: number
  availableAfterReserve: number
  effectiveReserveRate: number
}

export const defaultTaxProfile: TaxProfile = {
  taxableCoefficient: 0.78,
  substituteTaxRate: 0.05,
  pensionRate: 0.1,
  pensionMinimum: 286,
  integrativeRate: 0.02,
  integrativeMinimum: 66,
  activityYear: 2,
}

export function sumAmounts<T extends { amount: number }>(items: T[]) {
  return items.reduce((total, item) => total + safeMoney(item.amount), 0)
}

export function estimateFiscalPosition(
  incomes: Income[],
  expenses: Expense[],
  profile: TaxProfile,
): FiscalEstimate {
  const grossIncome = sumAmounts(incomes)
  const expenseTotal = sumAmounts(expenses)
  const taxableRevenue = grossIncome * profile.taxableCoefficient
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

  return {
    grossIncome,
    expenses: expenseTotal,
    taxableRevenue,
    pensionDue,
    integrativeDue,
    substituteTaxDue,
    totalReserve,
    availableAfterReserve,
    effectiveReserveRate: grossIncome > 0 ? totalReserve / grossIncome : 0,
  }
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
    maximumFractionDigits: 0,
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
