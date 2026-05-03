import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { FluentProvider, webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components'
import './App.css'
import { AppContent } from './components/AppContent'
import { AppFrame } from './components/AppFrame'
import { FloatingAssist } from './components/FloatingAssist'
import { ImportPreviewDialog, type PendingImport } from './components/ImportPreviewDialog'
import { type MovementFormState } from './components/MovementDrawer'
import { useAppData } from './hooks/useAppData'
import { useHashView } from './hooks/useHashView'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import { estimateFiscalPosition, filterMovementsByYear, getAvailableYears, type AppPreferences, type Goal, type Movement, type MovementType, type PersonalDeadline, type TaxProfile } from './lib/finance'
import { type ActiveView } from './lib/routing'
import { appStorage, type PortableDiagnostics } from './lib/storage'
import { checkForAppUpdate, checkForPortableUpdate, formatUpdaterError, getDownloadProgress, initialUpdateState, installPortableUpdate, isTauriRuntime, openFeedbackPage, openLatestReleasePage, readInstalledVersion, readLastUpdaterError, toPortableUpdateState, toUpdateState, type PortableUpdateInfo, type UpdateState } from './lib/updates'
import { type GoalFormState } from './components/GoalForm'
import { SetupView } from './views/SetupView'
import type { Update } from '@tauri-apps/plugin-updater'
import { open } from '@tauri-apps/plugin-dialog'
import { MigrationPreviewDialog } from './components/MigrationPreviewDialog'
import type { BackupFilePreview } from './lib/storage'
const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const minYear = 1900
const maxYear = currentYear + 5
const fluentLightTheme: Theme = {
  ...webLightTheme,
  fontFamilyBase: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  colorBrandBackground: '#0f766e',
  colorBrandBackgroundHover: '#0b6962',
  colorBrandBackgroundPressed: '#084c47',
  colorBrandForeground1: '#0b5f59',
  colorCompoundBrandForeground1: '#0b5f59',
  colorCompoundBrandForeground1Hover: '#084c47',
}
const fluentDarkTheme: Theme = {
  ...webDarkTheme,
  fontFamilyBase: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
  colorBrandBackground: '#39d0c1',
  colorBrandBackgroundHover: '#6ee7d8',
  colorBrandBackgroundPressed: '#9af1e6',
  colorBrandForeground1: '#6ee7d8',
  colorCompoundBrandForeground1: '#6ee7d8',
  colorCompoundBrandForeground1Hover: '#9af1e6',
}
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
  const [pendingMigration, setPendingMigration] = useState<{ path: string; preview: BackupFilePreview } | null>(null)
  const [migrationImporting, setMigrationImporting] = useState(false)
  const [diagnostics, setDiagnostics] = useState<PortableDiagnostics | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>(initialUpdateState)
  const [movementErrors, setMovementErrors] = useState<Partial<Record<keyof MovementFormState, string>>>({})
  const [goalErrors, setGoalErrors] = useState<Partial<Record<keyof GoalFormState, string>>>({})
  const backupInputRef = useRef<HTMLInputElement>(null)
  const pendingUpdateRef = useRef<Update | null>(null)
  const pendingPortableUpdateRef = useRef<PortableUpdateInfo | null>(null)
  const { toast, notify } = useToast()
  const { theme, setTheme } = useTheme()
  const { appData, movements, goals, profile, categories, deadlines, preferences } = useAppData(notify)
  const handleViewChange = useCallback((view: ActiveView) => {
    setDrawerOpen(view === 'movements')
  }, [])
  const { activeView, selectView } = useHashView(handleViewChange)
  const fluentTheme = document.documentElement.dataset.theme === 'dark'
    ? fluentDarkTheme
    : fluentLightTheme
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
  useEffect(() => {
    let active = true

    readInstalledVersion().then((currentVersion) => {
      if (active) {
        setUpdateState((state) => ({ ...state, currentVersion }))
      }
    }).catch(() => undefined)

    appStorage.getDiagnostics().then((nextDiagnostics) => {
      if (active) setDiagnostics(nextDiagnostics)
    }).catch(() => {
      if (active) setDiagnostics(null)
    })

    return () => {
      active = false
    }
  }, [appData])

  useEffect(() => {
    let cancelled = false

    readLastUpdaterError().then((entry) => {
      if (cancelled || !entry) return
      notify(`L'aggiornamento precedente non e' riuscito: ${entry.message}`)
    }).catch(() => undefined)

    return () => {
      cancelled = true
    }
    // Run once on mount: consume the marker file written by the portable updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
      await appStorage.updateMovement(nextMovement)
    } else {
      await appStorage.addMovement(nextMovement)
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
      await appStorage.updateGoal(nextGoal)
    } else {
      await appStorage.addGoal(nextGoal)
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

    await appStorage.deleteGoal(id)
    notify('Obiettivo eliminato.', goal ? {
      actionLabel: 'Ripristina',
      onAction: () => {
        appStorage.restoreGoal(goal).then(() => notify('Obiettivo ripristinato.'))
      },
    } : undefined)
  }
  async function updateProfile(field: keyof TaxProfile, value: string | boolean) {
    await appStorage.saveProfile({
      ...profile,
      [field]: typeof value === 'boolean' ? value : Number(value),
    })
  }
  async function savePreferences(nextPreferences: AppPreferences) {
    await appStorage.savePreferences(nextPreferences)
    notify('Preferenze aggiornate.')
  }
  async function addDeadline(deadline: PersonalDeadline) {
    await appStorage.addDeadline(deadline)
    notify('Scadenza personale salvata.')
  }
  async function updateDeadline(deadline: PersonalDeadline) {
    await appStorage.updateDeadline(deadline)
    notify('Scadenza personale aggiornata.')
  }
  async function removeDeadline(id?: string) {
    if (!id) return
    await appStorage.deleteDeadline(id)
    notify('Scadenza personale eliminata.')
  }
  async function toggleDeadlineOccurrence(deadline: PersonalDeadline, occurrenceDate: string) {
    const completed = new Set(deadline.completedOccurrences ?? [])
    if (completed.has(occurrenceDate)) {
      completed.delete(occurrenceDate)
    } else {
      completed.add(occurrenceDate)
    }

    await appStorage.updateDeadline({
      ...deadline,
      completedOccurrences: [...completed].sort(),
    })
  }
  async function removeMovement(id?: string) {
    if (!id) return
    const movement = movements.find((item) => item.id === id)

    await appStorage.deleteMovement(id)
    notify('Movimento eliminato.', movement ? {
      actionLabel: 'Ripristina',
      onAction: () => {
        appStorage.restoreMovement(movement).then(() => notify('Movimento ripristinato.'))
      },
    } : undefined)
  }
  async function createCategory(type: MovementType, name: string) {
    const trimmedName = name.trim()

    if (trimmedName) {
      await appStorage.addCategory({ type, name: trimmedName })
      notify('Categoria aggiunta.')
    }
  }
  async function removeCategory(id?: string) {
    if (!id) return
    const category = categories.find((item) => item.id === id)
    const isInUse = category
      ? movements.some((movement) => movement.category === category.name)
      : false

    if (isInUse) {
      notify('Categoria in uso: modifica prima i movimenti collegati.')
      return
    }
    await appStorage.deleteCategory(id)
    notify('Categoria eliminata.')
  }
  async function handleExport() {
    const path = await appStorage.exportBackup()
    notify(path ? `Backup esportato in ${path}` : 'Backup esportato.')
  }
  async function handleCheckUpdates() {
    if (!isTauriRuntime()) {
      setUpdateState((state) => ({
        ...state,
        phase: 'unsupported',
        error: 'Gli aggiornamenti online sono disponibili solo nell’app desktop.',
      }))
      return
    }

    pendingUpdateRef.current?.close().catch(() => undefined)
    pendingUpdateRef.current = null
    pendingPortableUpdateRef.current = null
    setUpdateState((state) => ({
      phase: 'checking',
      currentVersion: state.currentVersion,
    }))

    try {
      const currentVersion = await readInstalledVersion()
      const portableUpdate = await checkForPortableUpdate(currentVersion)

      if (portableUpdate) {
        pendingPortableUpdateRef.current = portableUpdate
        setUpdateState(toPortableUpdateState(portableUpdate, currentVersion))
        notify(`Aggiornamento portable ${portableUpdate.version} disponibile.`)
        return
      }

      const update = await checkForAppUpdate()

      if (!update) {
        setUpdateState({
          phase: 'none',
          currentVersion,
          channel: diagnostics ? 'portable' : 'installer',
        })
        notify('Nessun aggiornamento disponibile.')
        return
      }

      pendingUpdateRef.current = update
      setUpdateState(toUpdateState(update, currentVersion))
      notify(`Aggiornamento ${update.version} disponibile.`)
    } catch (error) {
      setUpdateState((state) => ({
        ...state,
        phase: 'error',
        error: formatUpdaterError(error),
      }))
    }
  }
  async function handleInstallUpdate() {
    const portableUpdate = pendingPortableUpdateRef.current
    const update = pendingUpdateRef.current

    if (!portableUpdate && !update) {
      setUpdateState((state) => ({
        ...state,
        phase: 'error',
        error: 'Verifica prima la disponibilita di un aggiornamento.',
      }))
      return
    }

    const confirmed = window.confirm(
      'Prima dell’installazione verra creato un backup JSON locale. L’app potrebbe chiudersi durante l’aggiornamento. Continuare?',
    )

    if (!confirmed) return

    try {
      setUpdateState((state) => ({ ...state, phase: 'backup', error: undefined }))
      const backupPath = await appStorage.exportBackup()
      setUpdateState((state) => ({ ...state, backupPath, phase: 'downloading', progress: 0 }))

      if (portableUpdate) {
        await installPortableUpdate(portableUpdate)
        setUpdateState((state) => ({ ...state, phase: 'installing', progress: 100 }))
        return
      }

      if (!update) {
        throw new Error('Aggiornamento installer non disponibile.')
      }

      let downloadedBytes = 0
      let contentLength = 0

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength ?? 0
          setUpdateState((state) => ({ ...state, phase: 'downloading', progress: 0 }))
          return
        }

        if (event.event === 'Progress') {
          downloadedBytes = getDownloadProgress(event, downloadedBytes)
          setUpdateState((state) => ({
            ...state,
            phase: 'downloading',
            progress: contentLength > 0 ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100)) : undefined,
          }))
          return
        }

        setUpdateState((state) => ({ ...state, phase: 'installing', progress: 100 }))
      })

      pendingUpdateRef.current = null
      pendingPortableUpdateRef.current = null
      setUpdateState((state) => ({ ...state, phase: 'installed', progress: 100 }))
      notify('Aggiornamento installato. Riavvia l’app se resta aperta.')
    } catch (error) {
      setUpdateState((state) => ({
        ...state,
        phase: 'error',
        error: formatUpdaterError(error),
      }))
    }
  }
  async function handleOpenDownloadPage() {
    try {
      await openLatestReleasePage()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Impossibile aprire la pagina download.')
    }
  }
  async function handleOpenFeedbackPage() {
    try {
      await openFeedbackPage()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Impossibile aprire la pagina feedback.')
    }
  }
  async function handleStartBackupMigration() {
    if (!isTauriRuntime()) {
      notify('La migrazione guidata è disponibile solo nell’app desktop.')
      return
    }

    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'Backup Taxa Desk', extensions: ['json'] }],
      })

      if (!selected || Array.isArray(selected)) return

      const preview = await appStorage.inspectBackupFile(selected)
      setPendingMigration({ path: selected, preview })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Impossibile leggere il backup selezionato.')
    }
  }
  async function confirmBackupMigration() {
    if (!pendingMigration) return

    setMigrationImporting(true)
    try {
      const result = await appStorage.importBackupFile(pendingMigration.path)
      setPendingMigration(null)
      notify(`Migrazione completata. Backup pre-import creato in ${result.backupPath}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Migrazione non riuscita.')
    } finally {
      setMigrationImporting(false)
    }
  }
  async function handleImport(file?: File) {
    if (!file) return

    try {
      const payload = appStorage.parseBackupPayload(JSON.parse(await file.text()))
      setPendingImport({ fileName: file.name, payload })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Import non riuscito.')
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = ''
    }
  }
  async function confirmImport() {
    if (!pendingImport) return

    await appStorage.importBackup(pendingImport.payload)
    setPendingImport(null)
    notify('Backup importato.')
  }
  function cancelGoalEdit() {
    setEditingGoalId(null)
    setGoalErrors({})
    setGoalForm({
      name: '',
      targetAmount: '',
      savedAmount: '',
      targetDate: today,
    })
  }
  const contentProps = { activeView, annualMovements, goals, profile, categories, deadlines, preferences, theme, fiscalEstimate, selectedYear,
    drawerOpen, movementType, movementForm, movementErrors, goalForm, goalErrors, editingMovementId, editingGoalId,
    setMovementForm, setGoalForm, setType, setDrawerOpen, setEditingMovementId, setMovementErrors,
    diagnostics, updateState,
    onSelectView: selectView, onNewMovement: openNewMovement, onEditMovement: editMovement, onDeleteMovement: removeMovement,
    onSubmitMovement: submitMovement, onSubmitGoal: submitGoal, onCancelGoalEdit: cancelGoalEdit, onEditGoal: editGoal,
    onDeleteGoal: removeGoal, onExport: handleExport, onImport: () => backupInputRef.current?.click(), onCheckUpdates: handleCheckUpdates,
    onInstallUpdate: handleInstallUpdate, onOpenDownloadPage: handleOpenDownloadPage, onOpenFeedbackPage: handleOpenFeedbackPage, onProfileChange: updateProfile,
    onStartBackupMigration: handleStartBackupMigration,
    onSavePreferences: savePreferences, onAddDeadline: addDeadline, onUpdateDeadline: updateDeadline,
    onDeleteDeadline: removeDeadline, onToggleDeadlineOccurrence: toggleDeadlineOccurrence,
    onCreateCategory: createCategory, onDeleteCategory: removeCategory, onThemeChange: setTheme,
    onRestartSetup: () => appStorage.saveProfile({ ...profile, setupCompleted: false }) }

  if (!appData) {
    return <FluentProvider theme={fluentTheme}><main className="loading">Caricamento dati locali...</main></FluentProvider>
  }

  if (!profile.setupCompleted) {
    return (
      <FluentProvider theme={fluentTheme}><SetupView profile={profile} onComplete={async (configuredProfile) => {
          await appStorage.saveProfile({ ...configuredProfile, setupCompleted: true })
          notify('Profilo iniziale configurato.')
        }} /></FluentProvider>
    )
  }

  return (
    <FluentProvider theme={fluentTheme}>
    <AppFrame activeView={activeView} selectedYear={selectedYear} availableYears={availableYears}
      movements={annualMovements} diagnostics={diagnostics}
      toast={toast} backupInputRef={backupInputRef} onSelectView={selectView}
      hasUpdateAvailable={updateState.phase === 'available'}
      onSetYear={(year) => setSelectedYear(clampYear(year))} onNewMovement={openNewMovement} onExport={handleExport} onImportFile={handleImport}
      modals={
        pendingImport ? (
          <ImportPreviewDialog pendingImport={pendingImport} onCancel={() => setPendingImport(null)} onConfirm={confirmImport} />
        ) : pendingMigration ? (
          <MigrationPreviewDialog
            preview={pendingMigration.preview}
            importing={migrationImporting}
            onCancel={() => setPendingMigration(null)}
            onConfirm={confirmBackupMigration}
          />
        ) : null
      }>
      <AppContent {...contentProps} />
      <FloatingAssist
        updateState={updateState}
        onInstallUpdate={handleInstallUpdate}
        onOpenFeedbackPage={handleOpenFeedbackPage}
        onShowUpdates={() => selectView('backup')}
      />
    </AppFrame>
    </FluentProvider>
  )
}

export default App
