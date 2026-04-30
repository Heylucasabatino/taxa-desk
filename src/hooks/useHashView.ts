import { useEffect, useState } from 'react'
import { getViewFromHash, type ActiveView, viewHashes } from '../lib/routing'

export function useHashView(onViewChange?: (view: ActiveView) => void) {
  const [activeView, setActiveView] = useState<ActiveView>(() => getViewFromHash())

  useEffect(() => {
    function handleHashChange() {
      const nextView = getViewFromHash()

      setActiveView(nextView)
      onViewChange?.(nextView)
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [onViewChange])

  function selectView(view: ActiveView) {
    setActiveView(view)
    onViewChange?.(view)

    const nextHash = `#${encodeURIComponent(viewHashes[view])}`

    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash)
    }
  }

  return { activeView, selectView }
}
