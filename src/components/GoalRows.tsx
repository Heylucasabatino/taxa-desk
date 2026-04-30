import { Goal as GoalIcon, Pencil, Trash2 } from 'lucide-react'
import {
  estimateGoalPlan,
  formatCurrency,
  type Goal,
  type TaxProfile,
} from '../lib/finance'
import { formatDate } from '../lib/formatters'

export function GoalRows({
  goals,
  profile,
  onEdit,
  onDelete,
}: {
  goals: Goal[]
  profile: TaxProfile
  onEdit: (goal: Goal) => void
  onDelete: (id?: string) => void
}) {
  if (goals.length === 0) {
    return (
      <div className="empty-ledger">
        <strong>Nessun obiettivo attivo</strong>
        <span>Definisci importo e scadenza per calcolare la rata mensile.</span>
      </div>
    )
  }

  return (
    <div className="goal-table">
      {goals.map((goal) => {
        const plan = estimateGoalPlan(goal, profile)

        return (
          <article className="goal-row" key={goal.id}>
            <div className="goal-mark">
              <GoalIcon size={22} />
            </div>
            <div>
              <strong>{goal.name}</strong>
              <span>Obiettivo principale</span>
            </div>
            <dl>
              <div>
                <dt>Target</dt>
                <dd>{formatCurrency(goal.targetAmount)}</dd>
              </div>
              <div>
                <dt>Accantonato</dt>
                <dd>{formatCurrency(goal.savedAmount)}</dd>
              </div>
              <div>
                <dt>Manca</dt>
                <dd className="amount-expense">{formatCurrency(plan.remaining)}</dd>
              </div>
              <div>
                <dt>Scadenza</dt>
                <dd>{formatDate(goal.targetDate)}</dd>
              </div>
              <div>
                <dt>Rata netta</dt>
                <dd>{formatCurrency(plan.monthlyNet)} / mese</dd>
              </div>
            </dl>
            <div className="goal-progress">
              <i style={{ width: `${plan.progress * 100}%` }} />
            </div>
            <div className="row-actions">
              <button
                className="row-action"
                type="button"
                aria-label={`Modifica ${goal.name}`}
                onClick={() => onEdit(goal)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="row-action"
                type="button"
                aria-label={`Elimina ${goal.name}`}
                onClick={() => onDelete(goal.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
