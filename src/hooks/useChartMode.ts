import { useEffect, useState } from 'react'
import type { ChartMode } from '../lib/chartData'

const chartModeKey = 'fondi-e-tasse.chartMode'
const chartModes: ChartMode[] = ['available', 'cashflow', 'reserve']

export function useChartMode(defaultMode: ChartMode = 'available') {
  const [mode, setMode] = useState<ChartMode>(() => {
    const stored = readStoredChartMode()

    if (stored === 'net') return 'available'

    return isChartMode(stored) ? stored : defaultMode
  })

  useEffect(() => {
    writeStoredChartMode(mode)
  }, [mode])

  return [mode, setMode] as const
}

function isChartMode(value: string | null): value is ChartMode {
  return chartModes.includes(value as ChartMode)
}

function readStoredChartMode() {
  try {
    return window.localStorage.getItem(chartModeKey)
  } catch {
    return null
  }
}

function writeStoredChartMode(mode: ChartMode) {
  try {
    window.localStorage.setItem(chartModeKey, mode)
  } catch {
    // Il grafico resta utilizzabile anche se lo storage locale del browser non è disponibile.
  }
}
