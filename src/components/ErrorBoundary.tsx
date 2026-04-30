import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryState = {
  error: Error | null
  info: ErrorInfo | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    info: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info })
  }

  render() {
    const { error, info } = this.state

    if (!error) {
      return this.props.children
    }

    const dump = `${error.name}: ${error.message}\n${error.stack ?? ''}\n${info?.componentStack ?? ''}`

    return (
      <main className="error-fallback">
        <section>
          <h1>Errore applicazione</h1>
          <p>Ricarica la pagina. Se il problema resta, copia il dettaglio errore.</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            Ricarica
          </button>
          <textarea readOnly value={dump} aria-label="Dettaglio errore copiabile" />
        </section>
      </main>
    )
  }
}
