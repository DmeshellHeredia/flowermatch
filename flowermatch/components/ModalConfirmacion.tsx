"use client"

import { useEffect } from "react"

interface Props {
  titulo: string
  mensaje: string
  textoConfirmar: string
  variante?: "peligro" | "advertencia"
  procesando?: boolean
  alCancelar: () => void
  alConfirmar: () => void
}

export function ModalConfirmacion({
  titulo,
  mensaje,
  textoConfirmar,
  variante = "peligro",
  procesando = false,
  alCancelar,
  alConfirmar,
}: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !procesando) alCancelar()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [alCancelar, procesando])

  const esPeligro = variante === "peligro"

  const iconoBg   = esPeligro ? "bg-red-100 dark:bg-red-950/30"    : "bg-amber-100 dark:bg-amber-950/30"
  const confirmCls = esPeligro
    ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/30"
    : "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500/30"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={procesando ? undefined : alCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-confirm-titulo"
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full text-lg ${iconoBg}`}>
            {esPeligro ? "🗑️" : "👁️"}
          </div>
          <h2 id="modal-confirm-titulo" className="mb-2 text-base font-bold">
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{mensaje}</p>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button
            onClick={alConfirmar}
            disabled={procesando}
            autoFocus
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${confirmCls}`}
          >
            {procesando ? "Procesando..." : textoConfirmar}
          </button>
          <button
            onClick={alCancelar}
            disabled={procesando}
            className="rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
