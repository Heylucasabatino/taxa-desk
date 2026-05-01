import { useState, type FormEvent } from 'react'
import { helpText } from '../constants/helpText'
import { MinimumPresetControl } from '../components/MinimumPresetControl'
import { CurrencyField } from '../components/fields/CurrencyField'
import { PercentSetting } from '../components/fields/PercentSetting'
import { defaultTaxProfile, type TaxProfile } from '../lib/finance'

export function SetupView({
  profile,
  onComplete,
}: {
  profile: TaxProfile
  onComplete: (profile: TaxProfile) => Promise<void>
}) {
  const [setupProfile, setSetupProfile] = useState<TaxProfile>({
    ...defaultTaxProfile,
    ...profile,
  })
  const [isSaving, setIsSaving] = useState(false)

  function updateField(field: keyof TaxProfile, value: number) {
    setSetupProfile((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function submitSetup(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    await onComplete(setupProfile)
  }

  return (
    <main className="setup-shell">
      <section className="setup-card">
        <div className="setup-intro">
          <div className="app-mark" aria-hidden="true">TD</div>
          <p>Configurazione iniziale</p>
          <h1>Prima rendiamo attendibili le stime.</h1>
          <span>
            Il tuo spazio locale per entrate, tasse e scadenze. Questi valori
            restano modificabili nel profilo fiscale.
          </span>
        </div>

        <form className="setup-form" onSubmit={submitSetup}>
          <div className="setup-grid">
            <PercentSetting
              label="Coefficiente redditività"
              value={setupProfile.taxableCoefficient}
              help={helpText.taxableCoefficient}
              onChange={(value) => updateField('taxableCoefficient', value)}
            />
            <PercentSetting
              label="Aliquota imposta sostitutiva"
              value={setupProfile.substituteTaxRate}
              help={helpText.substituteTax}
              onChange={(value) => updateField('substituteTaxRate', value)}
            />
            <PercentSetting
              label="Contributo soggettivo"
              value={setupProfile.pensionRate}
              help={helpText.pensionRate}
              onChange={(value) => updateField('pensionRate', value)}
            />
            <CurrencyField
              label="Minimo soggettivo"
              value={setupProfile.pensionMinimum}
              help={helpText.pensionMinimum}
              onChange={(value) => updateField('pensionMinimum', value)}
            />
            <PercentSetting
              label="Contributo integrativo"
              value={setupProfile.integrativeRate}
              help={helpText.integrativeRate}
              onChange={(value) => updateField('integrativeRate', value)}
            />
            <CurrencyField
              label="Minimo integrativo"
              value={setupProfile.integrativeMinimum}
              help={helpText.integrativeMinimum}
              onChange={(value) => updateField('integrativeMinimum', value)}
            />
          </div>
          <MinimumPresetControl
            value={setupProfile.pensionMinimum}
            onChange={(value) => updateField('pensionMinimum', value)}
          />

          <div className="setup-next">
            <strong>Dopo questo passaggio:</strong>
            <span>1. registra il primo introito;</span>
            <span>2. aggiungi eventuali spese macroscopiche;</span>
            <span>3. crea un obiettivo di risparmio.</span>
          </div>

          <div className="setup-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Salvataggio...' : 'Conferma e inizia'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
