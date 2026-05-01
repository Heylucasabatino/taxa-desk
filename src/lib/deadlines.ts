import type { DeadlineCategory, DeadlineRecurrence, PersonalDeadline } from './finance'

export type DeadlineOccurrence = {
  id: string
  sourceId: string
  title: string
  date: string
  category: DeadlineCategory
  recurrence: DeadlineRecurrence
  notes?: string
  completed: boolean
  fixed?: boolean
}

export type DeadlineFormState = {
  title: string
  date: string
  category: DeadlineCategory
  recurrence: DeadlineRecurrence
  notes: string
}

export const defaultDeadlineForm: DeadlineFormState = {
  title: '',
  date: new Date().toISOString().slice(0, 10),
  category: 'personal',
  recurrence: 'none',
  notes: '',
}

export function buildFiscalDeadlines(selectedYear: number): DeadlineOccurrence[] {
  const enpapAdvanceDate = selectedYear === 2026 ? `${selectedYear}-03-02` : `${selectedYear}-03-01`

  return [
    fiscalDeadline('fiscal-enpap-advance', enpapAdvanceDate, 'ENPAP acconto contributi', 'enpap'),
    fiscalDeadline('fiscal-tax-june', `${selectedYear}-06-30`, 'Imposte: saldo e primo acconto', 'tax'),
    fiscalDeadline('fiscal-enpap-october', `${selectedYear}-10-01`, 'ENPAP comunicazione reddituale e saldo', 'enpap'),
    fiscalDeadline('fiscal-tax-november', `${selectedYear}-11-30`, 'Imposte: secondo acconto', 'tax'),
  ]
}

export function buildPersonalDeadlineOccurrences(
  deadlines: PersonalDeadline[],
  selectedYear: number,
): DeadlineOccurrence[] {
  return deadlines.flatMap((deadline) => expandDeadline(deadline, selectedYear))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function buildDeadlinePayload(form: DeadlineFormState, id?: string): PersonalDeadline {
  return {
    id,
    title: form.title.trim() || 'Scadenza personale',
    date: form.date,
    category: form.category,
    recurrence: form.recurrence,
    notes: form.notes.trim(),
    completedOccurrences: [],
  }
}

export function deadlineCategoryLabel(category: DeadlineCategory) {
  const labels: Record<DeadlineCategory, string> = {
    tax: 'Fiscale',
    enpap: 'ENPAP',
    personal: 'Personale',
    payment: 'Pagamento',
    document: 'Documento',
  }

  return labels[category]
}

export function recurrenceLabel(recurrence: DeadlineRecurrence) {
  const labels: Record<DeadlineRecurrence, string> = {
    none: 'Una volta',
    monthly: 'Mensile',
    yearly: 'Annuale',
  }

  return labels[recurrence]
}

export function isDeadlineSoon(date: string, now = new Date()) {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const deltaDays = Math.floor((target.getTime() - today.getTime()) / 86_400_000)

  return deltaDays >= 0 && deltaDays <= 7
}

export function isDeadlineOverdue(date: string, completed: boolean, now = new Date()) {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return !completed && target < today
}

function fiscalDeadline(
  id: string,
  date: string,
  title: string,
  category: DeadlineCategory,
): DeadlineOccurrence {
  return {
    id: `${id}-${date}`,
    sourceId: id,
    title,
    date,
    category,
    recurrence: 'yearly',
    completed: false,
    fixed: true,
  }
}

function expandDeadline(deadline: PersonalDeadline, selectedYear: number): DeadlineOccurrence[] {
  const baseDate = new Date(`${deadline.date}T00:00:00`)
  if (Number.isNaN(baseDate.getTime())) {
    return []
  }

  if (deadline.recurrence === 'none') {
    if (baseDate.getFullYear() !== selectedYear) return []

    return [toOccurrence(deadline, deadline.date)]
  }

  if (deadline.recurrence === 'yearly') {
    const occurrenceDate = formatDate(new Date(selectedYear, baseDate.getMonth(), baseDate.getDate()))

    return [toOccurrence(deadline, occurrenceDate)]
  }

  return Array.from({ length: 12 }, (_, month) =>
    toOccurrence(deadline, formatDate(new Date(selectedYear, month, Math.min(baseDate.getDate(), daysInMonth(selectedYear, month))))),
  )
}

function toOccurrence(deadline: PersonalDeadline, date: string): DeadlineOccurrence {
  const sourceId = deadline.id ?? deadline.title

  return {
    id: `${sourceId}-${date}`,
    sourceId,
    title: deadline.title,
    date,
    category: deadline.category,
    recurrence: deadline.recurrence,
    notes: deadline.notes,
    completed: deadline.completedOccurrences?.includes(date) ?? false,
  }
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}
