import { useMemo, useRef, useState, type FormEvent } from 'react'
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
  Filter,
  Goal as GoalIcon,
  Home,
  Info,
  Menu,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  Sun,
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
  type Goal,
  type Movement,
  type MovementStatus,
  type MovementType,
  type TaxProfile,
} from './lib/finance'

type Toast = {
  id: number
  message: string
}

const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const emptyMovements: Movement[] = []
const emptyGoals: Goal[] = []

const navItems = [
  ['Panoramica', Home],
  ['Movimenti', ArrowUpFromLine],
  ['Accantonamenti', WalletCards],
  ['Obiettivi', Target],
  ['Scadenze', CalendarDays],
  ['Analisi', BarChart3],
  ['Profilo fiscale', SlidersHorizontal],
  ['Dati & backup', Database],
] as const

const incomeStatuses: Array<[MovementStatus, string]> = [
  ['collected', 'Incassato'],
  ['pending', 'Da incassare'],
]

const expenseStatuses: Array<[MovementStatus, string]> = [
  ['paid', 'Pagata'],
  ['to_pay', 'Da pagare'],
]

function App() {
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

  const appData = useLiveQuery(async () => {
    await ensureMovementMigration()

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
  }, [])

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

  return (
    <main className="ledger-app">
      <aside className="sidebar" aria-label="Navigazione principale">
        <button className="menu-button" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>
        <nav>
          {navItems.slice(0, 6).map(([label, Icon], index) => (
            <a className={index === 0 ? 'active' : ''} href={`#${label}`} key={label}>
              <Icon size={19} />
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-secondary">
          {navItems.slice(6).map(([label, Icon]) => (
            <a href={`#${label}`} key={label}>
              <Icon size={19} />
              {label}
            </a>
          ))}
        </div>
        <a className="info-link" href="#Informazioni">
          <Info size={18} />
          Informazioni
        </a>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Fondi e tasse</h1>
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
            <button className="outline-button" type="button">
              <Filter size={16} />
              Filtri
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
            <button className="theme-button" type="button" aria-label="Tema">
              <Sun size={19} />
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

        <section className="summary-strip" aria-label="Sintesi fondi">
          <SummaryItem
            label="Disponibile"
            value={formatCurrency(fiscalEstimate.availableAfterReserve)}
            detail="Dopo spese e accantonamenti"
            tone="positive"
          />
          <SummaryItem
            label="Da accantonare"
            value={formatCurrency(fiscalEstimate.totalReserve)}
            detail={`${formatPercent(fiscalEstimate.effectiveReserveRate)} degli introiti`}
            tone="warning"
          />
          <SummaryItem
            label="Introiti"
            value={formatCurrency(fiscalEstimate.grossIncome)}
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

        <div className="content-shell">
          <section className="main-ledger">
            <section className="ledger-section" id="Movimenti">
              <SectionHeader
                title="Movimenti"
                detail="Ultimi inseriti"
                action={
                  <div className="section-actions">
                    <button className="text-button" type="button">
                      <ArrowUpFromLine size={16} />
                      Importa
                    </button>
                    <button className="text-button" type="button" onClick={handleExport}>
                      <ArrowDownToLine size={16} />
                      Esporta
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                    >
                      <Plus size={17} />
                      Nuovo
                    </button>
                  </div>
                }
              />
              <MovementTable movements={annualMovements} onDelete={removeMovement} />
            </section>

            <section className="ledger-section" id="Accantonamenti">
              <SectionHeader
                title="Accantonamenti"
                detail="Stima aggiornata in tempo reale"
                action={<button className="text-button" type="button">Dettaglio calcolo</button>}
              />
              <ReserveRows estimate={fiscalEstimate} />
            </section>

            <section className="ledger-section" id="Obiettivi">
              <SectionHeader
                title="Obiettivi"
                detail="Prossimi traguardi"
                action={<button className="text-button" type="button">+ Nuovo obiettivo</button>}
              />
              <GoalRows goals={goals} profile={profile} />
              <GoalForm
                goalForm={goalForm}
                setGoalForm={setGoalForm}
                onSubmit={submitGoal}
              />
            </section>
          </section>

          {drawerOpen ? (
            <aside className="drawer" aria-label="Nuovo movimento">
              <div className="drawer-header">
                <h2>Nuovo movimento</h2>
                <button
                  className="ghost-button"
                  type="button"
                  aria-label="Chiudi drawer"
                  onClick={() => setDrawerOpen(false)}
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
              <form className="drawer-form" onSubmit={submitMovement}>
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
                      : ['Spesa fissa', 'Servizi professionali', 'Quote e iscrizioni', 'Software', 'Altro']
                    ).map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Importo (€)">
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={movementForm.amount}
                    placeholder="0,00"
                    onChange={(event) =>
                      setMovementForm({ ...movementForm, amount: event.target.value })
                    }
                  />
                </Field>
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
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Annulla
                  </button>
                </div>
              </form>

              <div className="profile-panel" id="Profilo fiscale">
                <h3>Profilo fiscale</h3>
                <div className="profile-grid">
                  <NumberSetting
                    label="Coeff."
                    value={profile.taxableCoefficient}
                    onChange={(value) => updateProfile('taxableCoefficient', value)}
                  />
                  <NumberSetting
                    label="Aliquota"
                    value={profile.substituteTaxRate}
                    onChange={(value) => updateProfile('substituteTaxRate', value)}
                  />
                  <NumberSetting
                    label="Soggettivo"
                    value={profile.pensionRate}
                    onChange={(value) => updateProfile('pensionRate', value)}
                  />
                  <NumberSetting
                    label="Integrativo"
                    value={profile.integrativeRate}
                    onChange={(value) => updateProfile('integrativeRate', value)}
                  />
                </div>
              </div>
            </aside>
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
}: {
  movements: Movement[]
  onDelete: (id?: string) => void
}) {
  if (movements.length === 0) {
    return (
      <div className="empty-ledger">
        Nessun movimento per l’anno selezionato.
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

function ReserveRows({
  estimate,
}: {
  estimate: ReturnType<typeof estimateFiscalPosition>
}) {
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
    return <div className="empty-ledger">Nessun obiettivo inserito.</div>
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
  goalForm: {
    name: string
    targetAmount: string
    savedAmount: string
    targetDate: string
  }
  setGoalForm: React.Dispatch<
    React.SetStateAction<{
      name: string
      targetAmount: string
      savedAmount: string
      targetDate: string
    }>
  >
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <form className="inline-goal-form" onSubmit={onSubmit}>
      <input
        value={goalForm.name}
        placeholder="Nuovo obiettivo"
        onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
      />
      <input
        required
        min="0"
        step="0.01"
        type="number"
        value={goalForm.targetAmount}
        placeholder="Target"
        onChange={(event) =>
          setGoalForm({ ...goalForm, targetAmount: event.target.value })
        }
      />
      <input
        min="0"
        step="0.01"
        type="number"
        value={goalForm.savedAmount}
        placeholder="Già accantonato"
        onChange={(event) =>
          setGoalForm({ ...goalForm, savedAmount: event.target.value })
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

function statusLabel(status: MovementStatus) {
  return {
    collected: 'Incassato',
    pending: 'Da incassare',
    paid: 'Pagata',
    to_pay: 'Da pagare',
  }[status]
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('it-IT').format(new Date(`${date}T00:00:00`))
}

export default App
