import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { defaultCategories } from '../constants/categories'
import { db, ensureMovementMigration, setDbErrorHandler } from '../lib/db'
import { defaultTaxProfile, type Goal, type Movement } from '../lib/finance'
import type { Toast } from './useToast'

const emptyMovements: Movement[] = []
const emptyGoals: Goal[] = []

export function useAppData(notify?: (message: string, action?: Pick<Toast, 'actionLabel' | 'onAction'>) => void) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (notify) {
      setDbErrorHandler(notify)
    }
    ensureMovementMigration().catch(console.error).finally(() => setIsReady(true))
  }, [notify])

  const appData = useLiveQuery(async () => {
    if (!isReady) return null

    const [movements, goals, profile, categories] = await Promise.all([
      db.movements.orderBy('date').reverse().toArray(),
      db.goals.orderBy('targetDate').toArray(),
      db.settings.get('default'),
      db.categories.orderBy('name').toArray(),
    ])

    return {
      movements,
      goals,
      profile: profile ?? { ...defaultTaxProfile, id: 'default' },
      categories: categories.length > 0 ? categories : defaultCategories,
    }
  }, [isReady])

  return {
    appData,
    movements: appData?.movements ?? emptyMovements,
    goals: appData?.goals ?? emptyGoals,
    profile: appData?.profile ?? defaultTaxProfile,
    categories: appData?.categories ?? defaultCategories,
  }
}
