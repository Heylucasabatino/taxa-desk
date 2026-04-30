import type { MovementType } from '../lib/finance'

export type Category = {
  id?: string
  name: string
  type: MovementType
}

export const defaultCategories: Category[] = [
  { id: 'income-sedute', name: 'Sedute', type: 'income' },
  { id: 'income-consulenze', name: 'Consulenze', type: 'income' },
  { id: 'income-valutazioni', name: 'Valutazioni', type: 'income' },
  { id: 'income-altro', name: 'Altro', type: 'income' },
  { id: 'expense-spesa-fissa', name: 'Spesa fissa', type: 'expense' },
  { id: 'expense-servizi-professionali', name: 'Servizi professionali', type: 'expense' },
  { id: 'expense-quote-iscrizioni', name: 'Quote e iscrizioni', type: 'expense' },
  { id: 'expense-software', name: 'Software', type: 'expense' },
  { id: 'expense-altro', name: 'Altro', type: 'expense' },
]

export function categoriesByType(categories: Category[], type: MovementType) {
  return categories.filter((category) => category.type === type)
}
