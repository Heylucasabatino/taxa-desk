import type { MouseEvent } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { AppIcon } from '../ui/AppIcon'

export function AppTitleBar() {
  function runWindowAction(event: MouseEvent<HTMLButtonElement>, command: string) {
    event.preventDefault()
    event.stopPropagation()
    void invoke(command).catch((error) => {
      console.error(`Comando finestra non riuscito: ${command}`, error)
    })
  }

  return (
    <header className="app-titlebar">
      <div className="titlebar-app" data-tauri-drag-region>
        <div className="titlebar-mark" aria-hidden="true">TD</div>
        <span data-tauri-drag-region>Taxa Desk</span>
      </div>
      <div className="titlebar-spacer" data-tauri-drag-region />
      <div className="window-controls">
        <button
          type="button"
          aria-label="Minimizza"
          onClick={(event) => runWindowAction(event, 'window_minimize')}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <AppIcon icon={Minus} size={16} />
        </button>
        <button
          type="button"
          aria-label="Massimizza o ripristina"
          onClick={(event) => runWindowAction(event, 'window_toggle_maximize')}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <AppIcon icon={Square} size={16} />
        </button>
        <button
          className="close"
          type="button"
          aria-label="Chiudi"
          onClick={(event) => runWindowAction(event, 'window_close')}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <AppIcon icon={X} size={16} />
        </button>
      </div>
    </header>
  )
}
