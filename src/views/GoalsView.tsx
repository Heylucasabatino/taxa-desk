import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { GoalForm, type GoalFormState } from '../components/GoalForm'
import { GoalRows } from '../components/GoalRows'
import { SectionHeader } from '../components/SectionHeader'
import { helpText } from '../constants/helpText'
import type { Goal, TaxProfile } from '../lib/finance'

export function GoalsView({
  goals,
  profile,
  goalForm,
  goalErrors,
  setGoalForm,
  editingGoalId,
  onCancelEdit,
  onEditGoal,
  onDeleteGoal,
  onSubmitGoal,
  compact = false,
}: {
  goals: Goal[]
  profile: TaxProfile
  goalForm: GoalFormState
  goalErrors?: Partial<Record<keyof GoalFormState, string>>
  setGoalForm: Dispatch<SetStateAction<GoalFormState>>
  editingGoalId: string | null
  onCancelEdit: () => void
  onEditGoal: (goal: Goal) => void
  onDeleteGoal: (id?: string) => void
  onSubmitGoal: (event: FormEvent) => void
  compact?: boolean
}) {
  return (
    <section className="ledger-section">
      <SectionHeader
        title="Obiettivi"
        detail={compact ? 'Prossimi traguardi' : 'Risparmio e lordo necessario'}
        help={helpText.goals}
      />
      <GoalRows
        goals={goals}
        profile={profile}
        onEdit={onEditGoal}
        onDelete={onDeleteGoal}
      />
      <GoalForm
        goalForm={goalForm}
        isEditing={Boolean(editingGoalId)}
        errors={goalErrors}
        setGoalForm={setGoalForm}
        onCancelEdit={onCancelEdit}
        onSubmit={onSubmitGoal}
      />
    </section>
  )
}
