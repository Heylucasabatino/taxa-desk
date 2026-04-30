import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import './App.css'
import { AppFrame } from './components/AppFrame'
import { ImportPreviewDialog, type PendingImport } from './components/ImportPreviewDialog'
import { type MovementFormState } from './components/MovementDrawer'
import { SummaryStrip } from './components/SummaryStrip'
import { ViewSwitch } from './components/ViewSwitch'
import { useAppData } from './hooks/useAppData'
import { useHashView } from './hooks/useHashView'
import { useToast } from './hooks/useToast'
import {
  addGoal,
  addMovement,
  db,
  deleteRecord,
  exportBackup,
  importBackup,
  parseBackupPayload,
  saveProfile,
} from './lib/db'
import {
  estimateFiscalPosition,
  filterMovementsByYear,
  getAvailableYears,
  type Goal,
  type Movement,
  type MovementType,
  type TaxProfile,
} from './lib/finance'
import { type ActiveView } from './lib/routing'
import { type GoalFormState } from './components/GoalForm'
import { SetupView } from './views/SetupView'

const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const minYear = 1900
const maxYear = currentYear + 5

function clampYear(year: number) {
  return Math.min(maxYear, Math.max(minYear, year))
}

function App() {
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [movementType, setMovementType] = useState<MovementType>('income')
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [movementErrors, setMovementErrors] = useState<Partial<Record<keyof MovementFormState, string>>>({})
  const [goalErrors, setGoalErrors] = useState<Partial<Record<keyof GoalFormState, string>>>({})
  const backupInputRef = useRef<HTMLInputElement>(null)
  const { toast, notify } = useToast()
  const { appData, movements, goals, profile } = useAppData()
  const handleViewChange = useCallback((view: ActiveView) => {
    setDrawerOpen(view === 'movements')
  }, [])
  const { activeView, selectView } = useHashView(handleViewChange)
  const [movementForm, setMovementForm] = useState<MovementFormState>({
    date: today,
    description: '',
    category: 'Sedute',
    amount: '',
    status: 'collected',
    notes: '',
  })
  const [goalForm, setGoalForm] = useState<GoalFormState>({
    name: '',
    targetAmount: '',
    savedAmount: '',
    targetDate: today,
  })

  const availableYears = useMemo(
    () => [...new Set([...getAvailableYears(movements, currentYear), selectedYear])]
      .filter((year) => year >= minYear && year <= maxYear)
      .sort((a, b) => b - a),
    [movements, selectedYear],
  )
  const annualMovements = useMemo(
    () => filterMovementsByYear(movements, selectedYear),
    [movements, selectedYear],
  )
  const fiscalEstimate = useMemo(
    () => estimateFiscalPosition(annualMovements, profile, selectedYear),
    [annualMovements, profile, selectedYear],
  )

  function setType(type: MovementType) {
    setMovementType(type)
    setMovementErrors({})
    setMovementForm((form) => ({
      ...form,
      category: type === 'income' ? 'Sedute' : 'Spesa fissa',
      status: type === 'income' ? 'collected' : 'paid',
    }))
  }

  function openNewMovement() {
    selectView('movements')
    setEditingMovementId(null)
    setMovementType('income')
    setMovementErrors({})
    setMovementForm({
      date: today,
      description: '',
      category: 'Sedute',
      amount: '',
      status: 'collected',
      notes: '',
    })
    setDrawerOpen(true)
  }

  function editMovement(movement: Movement) {
    selectView('movements')
    setEditingMovementId(movement.id ?? null)
    setMovementType(movement.type)
    setMovementErrors({})
    setMovementForm({
      date: movement.date,
      description: movement.description,
      category: movement.category,
      amount: String(movement.amount),
      status: movement.status,
      notes: movement.notes ?? '',
    })
    setDrawerOpen(true)
  }

  async function submitMovement(event: FormEvent) {
    event.preventDefault()
    const amount = Number(movementForm.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setMovementErrors({ amount: 'Inserisci un importo maggiore di zero.' })
      return
    }

    const nextMovement: Movement = {
      id: editingMovementId ?? undefined,
      date: movementForm.date,
      type: movementType,
      description:
        movementForm.description ||
        (movementType === 'income' ? 'Introito' : 'Spesa'),
      category: movementForm.category || 'Altro',
      amount,
      status: movementForm.status,
      notes: movementForm.notes,
    }

    if (editingMovementId) {
      await db.movements.put(nextMovement)
    } else {
      await addMovement(nextMovement)
    }

    setMovementForm({ ...movementForm, description: '', amount: '', notes: '' })
    setMovementErrors({})
    setEditingMovementId(null)
    setDrawerOpen(false)
    notify(editingMovementId ? 'Movimento aggiornato.' : 'Movimento salvato.')
  }

  async function submitGoal(event: FormEvent) {
    event.preventDefault()
    const targetAmount = Number(goalForm.targetAmount)

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setGoalErrors({ targetAmount: 'Inserisci un target maggiore di zero.' })
      return
    }

    const nextGoal: Goal = {
      id: editingGoalId ?? undefined,
      name: goalForm.name || 'Obiettivo',
      targetAmount,
      savedAmount: Number(goalForm.savedAmount) || 0,
      targetDate: goalForm.targetDate,
    }

    if (editingGoalId) {
      await db.goals.put(nextGoal)
    } else {
      await addGoal(nextGoal)
    }

    setGoalForm({ name: '', targetAmount: '', savedAmount: '', targetDate: today })
    setGoalErrors({})
    setEditingGoalId(null)
    notify(editingGoalId ? 'Obiettivo aggiornato.' : 'Obiettivo creato.')
  }

  function editGoal(goal: Goal) {
    setEditingGoalId(goal.id ?? null)
    setGoalErrors({})
    setGoalForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      targetDate: goal.targetDate,
    })
    selectView('goals')
  }

  async function removeGoal(id?: string) {
    if (!id) return
    const goal = goals.find((item) => item.id === id)

    await deleteRecord('goals', id)
    notify('Obiettivo eliminato.', goal ? {
      actionLabel: 'Ripristina',
      onAction: () => {
        db.goals.put(goal).then(() => notify('Obiettivo ripristinato.'))
      },
    } : undefined)
  }

  async function updateProfile(field: keyof TaxProfile, value: string | boolean) {
    await saveProfile({
      ...profile,
      [field]: typeof value === 'boolean' ? value : Number(value),
    })
  }

  async function removeMovement(id?: string) {
    if (!id) return
    const movement = movements.find((item) => item.id === id)

    await deleteRecord('movements', id)
    notify('Movimento eliminato.', movement ? {
      actionLabel: 'Ripristina',
      onAction: () => {
        db.movements.put(movement).then(() => notify('Movimento ripristinato.'))
      },
    } : undefined)
  }

  async function handleExport() {
    await exportBackup()
    notify('Backup esportato.')
  }

  async function handleImport(file?: File) {
    if (!file) return

    try {
      const payload = parseBackupPayload(JSON.parse(await file.text()))

      setPendingImport({ fileName: file.name, payload })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Import non riuscito.')
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = ''
    }
  }

  async function confirmImport() {
    if (!pendingImport) return

    await importBackup(pendingImport.payload)
    setPendingImport(null)
    notify('Backup importato.')
  }

  if (!appData) {
    return <main className="loading">Caricamento dati locali...</main>
  }

  if (!profile.setupCompleted) {
    return (
      <SetupView
        profile={profile}
        onComplete={async (configuredProfile) => {
          await saveProfile({ ...configuredProfile, setupCompleted: true })
          notify('Profilo iniziale configurato.')
        }}
      />
    )
  }

  return (
    <AppFrame
      activeView={activeView}
      selectedYear={selectedYear}
      availableYears={availableYears}
      profile={profile}
      toast={toast}
      backupInputRef={backupInputRef}
      onSelectView={selectView}
      onSetYear={(year) => setSelectedYear(clampYear(year))}
      onExport={handleExport}
      onImportFile={handleImport}
      modals={pendingImport ? (
        <ImportPreviewDialog pendingImport={pendingImport} onCancel={() => setPendingImport(null)} onConfirm={confirmImport} />
      ) : null}
    >
        {activeView !== 'profile' && activeView !== 'backup' && annualMovements.length > 0 ? (
          <SummaryStrip estimate={fiscalEstimate} expenseTotal={fiscalEstimate.expenses} />
        ) : null}

        <ViewSwitch activeView={activeView} annualMovements={annualMovements} goals={goals} profile={profile} fiscalEstimate={fiscalEstimate} selectedYear={selectedYear} drawerOpen={drawerOpen} movementType={movementType} movementForm={movementForm} movementErrors={movementErrors} goalForm={goalForm} goalErrors={goalErrors} editingMovementId={editingMovementId} editingGoalId={editingGoalId} setMovementForm={setMovementForm} setGoalForm={setGoalForm} setType={setType} setDrawerOpen={setDrawerOpen} setEditingMovementId={setEditingMovementId} setMovementErrors={setMovementErrors} onSelectView={selectView} onNewMovement={openNewMovement} onEditMovement={editMovement} onDeleteMovement={removeMovement} onSubmitMovement={submitMovement} onSubmitGoal={submitGoal} onCancelGoalEdit={() => {
          setEditingGoalId(null)
          setGoalErrors({})
          setGoalForm({ name: '', targetAmount: '', savedAmount: '', targetDate: today })
        }} onEditGoal={editGoal} onDeleteGoal={removeGoal} onExport={handleExport} onImport={() => backupInputRef.current?.click()} onProfileChange={updateProfile} onRestartSetup={() => saveProfile({ ...profile, setupCompleted: false })} />

    </AppFrame>
  )
}

export default App
