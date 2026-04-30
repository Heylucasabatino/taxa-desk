import { NumericFormat } from 'react-number-format'
import { Field } from './Field'

export function PercentSetting({
  label,
  value,
  onChange,
  help,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  help?: string
}) {
  return (
    <Field label={label} help={help}>
      <NumericFormat
        value={Number.isFinite(value) ? value * 100 : ''}
        decimalScale={2}
        decimalSeparator=","
        thousandSeparator="."
        fixedDecimalScale={false}
        suffix="%"
        allowNegative={false}
        onValueChange={(values) => onChange((values.floatValue ?? 0) / 100)}
      />
    </Field>
  )
}
