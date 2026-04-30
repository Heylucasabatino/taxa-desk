export type ActiveView =
  | 'overview'
  | 'movements'
  | 'reserves'
  | 'goals'
  | 'deadlines'
  | 'analytics'
  | 'profile'
  | 'backup'

export const viewHashes: Record<ActiveView, string> = {
  overview: 'Panoramica',
  movements: 'Movimenti',
  reserves: 'Accantonamenti',
  goals: 'Obiettivi',
  deadlines: 'Scadenze',
  analytics: 'Analisi',
  profile: 'Profilo fiscale',
  backup: 'Dati & backup',
}

const hashViews = Object.fromEntries(
  Object.entries(viewHashes).map(([view, hash]) => [
    normalizeHash(hash),
    view as ActiveView,
  ]),
) as Record<string, ActiveView>

export function normalizeHash(hash: string) {
  return hash
    .replace(/^#/, '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' ')
}

export function getViewFromHash(): ActiveView {
  if (typeof window === 'undefined') {
    return 'overview'
  }

  const hash = normalizeHash(safeDecodeHash(window.location.hash))

  return hashViews[hash] ?? 'overview'
}

function safeDecodeHash(hash: string) {
  try {
    return decodeURIComponent(hash)
  } catch {
    return hash
  }
}
