import { describe, expect, it } from 'vitest'
import {
  defaultTaxProfile,
  estimateFiscalPosition,
  estimateGoalPlan,
  filterMovementsByYear,
  type Goal,
  type Movement,
} from './finance'

const profile = {
  ...defaultTaxProfile,
  pensionMinimum: 856,
  integrativeMinimum: 66,
  pensionRate: 0.1,
  integrativeRate: 0.02,
  substituteTaxRate: 0.05,
  taxableCoefficient: 0.78,
}

function income(amount: number, date = '2026-01-01'): Movement {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'income',
    description: 'Seduta',
    category: 'Sedute',
    amount,
    status: 'collected',
  }
}

describe('estimateFiscalPosition', () => {
  it('mantiene i minimi con zero incassi quando il flag è attivo', () => {
    const estimate = estimateFiscalPosition([], profile, 2026)

    expect(estimate.pensionDue).toBe(856)
    expect(estimate.integrativeDue).toBe(66)
  })

  it('usa il minimo quando gli incassi sono sotto soglia', () => {
    const estimate = estimateFiscalPosition([income(1000)], profile, 2026)

    expect(estimate.pensionDue).toBe(856)
    expect(estimate.integrativeDue).toBe(66)
  })

  it('usa la percentuale quando gli incassi sono sopra soglia', () => {
    const estimate = estimateFiscalPosition([income(20_000)], profile, 2026)

    expect(estimate.pensionDue).toBe(1560)
    expect(estimate.integrativeDue).toBe(400)
  })

  it('non rende negativa la sostitutiva se il soggettivo supera l’imponibile', () => {
    const estimate = estimateFiscalPosition([income(100)], profile, 2026)

    expect(estimate.taxableRevenue - estimate.pensionDue).toBeLessThan(0)
    expect(estimate.substituteTaxDue).toBe(0)
  })
})

describe('estimateGoalPlan', () => {
  const baseGoal: Goal = {
    id: 'goal',
    name: 'Obiettivo',
    targetAmount: 0,
    savedAmount: 0,
    targetDate: '2020-01-01',
  }

  it('gestisce target a zero', () => {
    const plan = estimateGoalPlan(baseGoal, profile)

    expect(plan.remaining).toBe(0)
    expect(plan.progress).toBe(0)
  })

  it('usa almeno un mese se la scadenza è passata', () => {
    const plan = estimateGoalPlan({ ...baseGoal, targetAmount: 1000 }, profile)

    expect(plan.months).toBe(1)
  })

  it('non produce residuo se il risparmiato supera il target', () => {
    const plan = estimateGoalPlan({ ...baseGoal, targetAmount: 1000, savedAmount: 1200 }, profile)

    expect(plan.remaining).toBe(0)
    expect(plan.progress).toBe(1)
  })
})

describe('filterMovementsByYear', () => {
  it('filtra correttamente date al confine anno', () => {
    const movements = [income(100, '2025-12-31'), income(100, '2026-01-01')]

    expect(filterMovementsByYear(movements, 2025)).toHaveLength(1)
    expect(filterMovementsByYear(movements, 2026)).toHaveLength(1)
  })
})
