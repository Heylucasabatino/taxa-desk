import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { CurrencyInput } from './fields/CurrencyInput'

export type GoalFormState = {
  name: string
  targetAmount: string
  savedAmount: string
  targetDate: string
}

export function GoalForm({
  goalForm,
  isEditing,
  errors,
  setGoalForm,
  onCancelEdit,
  onSubmit,
}: {
  goalForm: GoalFormState
  isEditing: boolean
  errors?: Partial<Record<keyof GoalFormState, string>>
  setGoalForm: Dispatch<SetStateAction<GoalFormState>>
  onCancelEdit: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <form className="inline-goal-form" onSubmit={onSubmit}>
      <input
        value={goalForm.name}
        placeholder="Nuovo obiettivo"
        onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
      />
      <div className="inline-field">
        <CurrencyInput
          value={goalForm.targetAmount}
          placeholder="Target"
          required
          invalid={Boolean(errors?.targetAmount)}
          onChange={(value) =>
            setGoalForm({ ...goalForm, targetAmount: String(value) })
          }
        />
        {errors?.targetAmount ? (
          <span className="field-error">{errors.targetAmount}</span>
        ) : null}
      </div>
      <CurrencyInput
        value={goalForm.savedAmount}
        placeholder="Già accantonato"
        onChange={(value) =>
          setGoalForm({ ...goalForm, savedAmount: String(value) })
        }
      />
      <input
        type="date"
        value={goalForm.targetDate}
        onChange={(event) =>
          setGoalForm({ ...goalForm, targetDate: event.target.value })
        }
      />
      <button className="text-button" type="submit">
        {isEditing ? 'Aggiorna obiettivo' : 'Salva obiettivo'}
      </button>
      {isEditing ? (
        <button className="outline-button" type="button" onClick={onCancelEdit}>
          Annulla
        </button>
      ) : null}
    </form>
  )
}
