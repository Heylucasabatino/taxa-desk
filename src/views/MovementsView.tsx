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
  compact = false,
}: {
  movements: Movement[]
  categories: Category[]
  onDelete: (id?: string) => void
  onEdit: (movement: Movement) => void
  onNew: () => void
  compact?: boolean
}) {
  return (
    <section className="ledger-section movements-view">
      <SectionHeader
        title="Movimenti"
        detail={compact ? 'Ultimi inseriti' : 'Registro annuale'}
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
