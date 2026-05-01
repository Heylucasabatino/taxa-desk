import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react'
import { DeadlineRow } from '../components/DeadlineRow'
import { SectionHeader } from '../components/SectionHeader'
import {
  buildDeadlinePayload,
  buildFiscalDeadlines,
  buildPersonalDeadlineOccurrences,
  deadlineCategoryLabel,
  defaultDeadlineForm,
  isDeadlineOverdue,
  isDeadlineSoon,
  recurrenceLabel,
  type DeadlineFormState,
  type DeadlineOccurrence,
} from '../lib/deadlines'
import type { PersonalDeadline } from '../lib/finance'
import { formatDate } from '../lib/formatters'

export function DeadlinesView({
  deadlines,
  selectedYear,
  onAddDeadline,
  onUpdateDeadline,
  onDeleteDeadline,
  onToggleOccurrence,
}: {
  deadlines: PersonalDeadline[]
  selectedYear: number
  onAddDeadline: (deadline: PersonalDeadline) => Promise<void>
  onUpdateDeadline: (deadline: PersonalDeadline) => Promise<void>
  onDeleteDeadline: (id?: string) => Promise<void>
  onToggleOccurrence: (deadline: PersonalDeadline, occurrenceDate: string) => Promise<void>
}) {
  const [form, setForm] = useState<DeadlineFormState>(defaultDeadlineForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fiscalDeadlines = useMemo(() => buildFiscalDeadlines(selectedYear), [selectedYear])
  const personalOccurrences = useMemo(
    () => buildPersonalDeadlineOccurrences(deadlines, selectedYear),
    [deadlines, selectedYear],
  )

  async function submitDeadline(event: FormEvent) {
    event.preventDefault()
    const payload = buildDeadlinePayload(form, editingId ?? undefined)

    if (editingId) {
      const existing = deadlines.find((deadline) => deadline.id === editingId)
      await onUpdateDeadline({
        ...payload,
        completedOccurrences: existing?.completedOccurrences ?? [],
      })
    } else {
      await onAddDeadline(payload)
    }

    setForm(defaultDeadlineForm)
    setEditingId(null)
  }

  function editDeadline(deadline: PersonalDeadline) {
    setEditingId(deadline.id ?? null)
    setForm({
      title: deadline.title,
      date: deadline.date,
      category: deadline.category,
      recurrence: deadline.recurrence,
      notes: deadline.notes ?? '',
    })
  }

  return (
    <section className="ledger-section deadlines-view">
      <SectionHeader title="Scadenze" detail="Promemoria fiscali e personali" />
      <div className="deadlines-grid">
        <section className="deadline-panel">
          <h3>Scadenze fiscali</h3>
          <div className="deadline-list">
            {fiscalDeadlines.map((deadline) => (
              <DeadlineRow key={deadline.id} date={formatDate(deadline.date)} title={deadline.title} />
            ))}
          </div>
          <p className="section-note">
            Le scadenze fiscali possono slittare in caso di festivi o proroghe. Verifica sempre
            con commercialista, Agenzia Entrate ed ENPAP prima del versamento.
          </p>
        </section>
        <section className="deadline-panel">
          <h3>Nuova scadenza personale</h3>
          <form className="deadline-form" onSubmit={submitDeadline}>
            <input
              required
              value={form.title}
              placeholder="Titolo"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as DeadlineFormState['category'] })}>
              <option value="personal">Personale</option>
              <option value="payment">Pagamento</option>
              <option value="document">Documento</option>
              <option value="tax">Fiscale</option>
              <option value="enpap">ENPAP</option>
            </select>
            <select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as DeadlineFormState['recurrence'] })}>
              <option value="none">Una volta</option>
              <option value="monthly">Mensile</option>
              <option value="yearly">Annuale</option>
            </select>
            <textarea
              value={form.notes}
              placeholder="Note facoltative"
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
            <div className="deadline-form-actions">
              <button className="primary-button" type="submit">
                {editingId ? 'Aggiorna scadenza' : 'Salva scadenza'}
              </button>
              {editingId ? (
                <button className="outline-button" type="button" onClick={() => {
                  setEditingId(null)
                  setForm(defaultDeadlineForm)
                }}>
                  Annulla
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
      <section className="deadline-panel personal-deadline-panel">
        <h3>Scadenze personali nell'anno</h3>
        {personalOccurrences.length > 0 ? (
          <div className="personal-deadline-list">
            {personalOccurrences.map((occurrence) => {
              const source = deadlines.find((deadline) => deadline.id === occurrence.sourceId)

              return (
                <PersonalDeadlineRow
                  key={occurrence.id}
                  occurrence={occurrence}
                  source={source}
                  onDeleteDeadline={onDeleteDeadline}
                  onEditDeadline={editDeadline}
                  onToggleOccurrence={onToggleOccurrence}
                />
              )
            })}
          </div>
        ) : (
          <div className="analysis-empty-row">
            <span>Nessuna scadenza personale per l'anno selezionato.</span>
          </div>
        )}
      </section>
    </section>
  )
}

function PersonalDeadlineRow({
  occurrence,
  source,
  onDeleteDeadline,
  onEditDeadline,
  onToggleOccurrence,
}: {
  occurrence: DeadlineOccurrence
  source?: PersonalDeadline
  onDeleteDeadline: (id?: string) => Promise<void>
  onEditDeadline: (deadline: PersonalDeadline) => void
  onToggleOccurrence: (deadline: PersonalDeadline, occurrenceDate: string) => Promise<void>
}) {
  const soon = isDeadlineSoon(occurrence.date)
  const overdue = isDeadlineOverdue(occurrence.date, occurrence.completed)

  return (
    <article className={`personal-deadline-row ${soon ? 'soon' : ''} ${overdue ? 'overdue' : ''}`}>
      <button
        className="deadline-check"
        type="button"
        disabled={!source}
        aria-label={occurrence.completed ? 'Segna da fare' : 'Segna completata'}
        onClick={() => source ? onToggleOccurrence(source, occurrence.date) : undefined}
      >
        {occurrence.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <div>
        <strong>{occurrence.title}</strong>
        <span>{deadlineCategoryLabel(occurrence.category)} · {recurrenceLabel(occurrence.recurrence)}</span>
        {occurrence.notes ? <small>{occurrence.notes}</small> : null}
      </div>
      <time>{formatDate(occurrence.date)}</time>
      <div className="row-actions">
        {source ? (
          <>
            <button className="row-action" type="button" aria-label={`Modifica ${occurrence.title}`} onClick={() => onEditDeadline(source)}>
              <Pencil size={16} />
            </button>
            <button className="row-action" type="button" aria-label={`Elimina ${occurrence.title}`} onClick={() => onDeleteDeadline(source.id)}>
              <Trash2 size={16} />
            </button>
          </>
        ) : null}
      </div>
    </article>
  )
}
