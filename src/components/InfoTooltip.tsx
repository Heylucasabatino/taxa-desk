import { useRef, useState, type CSSProperties } from 'react'
import { Info } from 'lucide-react'

export function InfoTooltip({ text }: { text: string }) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState({
    left: 16,
    top: 16,
    arrowLeft: 16,
    placement: 'top' as 'top' | 'bottom',
  })

  function updatePosition() {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const width = Math.min(280, window.innerWidth - 32)
    const left = Math.min(
      window.innerWidth - width - 16,
      Math.max(16, rect.left + rect.width / 2 - width / 2),
    )
    const placeBelow = rect.top < 86
    const top = placeBelow ? rect.bottom + 10 : rect.top - 12

    setPosition({
      left,
      top,
      arrowLeft: rect.left + rect.width / 2 - left,
      placement: placeBelow ? 'bottom' : 'top',
    })
  }

  return (
    <span
      className="info-tooltip"
      ref={triggerRef}
      tabIndex={0}
      role="button"
      aria-label={text}
      onFocus={updatePosition}
      onMouseEnter={updatePosition}
    >
      <Info size={14} aria-hidden="true" />
      <span
        className="tooltip-bubble"
        role="tooltip"
        style={
          {
            left: position.left,
            top: position.top,
            '--tooltip-arrow-left': `${position.arrowLeft}px`,
            '--tooltip-offset': position.placement === 'top' ? '-100%' : '0',
            '--tooltip-arrow-top': position.placement === 'top' ? '100%' : '-5px',
            '--tooltip-arrow-rotate':
              position.placement === 'top' ? '45deg' : '225deg',
          } as CSSProperties
        }
      >
        {text}
      </span>
    </span>
  )
}
