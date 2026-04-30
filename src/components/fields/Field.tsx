import type { ReactNode } from 'react'
import { InfoTooltip } from '../InfoTooltip'

export function Field({
  label,
  children,
  help,
  error,
}: {
  label: string
  children: ReactNode
  help?: string
  error?: string
}) {
  return (
    <label className="field">
      <span className="field-label">
        <span>{label}</span>
        {help ? <InfoTooltip text={help} /> : null}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  )
}
