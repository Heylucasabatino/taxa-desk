import { enpapMinimums, formatCurrency } from '../lib/finance'

export function MinimumPresetControl({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const selected =
    value === enpapMinimums.standard
      ? 'standard'
      : value === enpapMinimums.newMember
        ? 'new-member'
        : 'custom'

  return (
    <div className="minimum-presets" aria-label="Preset minimo soggettivo ENPAP">
      <div>
        <strong>Minimo soggettivo ENPAP</strong>
        <span>Usa il minimo ordinario salvo diritto alla riduzione.</span>
      </div>
      <div className="preset-actions">
        <button
          className={selected === 'standard' ? 'selected' : ''}
          type="button"
          onClick={() => onChange(enpapMinimums.standard)}
        >
          Ordinario {formatCurrency(enpapMinimums.standard)}
        </button>
        <button
          className={selected === 'new-member' ? 'selected' : ''}
          type="button"
          onClick={() => onChange(enpapMinimums.newMember)}
        >
          Neoiscritti {formatCurrency(enpapMinimums.newMember)}
        </button>
      </div>
    </div>
  )
}
