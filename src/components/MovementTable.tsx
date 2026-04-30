import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { formatCurrency, type Movement } from '../lib/finance'
import { formatDate, statusLabel } from '../lib/formatters'

export function MovementTable({
  movements,
  onDelete,
  onEdit,
  onNew,
}: {
  movements: Movement[]
  onDelete: (id?: string) => void
  onEdit: (movement: Movement) => void
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
  )
}
