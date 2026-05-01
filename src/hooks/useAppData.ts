import { useEffect, useState } from 'react'
import { defaultCategories } from '../constants/categories'
import { defaultTaxProfile, type AppPreferences, type Goal, type Movement, type PersonalDeadline } from '../lib/finance'
import { appStorage, type AppData } from '../lib/storage'
import type { Toast } from './useToast'

const emptyMovements: Movement[] = []
const emptyGoals: Goal[] = []
const emptyDeadlines: PersonalDeadline[] = []
const defaultPreferences: AppPreferences = { safetyThresholdAmount: null }

export function useAppData(notify?: (message: string, action?: Pick<Toast, 'actionLabel' | 'onAction'>) => void) {
  const [appData, setAppData] = useState<AppData | null>(null)

  useEffect(() => {
    if (notify) {
      appStorage.setErrorHandler(notify)
    }

    let cancelled = false
    async function loadData() {
      try {
        const nextData = await appStorage.getAppData()

        if (!cancelled) {
          setAppData(nextData)
        }
      } catch (error) {
        console.error(error)
        notify?.('Archivio locale non disponibile.')
      }
    }

    void loadData()
    const unsubscribe = appStorage.subscribe(() => {
      void loadData()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [notify])

  return {
    appData,
    movements: appData?.movements ?? emptyMovements,
    goals: appData?.goals ?? emptyGoals,
    profile: appData?.profile ?? defaultTaxProfile,
    categories: appData?.categories ?? defaultCategories,
    deadlines: appData?.deadlines ?? emptyDeadlines,
    preferences: appData?.preferences ?? defaultPreferences,
  }
}
