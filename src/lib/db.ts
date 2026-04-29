import Dexie, { type EntityTable } from 'dexie'
import {
  defaultTaxProfile,
  type Expense,
  type Goal,
  type Income,
  type TaxProfile,
} from './finance'

type StoredTaxProfile = TaxProfile & {
  id: 'default'
}

export const db = new Dexie('funds-and-taxes') as Dexie & {
  incomes: EntityTable<Income, 'id'>
  expenses: EntityTable<Expense, 'id'>
  goals: EntityTable<Goal, 'id'>
  settings: EntityTable<StoredTaxProfile, 'id'>
}

db.version(1).stores({
  incomes: 'id, date, category',
  expenses: 'id, date, category',
  goals: 'id, targetDate',
  settings: 'id',
})

export async function loadAll() {
  await ensureDefaultSettings()

  const [incomes, expenses, goals, profile] = await Promise.all([
    db.incomes.orderBy('date').reverse().toArray(),
    db.expenses.orderBy('date').reverse().toArray(),
    db.goals.orderBy('targetDate').toArray(),
    db.settings.get('default'),
  ])

  return {
    incomes,
    expenses,
    goals,
    profile: profile ?? { ...defaultTaxProfile, id: 'default' },
  }
}

export async function ensureDefaultSettings() {
  const existing = await db.settings.get('default')

  if (!existing) {
    await db.settings.put({ ...defaultTaxProfile, id: 'default' })
  }
}

export async function saveProfile(profile: TaxProfile) {
  await db.settings.put({ ...profile, id: 'default' })
}

export async function addIncome(income: Income) {
  await db.incomes.add({ ...income, id: crypto.randomUUID() })
}

export async function addExpense(expense: Expense) {
  await db.expenses.add({ ...expense, id: crypto.randomUUID() })
}

export async function addGoal(goal: Goal) {
  await db.goals.add({ ...goal, id: crypto.randomUUID() })
}

export async function deleteRecord(
  table: 'incomes' | 'expenses' | 'goals',
  id: string,
) {
  await db[table].delete(id)
}

export async function exportBackup() {
  const payload = await loadAll()
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `fondi-tasse-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
