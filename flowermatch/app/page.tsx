"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TarjetaFlor, obtenerEmoji, obtenerGradiente } from "@/components/FlowerCard"
import { PanelFiltros } from "@/components/Filtros"
import { obtenerFlores } from "@/lib/api"
import { obtenerFavoritos, alternarFavorito } from "@/lib/favoritos"
import { agregarAlCarrito } from "@/lib/carrito"
import type { Flor, FiltrosFlores } from "@/lib/tipos"
import { FILTROS_INICIALES } from "@/lib/constantes"
import { sanitizarImagen } from "@/lib/utils"

export default function PaginaCatalogo() {
  const [flores, setFlores]           = useState<Flor[]>([])
  const [cargando, setCargando]       = useState(true)
  const [filtros, setFiltros]         = useState<FiltrosFlores>(FILTROS_INICIALES)
  const [busqueda, setBusqueda]       = useState("")
  const [favoritos, setFavoritos]     = useState<Set<number>>(new Set())
  const [florSelec, setFlorSelec]     = useState<Flor | null>(null)
  const [agregado, setAgregado]       = useState(false)
  const [modoFallback, setModoFallback] = useState(false)
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const agregadoRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])
  useEffect(() => () => { if (agregadoRef.current) clearTimeout(agregadoRef.current) }, [])

  useEffect(() => { setFavoritos(obtenerFavoritos()) }, [])

  useEffect(() => {
    if (!florSelec) return
    setAgregado(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFlorSelec(null) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [florSelec])

  const manejarAgregarAlCarrito = () => {
    if (!florSelec) return
    agregarAlCarrito(florSelec)
    setAgregado(true)
    if (agregadoRef.current) clearTimeout(agregadoRef.current)
    agregadoRef.current = setTimeout(() => { setAgregado(false); setFlorSelec(null) }, 1500)
  }

  const cargarFlores = useCallback(async (f: FiltrosFlores) => {
    setCargando(true)
    try {
      const { data, fuente } = await obtenerFlores(f)
      setFlores(data)
      setModoFallback(fuente === "estatica")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarFlores(filtros) }, [filtros, cargarFlores])

  const manejarBusqueda = (valor: string) => {
    setBusqueda(valor)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFiltros((f) => ({ ...f, busqueda: valor }))
    }, 300)
  }

  const manejarFiltro = (campo: keyof FiltrosFlores, valor: string | number) => {
    setFiltros((f) => ({ ...f, [campo]: valor }))
  }

  const limpiarFiltros = () => {
    setBusqueda("")
    setFiltros(FILTROS_INICIALES)
  }

  const manejarFavorito = (id: number) => setFavoritos(alternarFavorito(id))

  const floresFavoritas = flores.filter((f) => favoritos.has(f.id))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero */}
      <section className="mb-10 rounded-3xl bg-linear-to-br from-rose-50 via-pink-50 to-green-50 px-8 py-12 text-center dark:from-rose-950/30 dark:via-pink-950/20 dark:to-green-950/30">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          🌸 Encuentra la flor{" "}
          <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            perfecta
          </span>
        </h1>
        <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
          Explora nuestro catálogo o usa el{" "}
          <a href="/recomendaciones" className="font-medium text-rose-600 underline-offset-2 hover:underline dark:text-rose-400">
            recomendador inteligente
          </a>{" "}
          para cada ocasión especial.
        </p>
        {/* Buscador */}
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 shadow-sm">
          <span className="text-muted-foreground">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => manejarBusqueda(e.target.value)}
            placeholder="Buscar por nombre, color o descripción..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {busqueda && (
            <button
              onClick={() => manejarBusqueda("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {modoFallback && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
          <strong>Modo local:</strong> Mostrando catálogo local temporal.
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar de filtros */}
        <aside className="lg:w-64 lg:shrink-0">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Filtrar</h2>
            <PanelFiltros
              filtros={filtros}
              totalResultados={flores.length}
              alCambiar={manejarFiltro}
              alLimpiar={limpiarFiltros}
            />
          </div>
        </aside>

        {/* Catálogo */}
        <div className="flex-1">
          {/* Favoritos */}
          {floresFavoritas.length > 0 && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-800/40 dark:bg-rose-950/20">
              <h2 className="mb-3 font-semibold text-rose-700 dark:text-rose-400">
                ❤️ Mis favoritas ({floresFavoritas.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {floresFavoritas.map((f) => (
                  <TarjetaFlor
                    key={f.id}
                    flor={f}
                    esFavorito
                    alAlternarFavorito={manejarFavorito}
                    alVerDetalle={setFlorSelec}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grid principal */}
          {cargando ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : flores.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {flores.map((flor) => (
                <TarjetaFlor
                  key={flor.id}
                  flor={flor}
                  esFavorito={favoritos.has(flor.id)}
                  alAlternarFavorito={manejarFavorito}
                  alVerDetalle={setFlorSelec}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted px-6 py-16 text-center">
              <span className="text-5xl">🌱</span>
              <p className="font-medium text-foreground">No encontramos flores con esos filtros.</p>
              <p className="text-sm text-muted-foreground">Prueba con otros criterios de búsqueda.</p>
              <button
                onClick={limpiarFiltros}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      {florSelec && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setFlorSelec(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative flex h-40 items-center justify-center ${obtenerGradiente(florSelec.color)}`}>
              <span className="text-7xl">{obtenerEmoji(florSelec.nombre)}</span>
              {sanitizarImagen(florSelec.imagen) && (
                <img
                  src={encodeURI(sanitizarImagen(florSelec.imagen)!)}
                  alt={florSelec.nombre}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
              )}
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-xl font-bold">{florSelec.nombre}</h2>
                <span className="text-2xl font-bold text-rose-600">${Number(florSelec.precio).toFixed(2)}</span>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{florSelec.descripcion}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{florSelec.color}</span>
                {florSelec.ocasion.split(",").map((o) => (
                  <span key={o} className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                    {o.trim()}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={manejarAgregarAlCarrito}
                  disabled={agregado}
                  className="flex-1 rounded-xl bg-rose-500 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-default disabled:bg-rose-400"
                >
                  {agregado ? "✓ Agregado" : "Agregar al carrito"}
                </button>
                <button
                  onClick={() => setFlorSelec(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
