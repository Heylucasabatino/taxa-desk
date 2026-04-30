import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const themeKey = 'funds-and-taxes:theme'

export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = readStoredTheme()

    applyTheme(stored)
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system'
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => applyTheme(theme, media)

    writeStoredTheme(theme)
    applyTheme(theme, media)
    media.addEventListener('change', handleSystemChange)

    return () => media.removeEventListener('change', handleSystemChange)
  }, [theme])

  return { theme, setTheme }
}

function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(themeKey)

    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system'
  } catch {
    return 'system'
  }
}

function writeStoredTheme(theme: ThemePreference) {
  try {
    localStorage.setItem(themeKey, theme)
  } catch {
    // Il tema resta applicato in memoria anche se lo storage locale non è disponibile.
  }
}

function applyTheme(
  theme: ThemePreference,
  media = window.matchMedia('(prefers-color-scheme: dark)'),
) {
  const effectiveTheme = theme === 'system'
    ? media.matches ? 'dark' : 'light'
    : theme

  if (effectiveTheme === 'dark') {
    document.documentElement.dataset.theme = 'dark'
  } else {
    delete document.documentElement.dataset.theme
  }
}
