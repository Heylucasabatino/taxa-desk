import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const themeKey = 'funds-and-taxes:theme'

export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(themeKey)

    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system'
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function applyTheme() {
      const effectiveTheme = theme === 'system'
        ? media.matches ? 'dark' : 'light'
        : theme

      if (effectiveTheme === 'dark') {
        document.documentElement.dataset.theme = 'dark'
      } else {
        delete document.documentElement.dataset.theme
      }
    }

    localStorage.setItem(themeKey, theme)
    applyTheme()
    media.addEventListener('change', applyTheme)

    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  return { theme, setTheme }
}
