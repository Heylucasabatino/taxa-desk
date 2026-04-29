import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownToLine,
  CalendarClock,
  CircleDollarSign,
  Database,
  Goal as GoalIcon,
  PiggyBank,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react'
import './App.css'
import {
  addExpense,
  addGoal,
  addIncome,
  deleteRecord,
  exportBackup,
  loadAll,
  saveProfile,
} from './lib/db'
import {
  estimateFiscalPosition,
  estimateGoalPlan,
  formatCurrency,
  formatPercent,
  type Expense,
  type Goal,
  type Income,
  type TaxProfile,
} from './lib/finance'

type AppData = {
  incomes: Income[]
  expenses: Expense[]
  goals: Goal[]
  profile: TaxProfile
}

const today = new Date().toISOString().slice(0, 10)

function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [incomeForm, setIncomeForm] = useState({
    date: today,
    description: '',
    amount: '',
    category: 'Sedute',
  })
  const [expenseForm, setExpenseForm] = useState({
    date: today,
    description: '',
    amount: '',
    category: 'Spesa fissa',
  })
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    savedAmount: '',
    targetDate: today,
  })

  async function refresh() {
    setData(await loadAll())
  }

  useEffect(() => {
    let isMounted = true

    loadAll().then((loadedData) => {
      if (isMounted) {
        setData(loadedData)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const fiscalEstimate = useMemo(() => {
    if (!data) {
      return null
    }

    return estimateFiscalPosition(data.incomes, data.expenses, data.profile)
  }, [data])

  async function submitIncome(event: FormEvent) {
    event.preventDefault()

    await addIncome({
      date: incomeForm.date,
      description: incomeForm.description || 'Introito',
      amount: Number(incomeForm.amount),
      category: incomeForm.category || 'Altro',
    })
    setIncomeForm({ ...incomeForm, description: '', amount: '' })
    await refresh()
  }

  async function submitExpense(event: FormEvent) {
    event.preventDefault()

    await addExpense({
      date: expenseForm.date,
      description: expenseForm.description || 'Spesa',
      amount: Number(expenseForm.amount),
      category: expenseForm.category || 'Altro',
    })
    setExpenseForm({ ...expenseForm, description: '', amount: '' })
    await refresh()
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
    await refresh()
  }

  async function updateProfile(field: keyof TaxProfile, value: string) {
    if (!data) {
      return
    }

    const nextProfile = {
      ...data.profile,
      [field]: Number(value),
    }

    setData({ ...data, profile: nextProfile })
    await saveProfile(nextProfile)
  }

  async function remove(table: 'incomes' | 'expenses' | 'goals', id?: string) {
    if (!id) {
      return
    }

    await deleteRecord(table, id)
    await refresh()
  }

  if (!data || !fiscalEstimate) {
    return <main className="app-shell loading">Caricamento dati locali...</main>
  }

  const nextGoal = data.goals[0]
  const nextGoalPlan = nextGoal
    ? estimateGoalPlan(nextGoal, data.profile)
    : null

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WebApp locale</p>
          <h1>Fondi e tasse</h1>
        </div>
        <button className="icon-button" type="button" onClick={exportBackup}>
          <ArrowDownToLine size={18} />
          Backup JSON
        </button>
      </header>

      <section className="summary-grid" aria-label="Sintesi fondi">
        <MetricCard
          icon={<Wallet size={20} />}
          label="Introiti registrati"
          value={formatCurrency(fiscalEstimate.grossIncome)}
        />
        <MetricCard
          icon={<ShieldCheck size={20} />}
          label="Da congelare"
          value={formatCurrency(fiscalEstimate.totalReserve)}
          detail={`${formatPercent(fiscalEstimate.effectiveReserveRate)} degli introiti`}
        />
        <MetricCard
          icon={<CircleDollarSign size={20} />}
          label="Disponibile stimato"
          value={formatCurrency(fiscalEstimate.availableAfterReserve)}
          detail="Dopo spese e accantonamenti"
        />
        <MetricCard
          icon={<PiggyBank size={20} />}
          label="Spese macroscopiche"
          value={formatCurrency(fiscalEstimate.expenses)}
        />
      </section>

      <section className="content-grid">
        <div className="dashboard-column main-column">
          <div className="panel">
          <PanelHeader
            icon={<Plus size={18} />}
            title="Movimenti"
            description="Inserisci introiti e spese importanti. Le cifre restano stime prudenziali."
          />
          <div className="forms-grid">
            <form onSubmit={submitIncome}>
              <h3>Nuovo introito</h3>
              <Field label="Data">
                <input
                  type="date"
                  value={incomeForm.date}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, date: event.target.value })
                  }
                />
              </Field>
              <Field label="Descrizione">
                <input
                  value={incomeForm.description}
                  placeholder="Seduta, consulenza, altro"
                  onChange={(event) =>
                    setIncomeForm({
                      ...incomeForm,
                      description: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Categoria">
                <input
                  value={incomeForm.category}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, category: event.target.value })
                  }
                />
              </Field>
              <Field label="Importo">
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={incomeForm.amount}
                  onChange={(event) =>
                    setIncomeForm({ ...incomeForm, amount: event.target.value })
                  }
                />
              </Field>
              <button type="submit">
                <Plus size={16} />
                Aggiungi introito
              </button>
            </form>

            <form onSubmit={submitExpense}>
              <h3>Nuova spesa</h3>
              <Field label="Data">
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, date: event.target.value })
                  }
                />
              </Field>
              <Field label="Descrizione">
                <input
                  value={expenseForm.description}
                  placeholder="Commercialista, ordine, software"
                  onChange={(event) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Categoria">
                <input
                  value={expenseForm.category}
                  onChange={(event) =>
                    setExpenseForm({
                      ...expenseForm,
                      category: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Importo">
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm({ ...expenseForm, amount: event.target.value })
                  }
                />
              </Field>
              <button type="submit">
                <Plus size={16} />
                Aggiungi spesa
              </button>
            </form>
          </div>
        </div>

          <div className="panel">
            <PanelHeader
              icon={<CalendarClock size={18} />}
              title="Accantonamenti"
              description="Vista sintetica di cosa non considerare spendibile."
            />
            <Breakdown
              rows={[
                ['Imposta sostitutiva', fiscalEstimate.substituteTaxDue],
                ['Contributo soggettivo', fiscalEstimate.pensionDue],
                ['Contributo integrativo', fiscalEstimate.integrativeDue],
                ['Totale da congelare', fiscalEstimate.totalReserve],
              ]}
            />
          </div>

          <RecordsPanel
            title="Ultimi introiti"
            rows={data.incomes.map((income) => ({
              id: income.id,
              date: income.date,
              label: income.description,
              meta: income.category,
              amount: income.amount,
            }))}
            onDelete={(id) => remove('incomes', id)}
          />
        </div>

        <div className="dashboard-column side-column">
          <div className="panel">
          <PanelHeader
            icon={<Settings2 size={18} />}
            title="Profilo fiscale"
            description="Parametri modificabili: niente valori normativi nascosti nel codice."
          />
          <div className="settings-grid">
            <NumberSetting
              label="Coeff. redditività"
              value={data.profile.taxableCoefficient}
              onChange={(value) => updateProfile('taxableCoefficient', value)}
            />
            <NumberSetting
              label="Aliquota imposta"
              value={data.profile.substituteTaxRate}
              onChange={(value) => updateProfile('substituteTaxRate', value)}
            />
            <NumberSetting
              label="Contributo soggettivo"
              value={data.profile.pensionRate}
              onChange={(value) => updateProfile('pensionRate', value)}
            />
            <NumberSetting
              label="Minimo soggettivo"
              value={data.profile.pensionMinimum}
              onChange={(value) => updateProfile('pensionMinimum', value)}
              step="1"
            />
            <NumberSetting
              label="Integrativo"
              value={data.profile.integrativeRate}
              onChange={(value) => updateProfile('integrativeRate', value)}
            />
            <NumberSetting
              label="Minimo integrativo"
              value={data.profile.integrativeMinimum}
              onChange={(value) => updateProfile('integrativeMinimum', value)}
              step="1"
            />
          </div>
        </div>

          <div className="panel">
          <PanelHeader
            icon={<GoalIcon size={18} />}
            title="Obiettivi"
            description="Calcola il risparmio mensile netto e il lordo indicativo necessario."
          />
          <div className="goal-layout">
            <form onSubmit={submitGoal}>
              <Field label="Obiettivo">
                <input
                  value={goalForm.name}
                  placeholder="Software, formazione, fondo"
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, name: event.target.value })
                  }
                />
              </Field>
              <Field label="Importo target">
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(event) =>
                    setGoalForm({
                      ...goalForm,
                      targetAmount: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Già accantonato">
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={goalForm.savedAmount}
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, savedAmount: event.target.value })
                  }
                />
              </Field>
              <Field label="Scadenza">
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(event) =>
                    setGoalForm({ ...goalForm, targetDate: event.target.value })
                  }
                />
              </Field>
              <button type="submit">
                <Plus size={16} />
                Crea obiettivo
              </button>
            </form>

            <div className="goal-focus">
              {nextGoal && nextGoalPlan ? (
                <>
                  <div
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(#2f8f83 ${nextGoalPlan.progress * 360}deg, #e2e8f0 0deg)`,
                    }}
                  >
                    <span>{formatPercent(nextGoalPlan.progress)}</span>
                  </div>
                  <div>
                    <h3>{nextGoal.name}</h3>
                    <p>
                      Servono {formatCurrency(nextGoalPlan.monthlyNet)} netti al
                      mese, circa {formatCurrency(nextGoalPlan.monthlyGross)} di
                      lordo aggiuntivo.
                    </p>
                    <small>
                      Mancano {nextGoalPlan.months} mesi e{' '}
                      {formatCurrency(nextGoalPlan.remaining)}.
                    </small>
                  </div>
                </>
              ) : (
                <div className="goal-empty">
                  <strong>Nessun obiettivo attivo</strong>
                  <p>
                    Inserisci importo e scadenza per ottenere rata mensile netta
                    e lordo indicativo.
                  </p>
                  <span>Il calcolo usa il profilo fiscale configurato.</span>
                </div>
              )}
            </div>
          </div>
        </div>

          <RecordsPanel
            title="Ultime spese"
            rows={data.expenses.map((expense) => ({
              id: expense.id,
              date: expense.date,
              label: expense.description,
              meta: expense.category,
              amount: expense.amount,
            }))}
            onDelete={(id) => remove('expenses', id)}
          />
        </div>
      </section>

      <footer>
        <Database size={16} />
        Dati salvati in IndexedDB nel browser locale. Le cifre sono stime
        operative, non una dichiarazione fiscale.
      </footer>
    </main>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}

function PanelHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="panel-header">
      <div className="metric-icon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
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
  step = '0.01',
}: {
  label: string
  value: number
  onChange: (value: string) => void
  step?: string
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function Breakdown({ rows }: { rows: [string, number][] }) {
  return (
    <div className="breakdown">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{formatCurrency(value)}</strong>
        </div>
      ))}
    </div>
  )
}

function RecordsPanel({
  className,
  title,
  rows,
  onDelete,
}: {
  className?: string
  title: string
  rows: Array<{
    id?: string
    date: string
    label: string
    meta: string
    amount: number
  }>
  onDelete: (id?: string) => void
}) {
  return (
    <div className={`panel ${className ?? ''}`}>
      <h2>{title}</h2>
      <div className="record-list">
        {rows.length > 0 ? (
          rows.slice(0, 6).map((row) => (
            <div className="record-row" key={row.id}>
              <div>
                <strong>{row.label}</strong>
                <span>
                  {row.date} · {row.meta}
                </span>
              </div>
              <div className="record-actions">
                <b>{formatCurrency(row.amount)}</b>
                <button
                  className="ghost-button"
                  type="button"
                  aria-label={`Elimina ${row.label}`}
                  onClick={() => onDelete(row.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">Nessun movimento inserito.</p>
        )}
      </div>
    </div>
  )
}

export default App
