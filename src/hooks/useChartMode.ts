import { useEffect, useState } from 'react'
import type { ChartMode } from '../lib/chartData'

const chartModeKey = 'fondi-e-tasse.chartMode'
const chartModes: ChartMode[] = ['available', 'cashflow', 'reserve']

export function useChartMode(defaultMode: ChartMode = 'available') {
  const [mode, setMode] = useState<ChartMode>(() => {
    const stored = window.localStorage.getItem(chartModeKey)

    if (stored === 'net') return 'available'

    return isChartMode(stored) ? stored : defaultMode
  })

  useEffect(() => {
    window.localStorage.setItem(chartModeKey, mode)
  }, [mode])

  return [mode, setMode] as const
}

function isChartMode(value: string | null): value is ChartMode {
  return chartModes.includes(value as ChartMode)
}
