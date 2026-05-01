import { invoke } from '@tauri-apps/api/core'
import { defaultCategories, type Category } from '../constants/categories'
import {
  addCategory as addDexieCategory,
  addGoal as addDexieGoal,
  addDeadline as addDexieDeadline,
  addMovement as addDexieMovement,
  db,
  deleteCategory as deleteDexieCategory,
  deleteRecord,
  ensureMovementMigration,
  exportBackup as exportDexieBackup,
  importBackup as importDexieBackup,
  parseBackupPayload,
  saveProfile as saveDexieProfile,
  savePreferences as saveDexiePreferences,
  setDbErrorHandler,
  type BackupPayload,
  type StoredTaxProfile,
} from './db'
import { defaultTaxProfile, type AppPreferences, type Goal, type Movement, type PersonalDeadline, type TaxProfile } from './finance'

export type AppData = {
  movements: Movement[]
  goals: Goal[]
  profile: StoredTaxProfile
  categories: Category[]
  deadlines: PersonalDeadline[]
  preferences: AppPreferences
}

export type PortableDiagnostics = {
  exeDir: string
  dataDir: string
  backupsDir: string
  logsDir: string
  databasePath: string
  writable: boolean
}

type BackupResult = {
  path: string
  fileName: string
}

type StorageSubscriber = () => void

export type AppStorage = {
  mode: 'dexie' | 'tauri'
  subscribe: (subscriber: StorageSubscriber) => () => void
  setErrorHandler: (handler: (message: string) => void) => void
  getAppData: () => Promise<AppData>
  saveProfile: (profile: TaxProfile) => Promise<void>
  addMovement: (movement: Movement) => Promise<void>
  updateMovement: (movement: Movement) => Promise<void>
  restoreMovement: (movement: Movement) => Promise<void>
  deleteMovement: (id: string) => Promise<void>
  addGoal: (goal: Goal) => Promise<void>
  updateGoal: (goal: Goal) => Promise<void>
  restoreGoal: (goal: Goal) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  addDeadline: (deadline: PersonalDeadline) => Promise<void>
  updateDeadline: (deadline: PersonalDeadline) => Promise<void>
  deleteDeadline: (id: string) => Promise<void>
  savePreferences: (preferences: AppPreferences) => Promise<void>
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  exportBackup: () => Promise<string | undefined>
  importBackup: (payload: unknown) => Promise<void>
  parseBackupPayload: (payload: unknown) => BackupPayload
  getDiagnostics: () => Promise<PortableDiagnostics | null>
  flushAutoBackup: () => Promise<void>
}

const subscribers = new Set<StorageSubscriber>()

