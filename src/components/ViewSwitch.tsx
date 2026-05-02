import { useEffect, useRef, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { Category } from '../constants/categories'
import type { ThemePreference } from '../hooks/useTheme'
import type { ActiveView } from '../lib/routing'
import type { AppPreferences, FiscalEstimate, Goal, Movement, MovementType, PersonalDeadline, TaxProfile } from '../lib/finance'
import type { PortableDiagnostics } from '../lib/storage'
import type { UpdateState } from '../lib/updates'
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
  deadlines,
  preferences,
  profile,
  categories,
  theme,
  fiscalEstimate,
  selectedYear,
  diagnostics,
  updateState,
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
  onCheckUpdates,
  onInstallUpdate,
  onOpenDownloadPage,
  onOpenFeedbackPage,
  onProfileChange,
  onSavePreferences,
  onAddDeadline,
  onUpdateDeadline,
  onDeleteDeadline,
  onToggleDeadlineOccurrence,
  onCreateCategory,
  onDeleteCategory,
  onThemeChange,
  onRestartSetup,
}: {
  activeView: ActiveView
  annualMovements: Movement[]
  goals: Goal[]
  deadlines: PersonalDeadline[]
  preferences: AppPreferences
  profile: TaxProfile
  categories: Category[]
  theme: ThemePreference
  fiscalEstimate: FiscalEstimate
  selectedYear: number
  diagnostics: PortableDiagnostics | null
  updateState: UpdateState
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
  onCheckUpdates: () => void
  onInstallUpdate: () => void
  onOpenDownloadPage: () => void
  onOpenFeedbackPage: () => void
  onProfileChange: (field: keyof TaxProfile, value: string | boolean) => void
  onSavePreferences: (preferences: AppPreferences) => Promise<void>
  onAddDeadline: (deadline: PersonalDeadline) => Promise<void>
  onUpdateDeadline: (deadline: PersonalDeadline) => Promise<void>
  onDeleteDeadline: (id?: string) => Promise<void>
  onToggleDeadlineOccurrence: (deadline: PersonalDeadline, occurrenceDate: string) => Promise<void>
  onCreateCategory: (type: MovementType, name: string) => void
  onDeleteCategory: (id?: string) => void
  onThemeChange: (theme: ThemePreference) => void
  onRestartSetup: () => void
}) {
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    shellRef.current?.scrollTo({ top: 0, left: 0 })
  }, [activeView])

  return (
    <div ref={shellRef} className={activeView === 'movements' ? 'content-shell' : 'content-shell single'}>
      <section className="main-ledger">
        {activeView === 'overview' ? <OverviewView movements={annualMovements} goals={goals} profile={profile} estimate={fiscalEstimate} preferences={preferences} diagnostics={diagnostics} onSavePreferences={onSavePreferences} onGoToMovements={onNewMovement} onGoToReserves={() => onSelectView('reserves')} onGoToGoals={() => onSelectView('goals')} onGoToProfile={() => onSelectView('profile')} /> : null}
        {activeView === 'movements' ? <MovementsView movements={annualMovements} categories={categories} onDelete={onDeleteMovement} onEdit={onEditMovement} onNew={onNewMovement} /> : null}
        {activeView === 'reserves' ? <ReservesView estimate={fiscalEstimate} profile={profile} /> : null}
        {activeView === 'goals' ? <GoalsView goals={goals} profile={profile} goalForm={goalForm} goalErrors={goalErrors} setGoalForm={setGoalForm} editingGoalId={editingGoalId} onCancelEdit={onCancelGoalEdit} onEditGoal={onEditGoal} onDeleteGoal={onDeleteGoal} onSubmitGoal={onSubmitGoal} /> : null}
        {activeView === 'deadlines' ? <DeadlinesView deadlines={deadlines} selectedYear={selectedYear} onAddDeadline={onAddDeadline} onUpdateDeadline={onUpdateDeadline} onDeleteDeadline={onDeleteDeadline} onToggleOccurrence={onToggleDeadlineOccurrence} /> : null}
        {activeView === 'analytics' ? <AnalyticsView movements={annualMovements} estimate={fiscalEstimate} preferences={preferences} onSavePreferences={onSavePreferences} /> : null}
        {activeView === 'profile' ? <ProfileView profile={profile} categories={categories} theme={theme} onChange={onProfileChange} onCreateCategory={onCreateCategory} onDeleteCategory={onDeleteCategory} onThemeChange={onThemeChange} onRestartSetup={onRestartSetup} /> : null}
        {activeView === 'backup' ? <BackupView diagnostics={diagnostics} updateState={updateState} onExport={onExport} onImport={onImport} onCheckUpdates={onCheckUpdates} onInstallUpdate={onInstallUpdate} onOpenDownloadPage={onOpenDownloadPage} onOpenFeedbackPage={onOpenFeedbackPage} /> : null}
      </section>
      {activeView === 'movements' && drawerOpen ? (
        <MovementDrawer movementType={movementType} movementForm={movementForm} isEditing={Boolean(editingMovementId)} categories={categories} errors={movementErrors} setMovementForm={setMovementForm} setType={setType} onClose={() => {
          setDrawerOpen(false)
          setEditingMovementId(null)
          setMovementErrors({})
        }} onSubmit={onSubmitMovement} />
      ) : null}
    </div>
  )
}
