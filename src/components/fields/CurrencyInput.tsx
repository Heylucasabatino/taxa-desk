import { NumericFormat } from 'react-number-format'

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00 €',
  required = false,
  invalid = false,
}: {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  required?: boolean
  invalid?: boolean
}) {
  const displayValue = value === 0 || value === '0' ? '' : value

  return (
    <NumericFormat
      value={displayValue}
      decimalScale={2}
      decimalSeparator=","
      thousandSeparator="."
      fixedDecimalScale={false}
      suffix=" €"
      allowNegative={false}
      placeholder={placeholder}
      required={required}
      aria-invalid={invalid || undefined}
      onValueChange={(values) => onChange(values.floatValue ?? 0)}
    />
  )
}