function notifyStorageChanged() {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

function subscribe(subscriber: StorageSubscriber) {
  subscribers.add(subscriber)

  return () => {
    subscribers.delete(subscriber)
  }
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function readDexieAppData(): Promise<AppData> {
  await ensureMovementMigration()
  await db.preferences.get('default').then((existing) =>
    existing ? undefined : db.preferences.put({ id: 'default', safetyThresholdAmount: null }),
  )

  const [movements, goals, profile, categories, deadlines, preferences] = await Promise.all([
    db.movements.orderBy('date').reverse().toArray(),
    db.goals.orderBy('targetDate').toArray(),
    db.settings.get('default'),
    db.categories.orderBy('name').toArray(),
    db.deadlines.orderBy('date').toArray(),
    db.preferences.get('default'),
  ])

  return {
    movements,
    goals,
    profile: profile ?? { ...defaultTaxProfile, id: 'default' },
    categories: categories.length > 0 ? categories : defaultCategories,
    deadlines,
    preferences: preferences ?? { safetyThresholdAmount: null },
  }
}

function withChange<TArgs extends unknown[], TResult>(operation: (...args: TArgs) => Promise<TResult>) {
  return async (...args: TArgs) => {
    const result = await operation(...args)
    notifyStorageChanged()

    return result
  }
}

const dexieStorage: AppStorage = {
  mode: 'dexie',
  subscribe,
  setErrorHandler: setDbErrorHandler,
  getAppData: readDexieAppData,
  saveProfile: withChange((profile: TaxProfile) => saveDexieProfile(profile)),
  addMovement: withChange((movement: Movement) => addDexieMovement(movement)),
  updateMovement: withChange(async (movement: Movement) => {
    await db.movements.put(movement)
  }),
  restoreMovement: withChange(async (movement: Movement) => {
    await db.movements.put(movement)
  }),
  deleteMovement: withChange((id: string) => deleteRecord('movements', id)),
  addGoal: withChange((goal: Goal) => addDexieGoal(goal)),
  updateGoal: withChange(async (goal: Goal) => {
    await db.goals.put(goal)
  }),
  restoreGoal: withChange(async (goal: Goal) => {
    await db.goals.put(goal)
  }),
  deleteGoal: withChange((id: string) => deleteRecord('goals', id)),
  addDeadline: withChange((deadline: PersonalDeadline) => addDexieDeadline(deadline)),
  updateDeadline: withChange(async (deadline: PersonalDeadline) => {
    await db.deadlines.put(deadline)
  }),
  deleteDeadline: withChange((id: string) => deleteRecord('deadlines', id)),
  savePreferences: withChange((preferences: AppPreferences) => saveDexiePreferences(preferences)),
  addCategory: withChange((category: Omit<Category, 'id'>) => addDexieCategory(category)),
  deleteCategory: withChange((id: string) => deleteDexieCategory(id)),
  exportBackup: async () => {
    await exportDexieBackup()

    return undefined
  },
  importBackup: withChange((payload: unknown) => importDexieBackup(payload)),
  parseBackupPayload,
  getDiagnostics: async () => null,
  flushAutoBackup: async () => undefined,
}

let autoBackupTimer: number | undefined
let pendingBackup = false

function scheduleTauriAutoBackup() {
  pendingBackup = true
  window.clearTimeout(autoBackupTimer)
  autoBackupTimer = window.setTimeout(() => {
    flushTauriAutoBackup().catch(console.error)
  }, 45_000)
}

async function flushTauriAutoBackup() {
  if (!pendingBackup) return

  pendingBackup = false
  window.clearTimeout(autoBackupTimer)
  await invoke('create_auto_backup')
}

function tauriMutation<TArgs extends unknown[], TResult>(
  command: string,
  mapArgs: (...args: TArgs) => Record<string, unknown>,
) {
  return async (...args: TArgs): Promise<TResult> => {
    const result = await invoke<TResult>(command, mapArgs(...args))
    scheduleTauriAutoBackup()
    notifyStorageChanged()

    return result
  }
}

const tauriStorage: AppStorage = {
  mode: 'tauri',
  subscribe,
  setErrorHandler: () => undefined,
  getAppData: () => invoke<AppData>('get_app_data'),
  saveProfile: tauriMutation('save_profile', (profile: TaxProfile) => ({ profile })),
  addMovement: tauriMutation('create_movement', (movement: Movement) => ({ movement })),
  updateMovement: tauriMutation('upsert_movement', (movement: Movement) => ({ movement })),
  restoreMovement: tauriMutation('upsert_movement', (movement: Movement) => ({ movement })),
  deleteMovement: tauriMutation('delete_movement', (id: string) => ({ id })),
  addGoal: tauriMutation('create_goal', (goal: Goal) => ({ goal })),
  updateGoal: tauriMutation('upsert_goal', (goal: Goal) => ({ goal })),
  restoreGoal: tauriMutation('upsert_goal', (goal: Goal) => ({ goal })),
  deleteGoal: tauriMutation('delete_goal', (id: string) => ({ id })),
  addDeadline: tauriMutation('create_deadline', (deadline: PersonalDeadline) => ({ deadline })),
  updateDeadline: tauriMutation('upsert_deadline', (deadline: PersonalDeadline) => ({ deadline })),
  deleteDeadline: tauriMutation('delete_deadline', (id: string) => ({ id })),
  savePreferences: tauriMutation('save_preferences', (preferences: AppPreferences) => ({ preferences })),
  addCategory: tauriMutation('create_category', (category: Omit<Category, 'id'>) => ({ category })),
  deleteCategory: tauriMutation('delete_category', (id: string) => ({ id })),
  exportBackup: async () => {
    const result = await invoke<BackupResult>('export_backup')

    return result.path
  },
  importBackup: async (payload: unknown) => {
    const parsed = parseBackupPayload(payload)
    await invoke('import_backup', { payload: parsed })
    scheduleTauriAutoBackup()
    notifyStorageChanged()
  },
  parseBackupPayload,
  getDiagnostics: () => invoke<PortableDiagnostics>('portable_diagnostics'),
  flushAutoBackup: flushTauriAutoBackup,
}

export const appStorage = isTauriRuntime() ? tauriStorage : dexieStorage

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (appStorage.mode === 'tauri') {
      void appStorage.flushAutoBackup()
    }
  })
}
