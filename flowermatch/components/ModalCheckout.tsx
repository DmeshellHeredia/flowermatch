"use client"

import { useState } from "react"
import type { ItemCarrito } from "@/lib/tipos"

interface Props {
  items: ItemCarrito[]
  total: number
  alCerrar: () => void
  alConfirmar: () => void
}

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"

type Paso = "formulario" | "procesando" | "exito"

export function ModalCheckout({ items, total, alCerrar, alConfirmar }: Props) {
  const [paso, setPaso]         = useState<Paso>("formulario")
  const [numeroPedido]          = useState(`FM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`)
  const [form, setForm]         = useState({ nombre: "", email: "", direccion: "", nota: "" })
  const [errores, setErrores]   = useState<Partial<typeof form>>({})

  const cambiar = (campo: keyof typeof form, valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }))

  const validar = (): boolean => {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim())    e.nombre    = "Requerido"
    const emailTrimmed = form.email.trim()
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)
    if (!emailTrimmed || !emailValido) e.email = "Email inválido"
    if (!form.direccion.trim()) e.direccion = "Requerido"
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const confirmar = () => {
    if (!validar()) return
    setPaso("procesando")
    setTimeout(() => setPaso("exito"), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={paso === "formulario" ? alCerrar : undefined}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Procesando */}
        {paso === "procesando" && (
          <div className="flex flex-col items-center gap-4 px-6 py-14">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
            <p className="text-sm text-muted-foreground">Procesando tu pedido...</p>
          </div>
        )}

        {/* Éxito */}
        {paso === "exito" && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="text-5xl">🌸</span>
            <h3 className="text-lg font-bold">¡Pedido confirmado!</h3>
            <p className="text-sm text-muted-foreground">
              Número de pedido: <strong className="text-foreground">{numeroPedido}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Pedido de demostración — no se ha procesado ningún pago ni se enviará correo.
            </p>
            <button
              onClick={alConfirmar}
              className="mt-3 w-full rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Volver al catálogo
            </button>
          </div>
        )}

        {/* Formulario */}
        {paso === "formulario" && (
          <>
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-bold">Confirmar pedido</h2>
              <p className="text-xs text-muted-foreground">
                {items.reduce((s, i) => s + i.cantidad, 0)} producto(s) · Total:{" "}
                <strong className="text-rose-600">${total.toFixed(2)}</strong>
              </p>
            </div>

            <div className="flex flex-col gap-3 px-6 py-5">
              {/* Nombre */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={form.nombre}
                  onChange={(e) => cambiar("nombre", e.target.value)}
                  onInput={(e) => cambiar("nombre", (e.target as HTMLInputElement).value)}
                  className={INPUT_CLS}
                  placeholder="Tu nombre"
                />
                {errores.nombre && <p className="mt-1 text-xs text-red-500">{errores.nombre}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => cambiar("email", e.target.value)}
                  onInput={(e) => cambiar("email", (e.target as HTMLInputElement).value)}
                  className={INPUT_CLS}
                  placeholder="tu@email.com"
                />
                {errores.email && <p className="mt-1 text-xs text-red-500">{errores.email}</p>}
              </div>

              {/* Dirección */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Dirección de entrega <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="street-address"
                  autoComplete="street-address"
                  value={form.direccion}
                  onChange={(e) => cambiar("direccion", e.target.value)}
                  onInput={(e) => cambiar("direccion", (e.target as HTMLInputElement).value)}
                  className={INPUT_CLS}
                  placeholder="Calle, número, ciudad"
                />
                {errores.direccion && (
                  <p className="mt-1 text-xs text-red-500">{errores.direccion}</p>
                )}
              </div>

              {/* Nota */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nota para el pedido
                </label>
                <textarea
                  value={form.nota}
                  onChange={(e) => cambiar("nota", e.target.value)}
                  rows={2}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Instrucciones especiales, dedicatoria..."
                />
              </div>

              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                Simulación de pago — no se realizará ningún cargo real.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={confirmar}
                  className="flex-1 rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
                >
                  Confirmar pedido
                </button>
                <button
                  onClick={alCerrar}
                  className="rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
