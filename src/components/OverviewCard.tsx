import { ChevronRight } from 'lucide-react'

export function OverviewCard({
  title,
  detail,
  value,
  valueLabel,
  actionLabel,
  onAction,
}: {
  title: string
  detail: string
  value: string
  valueLabel: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <article className="overview-card">
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      <strong>{value}</strong>
      <span>{valueLabel}</span>
      <button className="text-button" type="button" onClick={onAction}>
        {actionLabel}
        <ChevronRight size={16} />
      </button>
    </article>
  )
}
