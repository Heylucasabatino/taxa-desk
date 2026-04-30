import { Plus } from 'lucide-react'

export function FirstRunGuide({
  onGoToMovements,
  onGoToProfile,
}: {
  onGoToMovements: () => void
  onGoToProfile: () => void
}) {
  return (
    <section className="first-run-panel">
      <div>
        <p>Primo utilizzo</p>
        <h2>Parti da un movimento reale.</h2>
        <span>
          Il profilo fiscale è configurato. Ora basta registrare un introito per
          far comparire accantonamenti, disponibile e margine operativo.
        </span>
      </div>
      <div className="first-run-actions">
        <button className="primary-button" type="button" onClick={onGoToMovements}>
          <Plus size={17} />
          Registra primo movimento
        </button>
        <button className="outline-button" type="button" onClick={onGoToProfile}>
          Controlla profilo fiscale
        </button>
      </div>
    </section>
  )
}
