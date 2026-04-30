export function DeadlineRow({ date, title }: { date: string; title: string }) {
  return (
    <div className="deadline-row">
      <strong>{date}</strong>
      <span>{title}</span>
    </div>
  )
}
