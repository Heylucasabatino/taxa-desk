import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Category } from '../constants/categories'
import { formatCurrency, type Movement, type MovementStatus, type MovementType } from '../lib/finance'
import { formatDate, statusLabel } from '../lib/formatters'

type SortKey = 'date' | 'description' | 'category' | 'amount' | 'status'
type SortState = { key: SortKey; direction: 'asc' | 'desc' }

const statuses: Array<[MovementStatus, string]> = [
  ['collected', 'Incassato'],
  ['pending', 'Da incassare'],
  ['paid', 'Pagata'],
  ['to_pay', 'Da pagare'],
]

export function MovementTable({
  movements,
  categories,
  onDelete,
  onEdit,
  onNew,
}: {
  movements: Movement[]
  categories: Category[]
  onDelete: (id?: string) => void
  onEdit: (movement: Movement) => void
  onNew?: () => void
}) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | MovementStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState<SortState>({ key: 'date', direction: 'desc' })
  const visibleMovements = useMemo(() => movements
    .filter((movement) => movement.description.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((movement) => typeFilter === 'all' || movement.type === typeFilter)
    .filter((movement) => statusFilter === 'all' || movement.status === statusFilter)
    .filter((movement) => categoryFilter === 'all' || movement.category === categoryFilter)
    .sort((a, b) => compareMovements(a, b, sort)), [categoryFilter, movements, query, sort, statusFilter, typeFilter])

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
    <>
    <div className="movement-filters">
      <input value={query} placeholder="Cerca descrizione" onChange={(event) => setQuery(event.target.value)} />
      <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | MovementType)}>
        <option value="all">Tutti i tipi</option>
        <option value="income">Introiti</option>
        <option value="expense">Spese</option>
      </select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | MovementStatus)}>
        <option value="all">Tutti gli stati</option>
        {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
        <option value="all">Tutte le categorie</option>
        {categories.map((category) => <option key={category.id ?? category.name}>{category.name}</option>)}
      </select>
    </div>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortableHeader label="Data" sortKey="date" sort={sort} onSort={setSort} />
            <th>Tipo</th>
            <SortableHeader label="Descrizione" sortKey="description" sort={sort} onSort={setSort} />
            <SortableHeader label="Categoria" sortKey="category" sort={sort} onSort={setSort} />
            <SortableHeader label="Importo" sortKey="amount" sort={sort} onSort={setSort} />
            <SortableHeader label="Stato" sortKey="status" sort={sort} onSort={setSort} />
            <th aria-label="Azioni" />
          </tr>
        </thead>
        <tbody>
          {visibleMovements.map((movement) => (
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
                <div className="row-actions">
                  <button
                    className="row-action"
                    type="button"
                    aria-label={`Modifica ${movement.description}`}
                    onClick={() => onEdit(movement)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="row-action"
                    type="button"
                    aria-label={`Elimina ${movement.description}`}
                    onClick={() => onDelete(movement.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  )
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onSort: (sort: SortState) => void
}) {
  const active = sort.key === sortKey

  return (
    <th>
      <button className="sort-button" type="button" onClick={() => onSort({
        key: sortKey,
        direction: active && sort.direction === 'asc' ? 'desc' : 'asc',
      })}>
        {label} {active ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
      </button>
    </th>
  )
}

function compareMovements(a: Movement, b: Movement, sort: SortState) {
  const direction = sort.direction === 'asc' ? 1 : -1
  const values: Record<SortKey, [string | number, string | number]> = {
    date: [a.date, b.date],
    description: [a.description, b.description],
    category: [a.category, b.category],
    amount: [a.amount, b.amount],
    status: [statusLabel(a.status), statusLabel(b.status)],
  }
  const [first, second] = values[sort.key]
  const result = typeof first === 'number' && typeof second === 'number'
    ? first - second
    : String(first).localeCompare(String(second), 'it')

  return result * direction
}
