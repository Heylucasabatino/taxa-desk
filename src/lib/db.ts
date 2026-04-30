import Dexie, { type EntityTable } from 'dexie'
import {
  defaultTaxProfile,
  type Expense,
  type Goal,
  type Income,
  type Movement,
  type TaxProfile,
} from './finance'

type StoredTaxProfile = TaxProfile & {
  id: 'default'
}

export type BackupPayload = {
  meta: {
    app: 'fondi-e-tasse'
    version: 2
    exportedAt: string
  }
  movements: Movement[]
  goals: Goal[]
  settings: StoredTaxProfile
}

export const db = new Dexie('funds-and-taxes') as Dexie & {
  incomes: EntityTable<Income, 'id'>
  expenses: EntityTable<Expense, 'id'>
  movements: EntityTable<Movement, 'id'>
  goals: EntityTable<Goal, 'id'>
  settings: EntityTable<StoredTaxProfile, 'id'>
}

db.version(1).stores({
  incomes: 'id, date, category',
  expenses: 'id, date, category',
  goals: 'id, targetDate',
  settings: 'id',
})

db.version(2).stores({
  incomes: 'id, date, category',
  expenses: 'id, date, category',
  movements: 'id, date, type, category, status',
  goals: 'id, targetDate',
  settings: 'id',
})

export async function ensureDefaultSettings() {
  const existing = await db.settings.get('default')

  if (!existing) {
    await db.settings.put({ ...defaultTaxProfile, id: 'default' })
  }
}

export async function ensureMovementMigration() {
  await ensureDefaultSettings()

  const movementCount = await db.movements.count()

  if (movementCount > 0) {
    return
  }

  const [incomes, expenses] = await Promise.all([
    db.incomes.toArray(),
    db.expenses.toArray(),
  ])

  const migratedMovements: Movement[] = [
    ...incomes.map((income) => ({
      id: income.id ?? crypto.randomUUID(),
      date: income.date,
      type: 'income' as const,
      description: income.description,
      category: income.category,
      amount: income.amount,
      status: 'collected' as const,
      notes: '',
    })),
    ...expenses.map((expense) => ({
      id: expense.id ?? crypto.randomUUID(),
      date: expense.date,
      type: 'expense' as const,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      status: 'paid' as const,
      notes: '',
    })),
  ]

  if (migratedMovements.length > 0) {
    await db.movements.bulkPut(migratedMovements)
  }
}

export async function saveProfile(profile: TaxProfile) {
  await db.settings.put({ ...profile, id: 'default' })
}

export async function addMovement(movement: Movement) {
  await db.movements.add({ ...movement, id: crypto.randomUUID() })
}

export async function addGoal(goal: Goal) {
  await db.goals.add({ ...goal, id: crypto.randomUUID() })
}

export async function deleteRecord(table: 'movements' | 'goals', id: string) {
  await db[table].delete(id)
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  await ensureMovementMigration()

  const [movements, goals, profile] = await Promise.all([
    db.movements.orderBy('date').reverse().toArray(),
    db.goals.orderBy('targetDate').toArray(),
    db.settings.get('default'),
  ])

  return {
    meta: {
      app: 'fondi-e-tasse',
      version: 2,
      exportedAt: new Date().toISOString(),
    },
    movements,
    goals,
    settings: profile ?? { ...defaultTaxProfile, id: 'default' },
  }
}

export async function exportBackup() {
  const payload = await buildBackupPayload()
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

export async function importBackup(payload: unknown) {
  const parsed = parseBackupPayload(payload)

  await db.transaction('rw', db.movements, db.goals, db.settings, async () => {
    await Promise.all([db.movements.clear(), db.goals.clear()])
    await db.movements.bulkPut(parsed.movements)
    await db.goals.bulkPut(parsed.goals)
    await db.settings.put(parsed.settings)
  })
}

export function parseBackupPayload(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup non valido.')
  }

  const candidate = payload as Partial<BackupPayload> & {
    incomes?: Income[]
    expenses?: Expense[]
    profile?: StoredTaxProfile
  }

  if (Array.isArray(candidate.movements)) {
    return {
      meta: {
        app: 'fondi-e-tasse',
        version: 2,
        exportedAt: new Date().toISOString(),
      },
      movements: candidate.movements.map(normalizeMovement),
      goals: Array.isArray(candidate.goals) ? candidate.goals.map(normalizeGoal) : [],
      settings: normalizeSettings(candidate.settings),
    }
  }

  const legacyMovements: Movement[] = [
    ...(candidate.incomes ?? []).map((income) =>
      normalizeMovement({
        ...income,
        type: 'income',
        status: 'collected',
      }),
    ),
    ...(candidate.expenses ?? []).map((expense) =>
      normalizeMovement({
        ...expense,
        type: 'expense',
        status: 'paid',
      }),
    ),
  ]

  if (legacyMovements.length > 0) {
    return {
      meta: {
        app: 'fondi-e-tasse',
        version: 2,
        exportedAt: new Date().toISOString(),
      },
      movements: legacyMovements,
      goals: Array.isArray(candidate.goals) ? candidate.goals.map(normalizeGoal) : [],
      settings: normalizeSettings(candidate.profile ?? candidate.settings),
    }
  }

  throw new Error('Il file non contiene movimenti importabili.')
}

function normalizeMovement(movement: Partial<Movement>): Movement {
  const type = movement.type === 'expense' ? 'expense' : 'income'

  return {
    id: movement.id ?? crypto.randomUUID(),
    date: movement.date ?? new Date().toISOString().slice(0, 10),
    type,
    description: movement.description ?? 'Movimento',
    category: movement.category ?? 'Altro',
    amount: Number(movement.amount) || 0,
    status:
      movement.status ??
      (type === 'income' ? 'collected' : 'paid'),
    notes: movement.notes ?? '',
  }
}

function normalizeGoal(goal: Partial<Goal>): Goal {
  return {
    id: goal.id ?? crypto.randomUUID(),
    name: goal.name ?? 'Obiettivo',
    targetAmount: Number(goal.targetAmount) || 0,
    savedAmount: Number(goal.savedAmount) || 0,
    targetDate: goal.targetDate ?? new Date().toISOString().slice(0, 10),
  }
}

function normalizeSettings(settings?: Partial<StoredTaxProfile>): StoredTaxProfile {
  return {
    ...defaultTaxProfile,
    ...settings,
    id: 'default',
  }
}
