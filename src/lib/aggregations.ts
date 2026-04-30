import type { Movement, MovementType } from './finance'

export function groupMovements(movements: Movement[], type: MovementType) {
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

export function groupByMonth(movements: Movement[]) {
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
