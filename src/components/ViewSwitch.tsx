import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { defaultCategories } from '../constants/categories'
import type { ActiveView } from '../lib/routing'
import type { FiscalEstimate, Goal, Movement, MovementType, TaxProfile } from '../lib/finance'
import { AnalyticsView } from '../views/AnalyticsView'
import { BackupView } from '../views/BackupView'
import { DeadlinesView } from '../views/DeadlinesView'
import { GoalsView } from '../views/GoalsView'
import { MovementsView } from '../views/MovementsView'
import { OverviewView } from '../views/OverviewView'
import { ProfileView } from '../views/ProfileView'
import { ReservesView } from '../views/ReservesView'
import { MovementDrawer, type MovementFormState } from './MovementDrawer'
import type { GoalFormState } from './GoalForm'

export function ViewSwitch({
  activeView,
  annualMovements,
  goals,
  profile,
  fiscalEstimate,
  selectedYear,
  drawerOpen,
  movementType,
  movementForm,
  movementErrors,
  goalForm,
  goalErrors,
  editingMovementId,
  editingGoalId,
  setMovementForm,
  setGoalForm,
  setType,
  setDrawerOpen,
  setEditingMovementId,
  setMovementErrors,
  onSelectView,
  onNewMovement,
  onEditMovement,
  onDeleteMovement,
  onSubmitMovement,
  onSubmitGoal,
  onCancelGoalEdit,
  onEditGoal,
  onDeleteGoal,
  onExport,
  onImport,
  onProfileChange,
  onRestartSetup,
}: {
  activeView: ActiveView
  annualMovements: Movement[]
  goals: Goal[]
  profile: TaxProfile
  fiscalEstimate: FiscalEstimate
  selectedYear: number
  drawerOpen: boolean
  movementType: MovementType
  movementForm: MovementFormState
  movementErrors: Partial<Record<keyof MovementFormState, string>>
  goalForm: GoalFormState
  goalErrors: Partial<Record<keyof GoalFormState, string>>
  editingMovementId: string | null
  editingGoalId: string | null
  setMovementForm: Dispatch<SetStateAction<MovementFormState>>
  setGoalForm: Dispatch<SetStateAction<GoalFormState>>
  setType: (type: MovementType) => void
  setDrawerOpen: (open: boolean) => void
  setEditingMovementId: (id: string | null) => void
  setMovementErrors: (errors: Partial<Record<keyof MovementFormState, string>>) => void
  onSelectView: (view: ActiveView) => void
  onNewMovement: () => void
  onEditMovement: (movement: Movement) => void
  onDeleteMovement: (id?: string) => void
  onSubmitMovement: (event: FormEvent) => void
  onSubmitGoal: (event: FormEvent) => void
  onCancelGoalEdit: () => void
  onEditGoal: (goal: Goal) => void
  onDeleteGoal: (id?: string) => void
  onExport: () => void
  onImport: () => void
  onProfileChange: (field: keyof TaxProfile, value: string | boolean) => void
  onRestartSetup: () => void
}) {
  return (
    <div className={activeView === 'movements' ? 'content-shell' : 'content-shell single'}>
      <section className="main-ledger">
        {activeView === 'overview' ? <OverviewView movements={annualMovements} goals={goals} estimate={fiscalEstimate} onGoToMovements={onNewMovement} onGoToReserves={() => onSelectView('reserves')} onGoToGoals={() => onSelectView('goals')} onGoToProfile={() => onSelectView('profile')} /> : null}
        {activeView === 'movements' ? <MovementsView movements={annualMovements} onDelete={onDeleteMovement} onEdit={onEditMovement} onNew={onNewMovement} onExport={onExport} onImport={onImport} /> : null}
        {activeView === 'reserves' ? <ReservesView estimate={fiscalEstimate} profile={profile} /> : null}
        {activeView === 'goals' ? <GoalsView goals={goals} profile={profile} goalForm={goalForm} goalErrors={goalErrors} setGoalForm={setGoalForm} editingGoalId={editingGoalId} onCancelEdit={onCancelGoalEdit} onEditGoal={onEditGoal} onDeleteGoal={onDeleteGoal} onSubmitGoal={onSubmitGoal} /> : null}
        {activeView === 'deadlines' ? <DeadlinesView selectedYear={selectedYear} /> : null}
        {activeView === 'analytics' ? <AnalyticsView movements={annualMovements} /> : null}
        {activeView === 'profile' ? <ProfileView profile={profile} onChange={onProfileChange} onRestartSetup={onRestartSetup} /> : null}
        {activeView === 'backup' ? <BackupView onExport={onExport} onImport={onImport} /> : null}
      </section>
      {activeView === 'movements' && drawerOpen ? (
        <MovementDrawer movementType={movementType} movementForm={movementForm} isEditing={Boolean(editingMovementId)} categories={defaultCategories} errors={movementErrors} setMovementForm={setMovementForm} setType={setType} onClose={() => {
          setDrawerOpen(false)
          setEditingMovementId(null)
          setMovementErrors({})
        }} onSubmit={onSubmitMovement} />
      ) : null}
    </div>
  )
}
