import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { NumericFormat } from 'react-number-format'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Goal as GoalIcon,
  Home,
  Info,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  Target,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import './App.css'
import {
  addGoal,
  addMovement,
  db,
  deleteRecord,
  ensureMovementMigration,
  exportBackup,
  importBackup,
  saveProfile,
} from './lib/db'
import {
  defaultTaxProfile,
  estimateFiscalPosition,
  estimateGoalPlan,
  filterMovementsByYear,
  formatCurrency,
  formatPercent,
  getAvailableYears,
  type FiscalEstimate,
  type Goal,
  type Movement,
  type MovementStatus,
  type MovementType,
  type TaxProfile,
} from './lib/finance'

type ActiveView =
  | 'overview'
  | 'movements'
  | 'reserves'
  | 'goals'
  | 'deadlines'
  | 'analytics'
  | 'profile'
  | 'backup'

type Toast = {
  id: number
  message: string
}

const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const emptyMovements: Movement[] = []
const emptyGoals: Goal[] = []

const navItems: Array<[ActiveView, string, typeof Home]> = [
  ['overview', 'Panoramica', Home],
  ['movements', 'Movimenti', ArrowUpFromLine],
  ['reserves', 'Accantonamenti', WalletCards],
  ['goals', 'Obiettivi', Target],
  ['deadlines', 'Scadenze', CalendarDays],
  ['analytics', 'Analisi', BarChart3],
  ['profile', 'Profilo fiscale', SlidersHorizontal],
  ['backup', 'Dati & backup', Database],
]

const incomeStatuses: Array<[MovementStatus, string]> = [
  ['collected', 'Incassato'],
  ['pending', 'Da incassare'],
]

