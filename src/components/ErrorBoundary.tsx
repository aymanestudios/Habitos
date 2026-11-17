import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

// Red de seguridad: si una pantalla falla al pintarse, en vez de quedarse en blanco
// se ve este aviso con el panda y un botón para recargar. Tus datos no se pierden (están en el servidor).
type State = { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola del navegador para poder revisarlo (no se envía a ningún sitio)
    console.error('Progress&Go: error de pantalla', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6 text-center text-ink">
        <div className="max-w-sm">
          <img src="/mascota/dormido.webp" alt="" aria-hidden="true" width={520} height={273} className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="text-2xl font-bold">Algo se ha torcido</h1>
          <p className="mt-2 text-muted">
            Esta pantalla ha tenido un problema. Tus hábitos y tu progreso están a salvo.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary px-4 py-3">
              Recargar
            </button>
            <button type="button" onClick={() => window.location.assign('/')} className="rounded-2xl py-2 text-sm font-bold text-muted">
              Ir a Inicio
            </button>
          </div>
        </div>
      </div>
    )
  }
}
