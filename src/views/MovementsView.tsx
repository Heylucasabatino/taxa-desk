import { ArrowDownToLine, ArrowUpFromLine, Plus } from 'lucide-react'
import { MovementTable } from '../components/MovementTable'
import { SectionHeader } from '../components/SectionHeader'
import type { Category } from '../constants/categories'
import type { Movement } from '../lib/finance'

export function MovementsView({
  movements,
  categories,
  onDelete,
  onEdit,
  onNew,
  onExport,
  onImport,
  compact = false,
}: {
  movements: Movement[]
  categories: Category[]
  onDelete: (id?: string) => void
  onEdit: (movement: Movement) => void
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
      <MovementTable
        movements={movements}
        categories={categories}
        onDelete={onDelete}
        onEdit={onEdit}
        onNew={onNew}
      />
    </section>
  )
}
