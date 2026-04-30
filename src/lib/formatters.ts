import type { MovementStatus } from './finance'
import type { ActiveView } from './routing'

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('it-IT').format(new Date(`${date}T00:00:00`))
}

export function statusLabel(status: MovementStatus) {
  return {
    collected: 'Incassato',
    pending: 'Da incassare',
    paid: 'Pagata',
    to_pay: 'Da pagare',
  }[status]
}

export function viewTitle(view: ActiveView) {
  return {
    overview: 'Fondi e tasse',
    movements: 'Movimenti',
    reserves: 'Accantonamenti',
    goals: 'Obiettivi',
    deadlines: 'Scadenze',
    analytics: 'Analisi',
    profile: 'Profilo fiscale',
    backup: 'Dati & backup',
  }[view]
}
