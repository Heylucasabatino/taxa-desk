import { describe, expect, it } from 'vitest'
import { defaultCategories } from '../constants/categories'
import { parseBackupPayload } from './db'

describe('parseBackupPayload', () => {
  it('legge payload v1 legacy con incomes/expenses', () => {
    const payload = parseBackupPayload({
      incomes: [{ date: '2026-01-01', description: 'Seduta', amount: 100, category: 'Sedute' }],
      expenses: [{ date: '2026-01-02', description: 'Software', amount: 20, category: 'Software' }],
      goals: [],
      profile: {},
    })

    expect(payload.movements).toHaveLength(2)
    expect(payload.movements[0].status).toBe('collected')
    expect(payload.movements[1].status).toBe('paid')
  })

  it('legge payload v2 con movements', () => {
    const payload = parseBackupPayload({
      meta: { app: 'fondi-e-tasse', version: 2, exportedAt: '2026-01-01T00:00:00.000Z' },
      movements: [{ date: '2026-01-01', type: 'income', description: 'Seduta', amount: 100 }],
      goals: [],
      settings: {},
    })

    expect(payload.meta.version).toBe(3)
    expect(payload.categories).toEqual(defaultCategories)
    expect(payload.movements[0].category).toBe('Altro')
  })

  it('lancia su payload corrotto', () => {
    expect(() => parseBackupPayload(null)).toThrow('Backup non valido.')
    expect(() => parseBackupPayload({ goals: [] })).toThrow('Il file non contiene movimenti importabili.')
  })

  it('normalizza campi mancanti', () => {
    const payload = parseBackupPayload({
      movements: [{}],
      goals: [{}],
      settings: {},
      categories: [{ name: '', type: 'other' }],
    })

    expect(payload.movements[0].description).toBe('Movimento')
    expect(payload.goals[0].name).toBe('Obiettivo')
    expect(payload.categories[0].name).toBe('Altro')
    expect(payload.categories[0].type).toBe('income')
  })
})