const expenseStatuses: Array<[MovementStatus, string]> = [
  ['paid', 'Pagata'],
  ['to_pay', 'Da pagare'],
]

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [movementType, setMovementType] = useState<MovementType>('income')
  const [toast, setToast] = useState<Toast | null>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [movementForm, setMovementForm] = useState({
    date: today,
    description: '',
    category: 'Sedute',
    amount: '',
    status: 'collected' as MovementStatus,
    notes: '',
  })
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    savedAmount: '',
    targetDate: today,
  })

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    ensureMovementMigration().catch(console.error).finally(() => setIsReady(true))
  }, [])

  const appData = useLiveQuery(async () => {
    if (!isReady) return null

    const [movements, goals, profile] = await Promise.all([
      db.movements.orderBy('date').reverse().toArray(),
      db.goals.orderBy('targetDate').toArray(),
      db.settings.get('default'),
    ])

    return {
      movements,
      goals,
      profile: profile ?? { ...defaultTaxProfile, id: 'default' },
    }
  }, [isReady])

  const movements = appData?.movements ?? emptyMovements
  const goals = appData?.goals ?? emptyGoals
  const profile = appData?.profile ?? defaultTaxProfile
  const availableYears = useMemo(
    () => getAvailableYears(movements, currentYear),
    [movements],
  )
  const annualMovements = useMemo(
    () => filterMovementsByYear(movements, selectedYear),
    [movements, selectedYear],
  )
  const fiscalEstimate = useMemo(
    () => estimateFiscalPosition(annualMovements, profile),
    [annualMovements, profile],
  )
  const expenseTotal = fiscalEstimate.expenses
  const operationalMargin = fiscalEstimate.grossIncome - expenseTotal

  function notify(message: string) {
    const id = Date.now()

    setToast({ id, message })
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, 2800)
  }

  function selectView(view: ActiveView) {
    setActiveView(view)
    if (view !== 'movements') {
      setDrawerOpen(false)
    }
    if (view === 'movements') {
      setDrawerOpen(true)
    }
  }

  function setType(type: MovementType) {
    setMovementType(type)
    setMovementForm((form) => ({
      ...form,
      category: type === 'income' ? 'Sedute' : 'Spesa fissa',
      status: type === 'income' ? 'collected' : 'paid',
    }))
  }

  async function submitMovement(event: FormEvent) {
    event.preventDefault()

    await addMovement({
      date: movementForm.date,
      type: movementType,
      description:
        movementForm.description ||
        (movementType === 'income' ? 'Introito' : 'Spesa'),
      category: movementForm.category || 'Altro',
      amount: Number(movementForm.amount),
      status: movementForm.status,
      notes: movementForm.notes,
    })

    setMovementForm({
      ...movementForm,
      description: '',
      amount: '',
      notes: '',
    })
    setDrawerOpen(false)
    notify('Movimento salvato.')
  }

  async function submitGoal(event: FormEvent) {
    event.preventDefault()

    await addGoal({
      name: goalForm.name || 'Obiettivo',
      targetAmount: Number(goalForm.targetAmount),
      savedAmount: Number(goalForm.savedAmount),
      targetDate: goalForm.targetDate,
    })
    setGoalForm({ name: '', targetAmount: '', savedAmount: '', targetDate: today })
    notify('Obiettivo creato.')
  }

  async function updateProfile(field: keyof TaxProfile, value: string) {
    await saveProfile({
      ...profile,
      [field]: Number(value),
    })
  }

  async function removeMovement(id?: string) {
    if (!id) {
      return
    }

    await deleteRecord('movements', id)
    notify('Movimento eliminato.')
  }

  async function handleExport() {
    await exportBackup()
    notify('Backup esportato.')
  }

  async function handleImport(file?: File) {
    if (!file) {
      return
    }

    const confirmed = window.confirm(
      'Importare questo backup? I movimenti e gli obiettivi locali verranno sostituiti.',
    )

    if (!confirmed) {
      return
    }

    try {
      await importBackup(JSON.parse(await file.text()))
      notify('Backup importato.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Import non riuscito.')
    } finally {
      if (backupInputRef.current) {
        backupInputRef.current.value = ''
      }
    }
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
    <main className="ledger-app">
      <aside className="sidebar" aria-label="Navigazione principale">
        <div className="sidebar-head">
          <div className="app-mark" aria-hidden="true">FT</div>
        </div>
        <nav>
          {navItems.slice(0, 6).map(([view, label, Icon]) => (
            <button
              className={activeView === view ? 'active' : ''}
              type="button"
              key={view}
              onClick={() => selectView(view)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="nav-secondary">
          {navItems.slice(6).map(([view, label, Icon]) => (
            <button
              className={activeView === view ? 'active' : ''}
              type="button"
              key={view}
              onClick={() => selectView(view)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </div>
        <button className="info-link" type="button">
          <Info size={18} />
          Informazioni
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{viewTitle(activeView)}</h1>
            <p>
              Dati locali nel tuo browser <span aria-hidden="true" />
            </p>
          </div>
          <div className="topbar-actions">
            <div className="year-stepper">
              <button
                type="button"
                aria-label="Anno precedente"
                onClick={() => setSelectedYear((year) => year - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <select
                aria-label="Anno fiscale"
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Anno successivo"
                onClick={() => setSelectedYear((year) => year + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <button className="outline-button" type="button">
              Gen - Dic {selectedYear}
            </button>
            <button className="outline-button" type="button" onClick={handleExport}>
              <ArrowDownToLine size={16} />
              Backup
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => backupInputRef.current?.click()}
            >
              <ArrowUpFromLine size={16} />
              Importa
            </button>
            <input
              ref={backupInputRef}
              hidden
              type="file"
              accept="application/json"
              onChange={(event) => handleImport(event.target.files?.[0])}
            />
          </div>
        </header>

        {activeView !== 'profile' && activeView !== 'backup' ? (
          <SummaryStrip
            estimate={fiscalEstimate}
            expenseTotal={expenseTotal}
            operationalMargin={operationalMargin}
          />
        ) : null}

        <div className={activeView === 'movements' ? 'content-shell' : 'content-shell single'}>
          <section className="main-ledger">
            {activeView === 'overview' ? (
              <OverviewView
                movements={annualMovements}
                goals={goals}
                profile={profile}
                estimate={fiscalEstimate}
                onDelete={removeMovement}
                onGoToMovements={() => selectView('movements')}
                onGoToProfile={() => selectView('profile')}
                goalForm={goalForm}
                setGoalForm={setGoalForm}
                onSubmitGoal={submitGoal}
              />
            ) : null}
            {activeView === 'movements' ? (
              <MovementsView
                movements={annualMovements}
                onDelete={removeMovement}
                onNew={() => setDrawerOpen(true)}
                onExport={handleExport}
                onImport={() => backupInputRef.current?.click()}
              />
            ) : null}
            {activeView === 'reserves' ? (
              <ReservesView estimate={fiscalEstimate} profile={profile} />
            ) : null}
            {activeView === 'goals' ? (
              <GoalsView
                goals={goals}
                profile={profile}
                goalForm={goalForm}
                setGoalForm={setGoalForm}
                onSubmitGoal={submitGoal}
              />
            ) : null}
            {activeView === 'deadlines' ? <DeadlinesView selectedYear={selectedYear} /> : null}
            {activeView === 'analytics' ? (
              <AnalyticsView movements={annualMovements} />
            ) : null}
            {activeView === 'profile' ? (
              <ProfileView
                profile={profile}
                onChange={updateProfile}
                onRestartSetup={() =>
                  saveProfile({ ...profile, setupCompleted: false })
                }
              />
            ) : null}
            {activeView === 'backup' ? (
              <BackupView onExport={handleExport} onImport={() => backupInputRef.current?.click()} />
            ) : null}
          </section>

          {activeView === 'movements' && drawerOpen ? (
            <MovementDrawer
              movementType={movementType}
              movementForm={movementForm}
              setMovementForm={setMovementForm}
              setType={setType}
              onClose={() => setDrawerOpen(false)}
              onSubmit={submitMovement}
            />
          ) : null}
        </div>

        <footer className="app-footer">
          <span>
            Le cifre sono stime operative basate sul profilo fiscale configurato.
          </span>
          <span>
            Profilo: Forfettario {formatPercent(profile.substituteTaxRate)} ·
            Coeff. {formatPercent(profile.taxableCoefficient)}
          </span>
        </footer>
      </section>

      {toast ? <div className="toast">{toast.message}</div> : null}
    </main>
  )
}

function SummaryStrip({
  estimate,
  expenseTotal,
  operationalMargin,
}: {
  estimate: FiscalEstimate
  expenseTotal: number
  operationalMargin: number
}) {
  return (
    <section className="summary-strip" aria-label="Sintesi fondi">
      <SummaryItem
        label="Disponibile"
        value={formatCurrency(estimate.availableAfterReserve)}
        detail="Dopo spese e accantonamenti"
        tone="positive"
      />
      <SummaryItem
        label="Da accantonare"
        value={formatCurrency(estimate.totalReserve)}
        detail={`${formatPercent(estimate.effectiveReserveRate)} degli introiti`}
        tone="warning"
      />
      <SummaryItem
        label="Introiti"
        value={formatCurrency(estimate.grossIncome)}
        detail="Totale lordo"
      />
      <SummaryItem
        label="Spese"
        value={formatCurrency(expenseTotal)}
        detail="Totale macroscopiche"
      />
      <SummaryItem
        label="Margine operativo"
        value={formatCurrency(operationalMargin)}
        detail="Introiti - Spese"
        tone="positive"
      />
    </section>
  )
}

function SetupView({
  profile,
  onComplete,
}: {
  profile: TaxProfile
  onComplete: (profile: TaxProfile) => Promise<void>
}) {
  const [setupProfile, setSetupProfile] = useState<TaxProfile>({
    ...defaultTaxProfile,
    ...profile,
  })
  const [isSaving, setIsSaving] = useState(false)

  function updateField(field: keyof TaxProfile, value: number) {
    setSetupProfile((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function submitSetup(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    await onComplete(setupProfile)
  }

  return (
    <main className="setup-shell">
      <section className="setup-card">
        <div className="setup-intro">
          <div className="app-mark" aria-hidden="true">FT</div>
          <p>Configurazione iniziale</p>
          <h1>Prima rendiamo attendibili le stime.</h1>
          <span>
            Questi valori restano modificabili nel profilo fiscale. Servono solo
            a evitare una dashboard vuota con calcoli impliciti.
          </span>
        </div>

        <form className="setup-form" onSubmit={submitSetup}>
          <div className="setup-grid">
            <NumberSetting
              label="Coefficiente redditività"
              value={setupProfile.taxableCoefficient}
              onChange={(value) =>
                updateField('taxableCoefficient', Number(value))
              }
            />
            <NumberSetting
              label="Aliquota imposta sostitutiva"
              value={setupProfile.substituteTaxRate}
              onChange={(value) =>
                updateField('substituteTaxRate', Number(value))
              }
            />
            <NumberSetting
              label="Contributo soggettivo"
              value={setupProfile.pensionRate}
              onChange={(value) => updateField('pensionRate', Number(value))}
            />
            <CurrencyField
              label="Minimo soggettivo"
              value={setupProfile.pensionMinimum}
              onChange={(value) => updateField('pensionMinimum', value)}
            />
            <NumberSetting
              label="Contributo integrativo"
              value={setupProfile.integrativeRate}
              onChange={(value) => updateField('integrativeRate', Number(value))}
            />
            <CurrencyField
              label="Minimo integrativo"
              value={setupProfile.integrativeMinimum}
              onChange={(value) => updateField('integrativeMinimum', value)}
            />
          </div>

          <div className="setup-next">
            <strong>Dopo questo passaggio:</strong>
            <span>1. registra il primo introito;</span>
            <span>2. aggiungi eventuali spese macroscopiche;</span>
            <span>3. crea un obiettivo di risparmio.</span>
          </div>

          <div className="setup-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Salvataggio...' : 'Conferma e inizia'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

function OverviewView({
  movements,
  goals,
  profile,
  estimate,
  onDelete,
  onGoToMovements,
  onGoToProfile,
  goalForm,
  setGoalForm,
  onSubmitGoal,
}: {
  movements: Movement[]
  goals: Goal[]
  profile: TaxProfile
  estimate: FiscalEstimate
  onDelete: (id?: string) => void
  onGoToMovements: () => void
  onGoToProfile: () => void
  goalForm: GoalFormState
  setGoalForm: React.Dispatch<React.SetStateAction<GoalFormState>>
  onSubmitGoal: (event: FormEvent) => void
}) {
  return (
    <>
      {movements.length === 0 && goals.length === 0 ? (
        <FirstRunGuide
          onGoToMovements={onGoToMovements}
          onGoToProfile={onGoToProfile}
        />
      ) : null}
      <MovementsView
        movements={movements.slice(0, 5)}
        onDelete={onDelete}
        onNew={onGoToMovements}
        compact
      />
      <ReservesView estimate={estimate} profile={profile} compact />
      <GoalsView
        goals={goals}
        profile={profile}
        goalForm={goalForm}
        setGoalForm={setGoalForm}
        onSubmitGoal={onSubmitGoal}
        compact
      />
    </>
  )
}

function FirstRunGuide({
  onGoToMovements,
  onGoToProfile,
}: {
  onGoToMovements: () => void
  onGoToProfile: () => void
}) {
  return (
    <section className="first-run-panel">
      <div>
        <p>Primo utilizzo</p>
        <h2>Parti da un movimento reale.</h2>
        <span>
          Il profilo fiscale è configurato. Ora basta registrare un introito per
          far comparire accantonamenti, disponibile e margine operativo.
        </span>
      </div>
      <div className="first-run-actions">
        <button className="primary-button" type="button" onClick={onGoToMovements}>
          <Plus size={17} />
          Registra primo movimento
        </button>
        <button className="outline-button" type="button" onClick={onGoToProfile}>
          Controlla profilo fiscale
        </button>
      </div>
    </section>
  )
}

function MovementsView({
  movements,
  onDelete,
  onNew,
  onExport,
  onImport,
  compact = false,
}: {
  movements: Movement[]
  onDelete: (id?: string) => void
  onNew: () => void
  onExport?: () => void
  onImport?: () => void
  compact?: boolean
}) {
  return (
    <section className="ledger-section">
      <SectionHeader
        title="Movimenti"
        detail={compact ? 'Ultimi inseriti' : 'Registro annuale'}
        action={
          <div className="section-actions">
            {onImport ? (
              <button className="text-button" type="button" onClick={onImport}>
                <ArrowUpFromLine size={16} />
                Importa
              </button>
            ) : null}
            {onExport ? (
              <button className="text-button" type="button" onClick={onExport}>
                <ArrowDownToLine size={16} />
                Esporta
              </button>
            ) : null}
            <button className="primary-button" type="button" onClick={onNew}>
              <Plus size={17} />
              Nuovo
            </button>
          </div>
        }
      />
      <MovementTable movements={movements} onDelete={onDelete} onNew={onNew} />
    </section>
  )
}

function ReservesView({
  estimate,
  profile,
  compact = false,
}: {
  estimate: FiscalEstimate
  profile: TaxProfile
  compact?: boolean
}) {
  return (
    <section className="ledger-section">
      <SectionHeader
        title="Accantonamenti"
        detail={compact ? 'Stima immediata' : 'Stima aggiornata in tempo reale'}
      />
      <ReserveRows estimate={estimate} />
      {estimate.grossIncome > 0 && estimate.totalReserve > estimate.grossIncome ? (
        <p className="reserve-warning">
          I minimi previdenziali configurati superano gli introiti dell’anno:
          la stima iniziale può risultare più alta dei primi incassi.
        </p>
      ) : null}
      {!compact ? (
        <p className="section-note">
          Coefficiente {formatPercent(profile.taxableCoefficient)}, imposta{' '}
          {formatPercent(profile.substituteTaxRate)}, contributi configurabili.
        </p>
      ) : null}
    </section>
  )
}

function GoalsView({
  goals,
  profile,
  goalForm,
  setGoalForm,
  onSubmitGoal,
  compact = false,
}: {
  goals: Goal[]
  profile: TaxProfile
  goalForm: GoalFormState
  setGoalForm: React.Dispatch<React.SetStateAction<GoalFormState>>
  onSubmitGoal: (event: FormEvent) => void
  compact?: boolean
}) {
  return (
    <section className="ledger-section">
      <SectionHeader
        title="Obiettivi"
        detail={compact ? 'Prossimi traguardi' : 'Risparmio e lordo necessario'}
      />
      <GoalRows goals={goals} profile={profile} />
      <GoalForm
        goalForm={goalForm}
        setGoalForm={setGoalForm}
        onSubmit={onSubmitGoal}
      />
    </section>
  )
}

function AnalyticsView({ movements }: { movements: Movement[] }) {
  const incomeByCategory = groupMovements(movements, 'income')
  const expenseByCategory = groupMovements(movements, 'expense')
  const monthlyRows = groupByMonth(movements)

  return (
    <section className="ledger-section analytics-view">
      <SectionHeader title="Analisi" detail="Distribuzione per anno selezionato" />
      <div className="analytics-grid">
        <BarPanel title="Introiti per categoria" rows={incomeByCategory} tone="income" />
        <BarPanel title="Spese per categoria" rows={expenseByCategory} tone="expense" />
      </div>
      <div className="analysis-panel wide-analysis">
        <h3>Andamento mensile</h3>
        <div className="monthly-bars">
          {monthlyRows.map((row) => {
            const max = Math.max(...monthlyRows.map((item) => item.total), 1)

            return (
              <div className="month-row" key={row.label}>
                <span>{row.label}</span>
                <div>
                  <i style={{ width: `${(row.income / max) * 100}%` }} />
                  <em style={{ width: `${(row.expense / max) * 100}%` }} />
                </div>
                <strong>{formatCurrency(row.income - row.expense)}</strong>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ProfileView({
  profile,
  onChange,
  onRestartSetup,
}: {
  profile: TaxProfile
  onChange: (field: keyof TaxProfile, value: string) => void
  onRestartSetup: () => void
}) {
  return (
    <section className="ledger-section profile-view">
      <SectionHeader
        title="Profilo fiscale"
        detail="Parametri usati per le stime operative"
      />
      <div className="profile-grid large">
        <NumberSetting
          label="Coefficiente redditività"
          value={profile.taxableCoefficient}
          onChange={(value) => onChange('taxableCoefficient', value)}
        />
        <NumberSetting
          label="Aliquota imposta sostitutiva"
          value={profile.substituteTaxRate}
          onChange={(value) => onChange('substituteTaxRate', value)}
        />
        <NumberSetting
          label="Contributo soggettivo"
          value={profile.pensionRate}
          onChange={(value) => onChange('pensionRate', value)}
        />
        <CurrencyField
          label="Minimo soggettivo"
          value={profile.pensionMinimum}
          onChange={(value) => onChange('pensionMinimum', String(value))}
        />
        <NumberSetting
          label="Contributo integrativo"
          value={profile.integrativeRate}
          onChange={(value) => onChange('integrativeRate', value)}
        />
        <CurrencyField
          label="Minimo integrativo"
          value={profile.integrativeMinimum}
          onChange={(value) => onChange('integrativeMinimum', String(value))}
        />
      </div>
      <div className="profile-guide">
        <div>
          <strong>Configurazione guidata</strong>
          <span>
            Riapre il percorso iniziale senza cancellare movimenti, obiettivi o
            backup.
          </span>
        </div>
        <button className="outline-button" type="button" onClick={onRestartSetup}>
          Rivedi configurazione
        </button>
      </div>
    </section>
  )
}

function BackupView({
  onExport,
  onImport,
}: {
  onExport: () => void
  onImport: () => void
}) {
  return (
    <section className="ledger-section backup-view">
      <SectionHeader
        title="Dati & backup"
        detail="Portabilità locale del database"
      />
      <div className="backup-actions">
        <button className="primary-button" type="button" onClick={onExport}>
          <ArrowDownToLine size={17} />
          Esporta backup JSON
        </button>
        <button className="outline-button" type="button" onClick={onImport}>
          <ArrowUpFromLine size={17} />
          Importa backup JSON
        </button>
      </div>
      <p className="section-note">
        Il backup include movimenti, obiettivi, impostazioni fiscali e metadati di
        versione. L’import sostituisce movimenti e obiettivi locali dopo conferma.
      </p>
    </section>
  )
}

function DeadlinesView({ selectedYear }: { selectedYear: number }) {
  return (
    <section className="ledger-section deadlines-view">
      <SectionHeader title="Scadenze" detail="Promemoria operativo" />
      <div className="deadline-list">
        <DeadlineRow date={`30/06/${selectedYear}`} title="Saldo e primo acconto" />
        <DeadlineRow date={`30/11/${selectedYear}`} title="Secondo acconto" />
        <DeadlineRow date={`01/10/${selectedYear}`} title="Comunicazione e saldo previdenziale" />
      </div>
    </section>
  )
}

function MovementDrawer({
  movementType,
  movementForm,
  setMovementForm,
  setType,
  onClose,
  onSubmit,
}: {
  movementType: MovementType
  movementForm: MovementFormState
  setMovementForm: React.Dispatch<React.SetStateAction<MovementFormState>>
  setType: (type: MovementType) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <aside className="drawer" aria-label="Nuovo movimento">
      <div className="drawer-header">
        <h2>Nuovo movimento</h2>
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
            {(movementType === 'income'
              ? ['Sedute', 'Consulenze', 'Valutazioni', 'Altro']
              : [
                  'Spesa fissa',
                  'Servizi professionali',
                  'Quote e iscrizioni',
                  'Software',
                  'Altro',
                ]
            ).map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <CurrencyField
          label="Importo"
          value={movementForm.amount}
          onChange={(value) =>
            setMovementForm({ ...movementForm, amount: String(value) })
          }
          required
        />
        <Field label="Stato">
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
            Salva
          </button>
          <button className="outline-button" type="button" onClick={onClose}>
            Annulla
          </button>
        </div>
      </form>
    </aside>
  )
}

type MovementFormState = {
  date: string
  description: string
  category: string
  amount: string
  status: MovementStatus
  notes: string
}

type GoalFormState = {
  name: string
  targetAmount: string
  savedAmount: string
  targetDate: string
}

function SummaryItem({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone?: 'positive' | 'warning'
}) {
  return (
    <article className="summary-item">
      <div>
        <span>{label}</span>
        <Info size={14} />
      </div>
      <strong className={tone}>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function SectionHeader({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <span>{detail}</span>
      </div>
      {action}
    </div>
  )
}

function MovementTable({
  movements,
  onDelete,
  onNew,
}: {
  movements: Movement[]
  onDelete: (id?: string) => void
  onNew?: () => void
}) {
  if (movements.length === 0) {
    return (
      <div className="empty-ledger">
        <strong>Nessun movimento registrato</strong>
        <span>Aggiungi il primo introito o una spesa per vedere le stime aggiornarsi.</span>
        {onNew ? (
          <button className="text-button empty-action" type="button" onClick={onNew}>
            <Plus size={15} />
            Registra movimento
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrizione</th>
            <th>Categoria</th>
            <th>Importo</th>
            <th>Stato</th>
            <th aria-label="Azioni" />
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td>{formatDate(movement.date)}</td>
              <td>
                <span className={`type-cell ${movement.type}`}>
                  {movement.type === 'income' ? (
                    <ArrowUp size={15} />
                  ) : (
                    <ArrowDown size={15} />
                  )}
                  {movement.type === 'income' ? 'Introito' : 'Spesa'}
                </span>
              </td>
              <td>{movement.description}</td>
              <td>{movement.category}</td>
              <td className={movement.type === 'income' ? 'amount-income' : 'amount-expense'}>
                {formatCurrency(movement.amount)}
              </td>
              <td>
                <span className="status-chip">{statusLabel(movement.status)}</span>
              </td>
              <td>
                <button
                  className="row-action"
                  type="button"
                  aria-label={`Elimina ${movement.description}`}
                  onClick={() => onDelete(movement.id)}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReserveRows({ estimate }: { estimate: FiscalEstimate }) {
  if (estimate.totalReserve <= 0) {
    return (
      <div className="empty-ledger compact-empty">
        <strong>Accantonamenti non ancora calcolabili</strong>
        <span>Registra un introito nell’anno selezionato per stimare imposta e contributi.</span>
      </div>
    )
  }

  const rows = [
    ['Imposta sostitutiva', estimate.substituteTaxDue, estimate.substituteTaxDue * 1.65],
    ['Contributo soggettivo', estimate.pensionDue, estimate.pensionDue * 1.65],
    ['Contributo integrativo', estimate.integrativeDue, estimate.integrativeDue * 2],
  ] as const
  const max = Math.max(...rows.map(([, , projected]) => projected), 1)

  return (
    <div className="reserve-rows">
      {rows.map(([label, value, projected]) => (
        <div className="reserve-row" key={label}>
          <span>{label}</span>
          <strong>{formatCurrency(value)}</strong>
          <div className="reserve-track">
            <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
            <em style={{ width: `${Math.min(100, (projected / max) * 100)}%` }} />
          </div>
          <b>{formatCurrency(projected)}</b>
        </div>
      ))}
      <div className="reserve-total">
        <span>Totale da accantonare</span>
        <strong>{formatCurrency(estimate.totalReserve)}</strong>
      </div>
    </div>
  )
}

function GoalRows({
  goals,
  profile,
}: {
  goals: Goal[]
  profile: TaxProfile
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
            <button className="row-action" type="button" aria-label="Menu obiettivo">
              <MoreVertical size={16} />
            </button>
          </article>
        )
      })}
    </div>
  )
}

function GoalForm({
  goalForm,
  setGoalForm,
  onSubmit,
}: {
  goalForm: GoalFormState
  setGoalForm: React.Dispatch<React.SetStateAction<GoalFormState>>
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <form className="inline-goal-form" onSubmit={onSubmit}>
      <input
        value={goalForm.name}
        placeholder="Nuovo obiettivo"
        onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
      />
      <CurrencyInput
        value={goalForm.targetAmount}
        placeholder="Target"
        required
        onChange={(value) =>
          setGoalForm({ ...goalForm, targetAmount: String(value) })
        }
      />
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
        Salva obiettivo
      </button>
    </form>
  )
}

function CurrencyField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: number | string
  onChange: (value: number) => void
  required?: boolean
}) {
  return (
    <Field label={label}>
      <CurrencyInput value={value} onChange={onChange} required={required} />
    </Field>
  )
}

function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00 €',
  required = false,
}: {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  required?: boolean
}) {
  const displayValue = value === 0 || value === '0' ? '' : value

  return (
    <NumericFormat
      value={displayValue}
      decimalScale={2}
      decimalSeparator=","
      thousandSeparator="."
      fixedDecimalScale={false}
      suffix=" €"
      allowNegative={false}
      placeholder={placeholder}
      required={required}
      onValueChange={(values) => onChange(values.floatValue ?? 0)}
    />
  )
}

function BarPanel({
  title,
  rows,
  tone,
}: {
  title: string
  rows: Array<{ label: string; value: number }>
  tone: 'income' | 'expense'
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="analysis-panel">
      <h3>{title}</h3>
      {rows.length > 0 ? (
        rows.map((row) => (
          <div className="analysis-row" key={row.label}>
            <span>{row.label}</span>
            <div>
              <i className={tone} style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
            <strong>{formatCurrency(row.value)}</strong>
          </div>
        ))
      ) : (
        <p className="empty-text">Nessun dato disponibile.</p>
      )}
    </div>
  )
}

function DeadlineRow({ date, title }: { date: string; title: string }) {
  return (
    <div className="deadline-row">
      <strong>{date}</strong>
      <span>{title}</span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NumberSetting({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function groupMovements(movements: Movement[], type: MovementType) {
  const grouped = new Map<string, number>()

  for (const movement of movements) {
    if (movement.type !== type) {
      continue
    }
    grouped.set(
      movement.category,
      (grouped.get(movement.category) ?? 0) + movement.amount,
    )
  }

  return [...grouped.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function groupByMonth(movements: Movement[]) {
  const labels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

  return labels.map((label, index) => {
    const monthMovements = movements.filter((movement) => {
      const date = new Date(`${movement.date}T00:00:00`)

      return date.getMonth() === index
    })
    const income = monthMovements
      .filter((movement) => movement.type === 'income')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const expense = monthMovements
      .filter((movement) => movement.type === 'expense')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return {
      label,
      income,
      expense,
      total: Math.max(income, expense),
    }
  })
}

function statusLabel(status: MovementStatus) {
  return {
    collected: 'Incassato',
    pending: 'Da incassare',
    paid: 'Pagata',
    to_pay: 'Da pagare',
  }[status]
}

function viewTitle(view: ActiveView) {
  return {
    overview: 'Fondi e tasse',
    movements: 'Movimenti',
    reserves: 'Accantonamenti',
    goals: 'Obiettivi',
    deadlines: 'Scadenze',
    analytics: 'Analisi',
    profile: 'Profilo fiscale',
    backup: 'Dati & backup',
  }[view]
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('it-IT').format(new Date(`${date}T00:00:00`))
}

export default App
