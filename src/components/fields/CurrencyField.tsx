import { Field } from './Field'
import { CurrencyInput } from './CurrencyInput'

export function CurrencyField({
  label,
  value,
  onChange,
  required = false,
  help,
  error,
}: {
  label: string
  value: number | string
  onChange: (value: number) => void
  required?: boolean
  help?: string
  error?: string
}) {
  return (
    <Field label={label} help={help} error={error}>
      <CurrencyInput
        value={value}
        onChange={onChange}
        required={required}
        invalid={Boolean(error)}
      />
    </Field>
  )
}
