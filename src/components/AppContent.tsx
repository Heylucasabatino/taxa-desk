import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Category } from '../constants/categories'
import type { ThemePreference } from '../hooks/useTheme'
import type { AppPreferences, FiscalEstimate, Goal, Movement, MovementType, PersonalDeadline, TaxProfile } from '../lib/finance'
import type { ActiveView } from '../lib/routing'
import type { PortableDiagnostics } from '../lib/storage'
import type { UpdateState } from '../lib/updates'
import type { GoalFormState } from './GoalForm'
import type { MovementFormState } from './MovementDrawer'
import { ViewSwitch } from './ViewSwitch'

export function AppContent({
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
  return (
      <ViewSwitch
        activeView={activeView}
        annualMovements={annualMovements}
        goals={goals}
        deadlines={deadlines}
        preferences={preferences}
        profile={profile}
        categories={categories}
        theme={theme}
        fiscalEstimate={fiscalEstimate}
        selectedYear={selectedYear}
        diagnostics={diagnostics}
        updateState={updateState}
        drawerOpen={drawerOpen}
        movementType={movementType}
        movementForm={movementForm}
        movementErrors={movementErrors}
        goalForm={goalForm}
        goalErrors={goalErrors}
        editingMovementId={editingMovementId}
        editingGoalId={editingGoalId}
        setMovementForm={setMovementForm}
        setGoalForm={setGoalForm}
        setType={setType}
        setDrawerOpen={setDrawerOpen}
        setEditingMovementId={setEditingMovementId}
        setMovementErrors={setMovementErrors}
        onSelectView={onSelectView}
        onNewMovement={onNewMovement}
        onEditMovement={onEditMovement}
        onDeleteMovement={onDeleteMovement}
        onSubmitMovement={onSubmitMovement}
        onSubmitGoal={onSubmitGoal}
        onCancelGoalEdit={onCancelGoalEdit}
        onEditGoal={onEditGoal}
        onDeleteGoal={onDeleteGoal}
        onExport={onExport}
        onImport={onImport}
        onCheckUpdates={onCheckUpdates}
        onInstallUpdate={onInstallUpdate}
        onProfileChange={onProfileChange}
        onSavePreferences={onSavePreferences}
        onAddDeadline={onAddDeadline}
        onUpdateDeadline={onUpdateDeadline}
        onDeleteDeadline={onDeleteDeadline}
        onToggleDeadlineOccurrence={onToggleDeadlineOccurrence}
        onCreateCategory={onCreateCategory}
        onDeleteCategory={onDeleteCategory}
        onThemeChange={onThemeChange}
        onRestartSetup={onRestartSetup}
      />
  )
}
