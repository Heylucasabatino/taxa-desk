import type { ReactNode } from 'react'
import { InfoTooltip } from './InfoTooltip'

export function SectionHeader({
  title,
  detail,
  action,
  help,
}: {
  title: string
  detail: string
  action?: ReactNode
  help?: string
}) {
  return (
    <div className="section-header">
      <div>
        <div className="section-title-line">
          <h2>{title}</h2>
          {help ? <InfoTooltip text={help} /> : null}
        </div>
        <span>{detail}</span>
      </div>
      {action}
    </div>
  )
}
