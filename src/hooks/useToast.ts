import { useCallback, useState } from 'react'

export type Toast = {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const notify = useCallback((
    message: string,
    action?: Pick<Toast, 'actionLabel' | 'onAction'>,
  ) => {
    const id = Date.now()

    setToast({ id, message, ...action })
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, 2800)
  }, [])

  return { toast, notify }
}
