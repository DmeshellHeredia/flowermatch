import { RecomendadorForm } from "@/components/RecomendadorForm"

export default function PaginaRecomendaciones() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Encabezado */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-rose-100 to-pink-200 text-3xl dark:from-rose-950/40 dark:to-pink-900/30">
          🤖
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Recomendador Inteligente</h1>
        <p className="text-muted-foreground">
          Describe la ocasión o el sentimiento que quieres expresar y nuestro sistema
          encontrará las flores perfectas para ti.
        </p>
      </div>

      {/* Cómo funciona */}
      <div className="mb-8 grid grid-cols-3 gap-3 text-center">
        {[
          { emoji: "✍️", paso: "1. Describe", desc: "Escribe en tus palabras" },
          { emoji: "🧠", paso: "2. Analiza",  desc: "Detecta tu intención" },
          { emoji: "🌸", paso: "3. Recibe",   desc: "Flores perfectas" },
        ].map(({ emoji, paso, desc }) => (
          <div key={paso} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-1 text-2xl">{emoji}</div>
            <p className="text-xs font-semibold text-foreground">{paso}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Formulario principal */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <RecomendadorForm />
      </div>

      {/* Intenciones reconocidas */}
      <div className="mt-8 rounded-2xl bg-muted/50 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Intenciones que reconocemos
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { emoji: "❤️",  etiqueta: "Amor romántico" },
            { emoji: "🤝",  etiqueta: "Amistad" },
            { emoji: "🙏",  etiqueta: "Disculpa" },
            { emoji: "🎂",  etiqueta: "Cumpleaños" },
            { emoji: "💍",  etiqueta: "Aniversario" },
            { emoji: "🙌",  etiqueta: "Agradecimiento" },
            { emoji: "🕊️", etiqueta: "Luto / condolencias" },
            { emoji: "🎓",  etiqueta: "Graduación" },
            { emoji: "💊",  etiqueta: "Pronta recuperación" },
            { emoji: "👶",  etiqueta: "Nacimiento" },
            { emoji: "🌺",  etiqueta: "Día de las madres" },
            { emoji: "🎨",  etiqueta: "Decoración" },
            { emoji: "✨",  etiqueta: "Regalo de lujo" },
            { emoji: "🌿",  etiqueta: "Bienestar" },
          ].map(({ emoji, etiqueta }) => (
            <div key={etiqueta} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
              <span>{emoji}</span>
              <span className="text-sm text-muted-foreground">{etiqueta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
