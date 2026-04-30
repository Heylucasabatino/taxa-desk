import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { MinimumPresetControl } from '../components/MinimumPresetControl'
import { SectionHeader } from '../components/SectionHeader'
import { CurrencyField } from '../components/fields/CurrencyField'
import { PercentSetting } from '../components/fields/PercentSetting'
import { categoriesByType, type Category } from '../constants/categories'
import { helpText } from '../constants/helpText'
import type { MovementType, TaxProfile } from '../lib/finance'

export function ProfileView({
  profile,
  categories,
  onChange,
  onCreateCategory,
  onDeleteCategory,
  onRestartSetup,
}: {
  profile: TaxProfile
  categories: Category[]
  onChange: (field: keyof TaxProfile, value: string | boolean) => void
  onCreateCategory: (type: MovementType, name: string) => void
  onDeleteCategory: (id?: string) => void
  onRestartSetup: () => void
}) {
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState<MovementType>('income')

  return (
    <section className="ledger-section profile-view">
      <SectionHeader
        title="Profilo fiscale"
        detail="Parametri usati per le stime operative"
      />
      <div className="profile-grid large">
        <PercentSetting
          label="Coefficiente redditività"
          value={profile.taxableCoefficient}
          help={helpText.taxableCoefficient}
          onChange={(value) => onChange('taxableCoefficient', String(value))}
        />
        <PercentSetting
          label="Aliquota imposta sostitutiva"
          value={profile.substituteTaxRate}
          help={helpText.substituteTax}
          onChange={(value) => onChange('substituteTaxRate', String(value))}
        />
        <PercentSetting
          label="Contributo soggettivo"
          value={profile.pensionRate}
          help={helpText.pensionRate}
          onChange={(value) => onChange('pensionRate', String(value))}
        />
        <CurrencyField
          label="Minimo soggettivo"
          value={profile.pensionMinimum}
          help={helpText.pensionMinimum}
          onChange={(value) => onChange('pensionMinimum', String(value))}
        />
        <PercentSetting
          label="Contributo integrativo"
          value={profile.integrativeRate}
          help={helpText.integrativeRate}
          onChange={(value) => onChange('integrativeRate', String(value))}
        />
        <CurrencyField
          label="Minimo integrativo"
          value={profile.integrativeMinimum}
          help={helpText.integrativeMinimum}
          onChange={(value) => onChange('integrativeMinimum', String(value))}
        />
      </div>
      <MinimumPresetControl
        value={profile.pensionMinimum}
        onChange={(value) => onChange('pensionMinimum', String(value))}
      />
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={profile.enforceMinimumsWhenEmpty ?? true}
          onChange={(event) => onChange('enforceMinimumsWhenEmpty', event.target.checked)}
        />
        <span>
          <strong>Applica minimi ENPAP anche senza incassi</strong>
          <small>Disattivalo solo se vuoi una stima prudenziale meno vincolante a inizio anno.</small>
        </span>
      </label>
      <div className="profile-panel">
        <h3>Categorie</h3>
        <form className="category-form" onSubmit={(event) => {
          event.preventDefault()
          onCreateCategory(categoryType, categoryName)
          setCategoryName('')
        }}>
          <select value={categoryType} onChange={(event) => setCategoryType(event.target.value as MovementType)}>
            <option value="income">Introito</option>
            <option value="expense">Spesa</option>
          </select>
          <input value={categoryName} placeholder="Nuova categoria" onChange={(event) => setCategoryName(event.target.value)} />
          <button className="outline-button" type="submit">Aggiungi</button>
        </form>
        {(['income', 'expense'] as const).map((type) => (
          <div className="category-list" key={type}>
            <strong>{type === 'income' ? 'Introiti' : 'Spese'}</strong>
            {categoriesByType(categories, type).map((category) => (
              <span className="category-chip" key={category.id ?? category.name}>
                {category.name}
                <button className="row-action" type="button" aria-label={`Elimina ${category.name}`} onClick={() => onDeleteCategory(category.id)}>
                  <Trash2 size={14} />
                </button>
              </span>
            ))}
          </div>
        ))}
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
