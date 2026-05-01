import { ArrowDownToLine, ArrowUpFromLine, FileCheck2, Plus, SlidersHorizontal } from 'lucide-react'
import { Button, Toolbar, ToolbarButton } from '@fluentui/react-components'
import type { ActiveView } from '../../lib/routing'
import { AppIcon } from '../ui/AppIcon'

export function AppCommandBar({
  activeView,
  onNewMovement,
  onExport,
  onImport,
  onGoToProfile,
}: {
  activeView: ActiveView
  onNewMovement: () => void
  onExport: () => void
  onImport: () => void
  onGoToProfile: () => void
}) {
  return (
    <div className="app-commandbar" role="toolbar" aria-label="Azioni vista">
      <Toolbar size="small" aria-label="Comandi principali">
        {activeView === 'overview' ? (
          <>
            <Button appearance="primary" icon={<AppIcon icon={Plus} size={16} />} onClick={onNewMovement}>
              Nuovo movimento
            </Button>
            <ToolbarButton icon={<AppIcon icon={ArrowDownToLine} size={16} />} onClick={onExport}>Backup</ToolbarButton>
            <ToolbarButton icon={<AppIcon icon={SlidersHorizontal} size={16} />} onClick={onGoToProfile}>
              Profilo fiscale
            </ToolbarButton>
          </>
        ) : null}
        {activeView === 'movements' ? (
          <>
            <Button appearance="primary" icon={<AppIcon icon={Plus} size={16} />} onClick={onNewMovement}>
              Nuovo
            </Button>
            <ToolbarButton icon={<AppIcon icon={ArrowUpFromLine} size={16} />} onClick={onImport}>Importa</ToolbarButton>
            <ToolbarButton icon={<AppIcon icon={ArrowDownToLine} size={16} />} onClick={onExport}>Esporta</ToolbarButton>
          </>
        ) : null}
        {activeView === 'backup' ? (
          <>
            <Button appearance="primary" icon={<AppIcon icon={FileCheck2} size={16} />} onClick={onExport}>
              Crea backup
            </Button>
            <ToolbarButton icon={<AppIcon icon={ArrowUpFromLine} size={16} />} onClick={onImport}>Importa JSON</ToolbarButton>
          </>
        ) : null}
        {activeView !== 'overview' && activeView !== 'movements' && activeView !== 'backup' ? (
          <>
            <ToolbarButton icon={<AppIcon icon={ArrowDownToLine} size={16} />} onClick={onExport}>Backup</ToolbarButton>
            <ToolbarButton icon={<AppIcon icon={ArrowUpFromLine} size={16} />} onClick={onImport}>Importa</ToolbarButton>
          </>
        ) : null}
      </Toolbar>
    </div>
  )
}
