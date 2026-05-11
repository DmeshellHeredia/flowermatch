"use client"

import { useState } from "react"
import { obtenerRecomendaciones } from "@/lib/api"
import { TarjetaFlor } from "@/components/FlowerCard"
import { alternarFavorito, obtenerFavoritos } from "@/lib/favoritos"
import type { Recomendacion, ModoRecomendacion } from "@/lib/tipos"
import type { Flor } from "@/lib/tipos"

const ETIQUETAS_INTENCION: Record<string, { etiqueta: string; emoji: string; color: string }> = {
  romance:        { etiqueta: "Amor romántico",      emoji: "❤️",  color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400" },
  amistad:        { etiqueta: "Amistad",             emoji: "🤝",  color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
  disculpa:       { etiqueta: "Disculpa",            emoji: "🙏",  color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400" },
  cumpleanos:     { etiqueta: "Cumpleaños",          emoji: "🎂",  color: "text-pink-600 bg-pink-50 dark:bg-pink-950/30 dark:text-pink-400" },
  aniversario:    { etiqueta: "Aniversario",         emoji: "💍",  color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400" },
  agradecimiento: { etiqueta: "Agradecimiento",      emoji: "🙌",  color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400" },
  luto:           { etiqueta: "Luto / condolencias",  emoji: "🕊️",  color: "text-slate-600 bg-slate-50 dark:bg-slate-950/30 dark:text-slate-400" },
  graduacion:     { etiqueta: "Graduación",          emoji: "🎓",  color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400" },
  salud:          { etiqueta: "Pronta recuperación", emoji: "💊",  color: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400" },
  nacimiento:     { etiqueta: "Nacimiento",          emoji: "👶",  color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-400" },
  dia_madres:     { etiqueta: "Día de las madres",   emoji: "🌺",  color: "text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300" },
  decoracion:     { etiqueta: "Decoración",          emoji: "🎨",  color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400" },
  lujo:           { etiqueta: "Regalo de lujo",      emoji: "✨",  color: "text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400" },
  bienestar:      { etiqueta: "Bienestar",           emoji: "🌿",  color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
  general:        { etiqueta: "General",             emoji: "🌸",  color: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400" },
  desconocida:    { etiqueta: "Sin determinar",      emoji: "🤔",  color: "text-gray-500 bg-gray-50 dark:bg-gray-950/30 dark:text-gray-400" },
}

const ETIQUETAS_CONTEXTO: Record<string, string> = {
  amistad: "Amistad",
  pareja:  "Pareja",
  familia: "Familia",
  trabajo: "Trabajo",
}

const ETIQUETAS_MODO: Record<ModoRecomendacion, string> = {
  "python-nlp": "IA Python",
  "php-reglas": "fallback PHP",
  "local":      "fallback navegador",
}

const SUGERENCIAS = [
  "Necesito un regalo para pedir perdón a mi mejor amigo",
  "Condolencias para una amiga",
  "Quiero agradecer a una compañera de trabajo",
  "Algo para relajar y dar calma",
  "Regalo para mi mamá en el día de las madres",
]

export function RecomendadorForm() {
  const [consulta, setConsulta]   = useState("")
  const [resultado, setResultado] = useState<Recomendacion | null>(null)
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState("")
  const [favoritos, setFavoritos] = useState<Set<number>>(obtenerFavoritos)

  const manejarAlternarFavorito = (id: number) => {
    setFavoritos(alternarFavorito(id))
  }

  const manejarEnvio = async (texto?: string) => {
    const q = (texto ?? consulta).trim()
    if (!q) { setError("Por favor escribe algo antes de buscar."); return }

    setCargando(true)
    setError("")
    setResultado(null)

    try {
      const res = await obtenerRecomendaciones(q)
      setResultado(res)
      if (texto) setConsulta(texto)
    } catch {
      setError("Ocurrió un error al obtener recomendaciones. Intenta nuevamente.")
    } finally {
      setCargando(false)
    }
  }

  const intencionInfo = resultado ? (ETIQUETAS_INTENCION[resultado.intencion] ?? null) : null

  return (
    <div className="flex flex-col gap-8">
      {/* Formulario */}
      <div className="flex flex-col gap-4">
        <textarea
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); manejarEnvio() }
          }}
          placeholder="Ej: Quiero flores para sorprender a mi pareja en nuestro aniversario..."
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-background p-4 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={() => manejarEnvio()}
          disabled={cargando || !consulta.trim()}
          className="w-full rounded-xl bg-rose-500 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-700"
        >
          {cargando ? "Analizando... 🔍" : "Encontrar flores perfectas 🌸"}
        </button>
      </div>

      {/* Sugerencias */}
      {!resultado && !cargando && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prueba una de estas consultas
          </p>
          <div className="flex flex-col gap-1.5">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                onClick={() => manejarEnvio(s)}
                className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="flex flex-col gap-6">
          {/* Intención + Contexto */}
          {intencionInfo && (
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <span className="text-2xl">{intencionInfo.emoji}</span>
              <div className="flex flex-1 flex-wrap gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Intención detectada</p>
                  <span className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${intencionInfo.color}`}>
                    {intencionInfo.etiqueta}
                  </span>
                </div>
                {resultado.contexto && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contexto</p>
                    <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-sm font-medium text-foreground">
                      {ETIQUETAS_CONTEXTO[resultado.contexto] ?? resultado.contexto}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {resultado.degradado && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
              Servicio temporalmente limitado. No se pudo acceder al catálogo.
            </div>
          )}

          {resultado.modo === "local" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
              El servicio de IA no está disponible. Resultados generados localmente.
            </div>
          )}

          <p className="font-medium text-foreground">{resultado.mensaje}</p>

          {resultado.flores.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resultado.flores.map((flor: Flor) => (
                <TarjetaFlor
                  key={flor.id}
                  flor={flor}
                  esFavorito={favoritos.has(flor.id)}
                  alAlternarFavorito={manejarAlternarFavorito}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-6 text-center text-muted-foreground">
              No encontramos flores para esta consulta. Intenta con otras palabras.
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => { setResultado(null); setConsulta("") }}
              className="text-sm text-rose-600 hover:underline dark:text-rose-400"
            >
              ← Nueva consulta
            </button>
            {resultado.modo && (
              <p className="text-xs text-muted-foreground">
                Modo:{" "}
                <span className="font-medium">
                  {ETIQUETAS_MODO[resultado.modo] ?? resultado.modo}
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
