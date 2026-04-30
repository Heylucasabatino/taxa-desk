import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { X } from 'lucide-react'
import { categoriesByType, type Category } from '../constants/categories'
import { helpText } from '../constants/helpText'
import type { MovementStatus, MovementType } from '../lib/finance'
import { CurrencyField } from './fields/CurrencyField'
import { Field } from './fields/Field'

export type MovementFormState = {
  date: string
  description: string
  category: string
  amount: string
  status: MovementStatus
  notes: string
}

const incomeStatuses: Array<[MovementStatus, string]> = [
  ['collected', 'Incassato'],
  ['pending', 'Da incassare'],
]

const expenseStatuses: Array<[MovementStatus, string]> = [
  ['paid', 'Pagata'],
  ['to_pay', 'Da pagare'],
]

export function MovementDrawer({
  movementType,
  movementForm,
  isEditing,
  categories,
  errors,
  setMovementForm,
  setType,
  onClose,
  onSubmit,
}: {
  movementType: MovementType
  movementForm: MovementFormState
  isEditing: boolean
  categories: Category[]
  errors?: Partial<Record<keyof MovementFormState, string>>
  setMovementForm: Dispatch<SetStateAction<MovementFormState>>
  setType: (type: MovementType) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <aside className="drawer" aria-label="Nuovo movimento">
      <div className="drawer-header">
        <h2>{isEditing ? 'Modifica movimento' : 'Nuovo movimento'}</h2>
        <button
          className="ghost-button"
          type="button"
          aria-label="Chiudi drawer"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="segmented-control" role="tablist" aria-label="Tipo movimento">
        <button
          className={movementType === 'income' ? 'selected' : ''}
          type="button"
          onClick={() => setType('income')}
        >
          Introito
        </button>
        <button
          className={movementType === 'expense' ? 'selected' : ''}
          type="button"
          onClick={() => setType('expense')}
        >
          Spesa
        </button>
      </div>
      <form className="drawer-form" onSubmit={onSubmit}>
        <Field label="Data">
          <input
            type="date"
            value={movementForm.date}
            onChange={(event) =>
              setMovementForm({ ...movementForm, date: event.target.value })
            }
          />
        </Field>
        <Field label="Descrizione">
          <input
            value={movementForm.description}
            placeholder={
              movementType === 'income'
                ? 'Es. Seduta psicoterapia'
                : 'Es. Commercialista'
            }
            onChange={(event) =>
              setMovementForm({
                ...movementForm,
                description: event.target.value,
              })
            }
          />
        </Field>
        <Field label="Categoria">
          <select
            value={movementForm.category}
            onChange={(event) =>
              setMovementForm({
                ...movementForm,
                category: event.target.value,
              })
            }
          >
            {categoriesByType(categories, movementType).map((category) => (
              <option key={category.id ?? category.name}>{category.name}</option>
            ))}
          </select>
        </Field>
        <CurrencyField
          label="Importo"
          value={movementForm.amount}
          help={helpText.movementAmount}
          error={errors?.amount}
          onChange={(value) =>
            setMovementForm({ ...movementForm, amount: String(value) })
          }
          required
        />
        <Field label="Stato" help={helpText.movementStatus}>
          <select
            value={movementForm.status}
            onChange={(event) =>
              setMovementForm({
                ...movementForm,
                status: event.target.value as MovementStatus,
              })
            }
          >
            {(movementType === 'income' ? incomeStatuses : expenseStatuses).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Note (facoltative)">
          <textarea
            value={movementForm.notes}
            placeholder="Aggiungi una nota..."
            onChange={(event) =>
              setMovementForm({ ...movementForm, notes: event.target.value })
            }
          />
        </Field>
        <div className="drawer-actions">
          <button className="primary-button" type="submit">
            {isEditing ? 'Aggiorna' : 'Salva'}
          </button>
          <button className="outline-button" type="button" onClick={onClose}>
            Annulla
          </button>
        </div>
      </form>
    </aside>
  )
}
