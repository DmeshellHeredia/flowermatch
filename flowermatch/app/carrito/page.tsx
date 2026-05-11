"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  obtenerCarrito, cambiarCantidad, quitarDelCarrito,
  vaciarCarrito, EVENTO_CARRITO,
} from "@/lib/carrito"
import { ModalCheckout } from "@/components/ModalCheckout"
import type { ItemCarrito } from "@/lib/tipos"
import { sanitizarImagen } from "@/lib/utils"

export default function PaginaCarrito() {
  const router                              = useRouter()
  const [items, setItems]                   = useState<ItemCarrito[]>([])
  const [checkout, setCheckout]             = useState(false)

  useEffect(() => {
    const actualizar = () => setItems(obtenerCarrito())
    actualizar()
    window.addEventListener(EVENTO_CARRITO, actualizar)
    return () => window.removeEventListener(EVENTO_CARRITO, actualizar)
  }, [])

  const total    = items.reduce((s, i) => s + i.flor.precio * i.cantidad, 0)
  const cantidad = items.reduce((s, i) => s + i.cantidad, 0)

  const alConfirmarPedido = () => {
    vaciarCarrito()
    setCheckout(false)
    router.push("/")
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="text-6xl">🛒</span>
        <h1 className="text-xl font-bold">Tu carrito está vacío</h1>
        <p className="text-sm text-muted-foreground">Agrega flores desde el catálogo</p>
        <Link
          href="/"
          className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Tu carrito</h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Lista de items */}
        <div className="flex-1 flex flex-col gap-3">
          {items.map(({ flor, cantidad: cant }) => (
            <div
              key={flor.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              {/* Miniatura */}
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {sanitizarImagen(flor.imagen) ? (
                  <img
                    src={encodeURI(sanitizarImagen(flor.imagen)!)}
                    alt={flor.nombre}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🌺</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold">{flor.nombre}</p>
                <p className="text-sm text-rose-600">${Number(flor.precio).toFixed(2)}</p>
              </div>

              {/* Controles cantidad */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => cambiarCantidad(flor.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm hover:bg-muted"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-medium">{cant}</span>
                <button
                  onClick={() => cambiarCantidad(flor.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm hover:bg-muted"
                >
                  +
                </button>
              </div>

              {/* Subtotal + quitar */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">${(flor.precio * cant).toFixed(2)}</p>
                <button
                  onClick={() => quitarDelCarrito(flor.id)}
                  className="mt-1 text-xs text-muted-foreground hover:text-red-500"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => vaciarCarrito()}
            className="self-start text-xs text-muted-foreground hover:text-red-500"
          >
            Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm lg:w-64 lg:shrink-0">
          <h2 className="mb-4 font-semibold">Resumen</h2>
          <div className="mb-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Productos ({cantidad})</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Envío</span>
              <span className="text-green-600">Gratis</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="text-rose-600">${total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => setCheckout(true)}
            className="w-full rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
          >
            Proceder al pago
          </button>
          <Link
            href="/"
            className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Seguir comprando
          </Link>
        </div>
      </div>

      {checkout && (
        <ModalCheckout
          items={items}
          total={total}
          alCerrar={() => setCheckout(false)}
          alConfirmar={alConfirmarPedido}
        />
      )}
    </div>
  )
}
