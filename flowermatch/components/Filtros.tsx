"use client"

import type { FiltrosFlores } from "@/lib/tipos"
import { COLORES, FILTROS_INICIALES } from "@/lib/constantes"

const OCASIONES = [
  "romance", "amor", "amistad", "cumpleaños", "aniversario",
  "boda", "disculpa", "alegría", "lujo", "serenidad",
]

interface PropsFiltros {
  filtros: FiltrosFlores
  totalResultados: number
  alCambiar: (campo: keyof FiltrosFlores, valor: string | number) => void
  alLimpiar: () => void
}

export function PanelFiltros({ filtros, totalResultados, alCambiar, alLimpiar }: PropsFiltros) {
  const hayFiltrosActivos =
    filtros.color !== "" ||
    filtros.ocasion !== "" ||
    filtros.precioMin > FILTROS_INICIALES.precioMin ||
    filtros.precioMax < FILTROS_INICIALES.precioMax ||
    filtros.orden !== FILTROS_INICIALES.orden

  return (
    <aside className="flex flex-col gap-4">
      {/* Contador */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalResultados}</span>{" "}
          {totalResultados === 1 ? "flor encontrada" : "flores encontradas"}
        </p>
        {hayFiltrosActivos && (
          <button
            onClick={alLimpiar}
            className="text-xs text-rose-600 hover:underline dark:text-rose-400"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Ordenar */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ordenar por
        </label>
        <select
          value={filtros.orden}
          onChange={(e) => alCambiar("orden", e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
        >
          <option value="nombre">Nombre A-Z</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
        </select>
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Color
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COLORES.map((color) => (
            <button
              key={color}
              onClick={() => alCambiar("color", filtros.color === color ? "" : color)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtros.color === color
                  ? "bg-rose-500 text-white"
                  : "border border-border bg-muted text-muted-foreground hover:border-rose-300 hover:text-rose-700"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Ocasión */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ocasión
        </label>
        <div className="flex flex-wrap gap-1.5">
          {OCASIONES.map((ocasion) => (
            <button
              key={ocasion}
              onClick={() => alCambiar("ocasion", filtros.ocasion === ocasion ? "" : ocasion)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtros.ocasion === ocasion
                  ? "bg-rose-500 text-white"
                  : "border border-border bg-muted text-muted-foreground hover:border-rose-300 hover:text-rose-700"
              }`}
            >
              {ocasion}
            </button>
          ))}
        </div>
      </div>

      {/* Precio */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Rango de precio
        </label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Mínimo</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filtros.precioMin}
              onChange={(e) => alCambiar("precioMin", Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              placeholder="$0"
            />
          </div>
          <span className="mt-4 text-muted-foreground">—</span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Máximo</span>
            <input
              type="number"
              min={0}
              max={200}
              value={filtros.precioMax}
              onChange={(e) => alCambiar("precioMax", Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              placeholder="$100"
            />
          </div>
        </div>
        {filtros.precioMin > filtros.precioMax && (
          <p className="text-xs text-red-600 dark:text-red-400">
            El mínimo no puede ser mayor que el máximo.
          </p>
        )}
      </div>
    </aside>
  )
}
