"use client"

import { useState } from "react"
import type { Flor } from "@/lib/tipos"
import { agregarAlCarrito } from "@/lib/carrito"
import { sanitizarImagen } from "@/lib/utils"

const EMOJI_POR_NOMBRE: Record<string, string> = {
  "Rosa Roja":       "🌹",
  "Girasol":         "🌻",
  "Tulipán Morado":  "🌷",
  "Lirio Blanco":    "🤍",
  "Margarita":       "🌼",
  "Orquídea Púrpura":"🌺",
  "Clavel Rosado":   "🌸",
  "Amapola Roja":    "🌺",
  "Hortensia Azul":  "💙",
  "Gerbera Naranja": "🌸",
  "Lavanda":         "💜",
  "Peonía Rosa":     "🌸",
}

const GRADIENTE_POR_COLOR: Record<string, string> = {
  "Rojo":         "bg-linear-to-br from-rose-400 to-red-600",
  "Amarillo":     "bg-linear-to-br from-yellow-300 to-amber-500",
  "Morado":       "bg-linear-to-br from-violet-400 to-purple-700",
  "Blanco":       "bg-linear-to-br from-slate-100 to-gray-300",
  "Rosado":       "bg-linear-to-br from-pink-300 to-rose-500",
  "Azul":         "bg-linear-to-br from-sky-400 to-indigo-600",
  "Naranja":      "bg-linear-to-br from-orange-300 to-amber-500",
  "Morado claro": "bg-linear-to-br from-purple-200 to-violet-400",
  "Verde":        "bg-linear-to-br from-emerald-300 to-green-600",
}

export function obtenerEmoji(nombre: string): string {
  return EMOJI_POR_NOMBRE[nombre] ?? "🌺"
}

export function obtenerGradiente(color: string): string {
  return GRADIENTE_POR_COLOR[color] ?? "bg-linear-to-br from-rose-300 to-pink-500"
}

function formatearOcasiones(ocasion: string): string[] {
  return ocasion.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 3)
}


interface PropsTarjeta {
  flor: Flor
  esFavorito: boolean
  alAlternarFavorito: (id: number) => void
  alVerDetalle?: (flor: Flor) => void
}

export function TarjetaFlor({ flor, esFavorito, alAlternarFavorito, alVerDetalle }: PropsTarjeta) {
  const gradiente  = obtenerGradiente(flor.color)
  const emoji      = obtenerEmoji(flor.nombre)
  const ocasiones  = formatearOcasiones(flor.ocasion)
  const imagenSrc  = sanitizarImagen(flor.imagen)
  const [agregado, setAgregado] = useState(false)

  const manejarAgregar = () => {
    agregarAlCarrito(flor)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      {/* Imagen / gradiente */}
      <div className={`relative flex h-36 items-center justify-center ${gradiente}`}>
        <span className="text-6xl drop-shadow-sm transition-transform duration-200 group-hover:scale-110">
          {emoji}
        </span>
        {imagenSrc && (
          <img
            src={encodeURI(imagenSrc)}
            alt={flor.nombre}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none" }}
          />
        )}
        {/* Botón favorito */}
        <button
          onClick={() => alAlternarFavorito(flor.id)}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-sm shadow-sm backdrop-blur-sm transition-transform hover:scale-110 dark:bg-black/40"
          aria-label={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          {esFavorito ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-foreground">{flor.nombre}</h3>
          <span className="shrink-0 text-lg font-bold text-rose-600 dark:text-rose-400">
            ${Number(flor.precio).toFixed(2)}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">{flor.descripcion}</p>

        {/* Etiquetas */}
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {flor.color}
          </span>
          {ocasiones.map((o) => (
            <span
              key={o}
              className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
            >
              {o}
            </span>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={manejarAgregar}
            className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all ${
              agregado
                ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                : "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:hover:bg-rose-950/20"
            }`}
          >
            {agregado ? "✓ Agregado" : "🛒 Agregar"}
          </button>
          {alVerDetalle && (
            <button
              onClick={() => alVerDetalle(flor)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              Ver
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
