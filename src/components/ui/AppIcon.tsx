import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

export type AppIconComponent = ComponentType<LucideProps>

export function AppIcon({
  icon: Icon,
  size = 20,
  className,
}: {
  icon: AppIconComponent
  size?: 16 | 20 | 24 | 32
  className?: string
}) {
  return <Icon aria-hidden="true" className={className} size={size} strokeWidth={1.8} />
}
