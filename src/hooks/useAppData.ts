import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureMovementMigration } from '../lib/db'
import { defaultTaxProfile, type Goal, type Movement } from '../lib/finance'

const emptyMovements: Movement[] = []
const emptyGoals: Goal[] = []

export function useAppData() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    ensureMovementMigration().catch(console.error).finally(() => setIsReady(true))
  }, [])

  const appData = useLiveQuery(async () => {
    if (!isReady) return null

    const [movements, goals, profile] = await Promise.all([
      db.movements.orderBy('date').reverse().toArray(),
      db.goals.orderBy('targetDate').toArray(),
      db.settings.get('default'),
    ])

    return {
      movements,
      goals,
      profile: profile ?? { ...defaultTaxProfile, id: 'default' },
    }
  }, [isReady])

  return {
    appData,
    movements: appData?.movements ?? emptyMovements,
    goals: appData?.goals ?? emptyGoals,
    profile: appData?.profile ?? defaultTaxProfile,
  }
}
