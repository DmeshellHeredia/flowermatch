/**
 * Paridad Python ↔ TS — recomendador de flores
 *
 * Diferencia arquitectónica:
 *   Python (TF-IDF) → tf * idf * bonus     idf = log(N/df), bonus = n° palabras keyword
 *   TS    (count)   → bonus                solo longitud de keyword, sin IDF ni TF
 *
 * Con el dataset actual, casi toda keyword es única por intención → IDF ≈ constante
 * → mismo orden relativo → misma intención ganadora.
 *
 * Todos los tests pasan por obtenerRecomendaciones() con fetch fallido para
 * ejercer el fallback local (recomendarLocalmente) sin mockear funciones internas.
 *
 * Para detectar divergencias entre Python y TS en tiempo de desarrollo:
 *   node scripts/check-paridad-recomendador.js
 */
import { describe, it, expect, beforeEach } from "vitest"
import { obtenerRecomendaciones } from "@/lib/api"

const mockFetch = vi.mocked(global.fetch)

beforeEach(() => {
  mockFetch.mockRejectedValue(new Error("Network Error"))
})

// ─── Frases prioritarias — ningún algoritmo puede divergir ──────────────────
// El bonus de 50 * n_palabras supera cualquier score TF-IDF de keywords sueltas.
// Python y TS producen el mismo ganador sin excepción.
describe("paridad — frases prioritarias dominan", () => {
  it('"quiero pedir perdón a mi mejor amigo" → disculpa (frase prioritaria 100pts vs amistad 2pts)', async () => {
    const r = await obtenerRecomendaciones("quiero pedir perdón a mi mejor amigo")
    expect(r.intencion).toBe("disculpa")
    // Python coincide: misma frase prioritaria, mismo peso.
  })

  it('"condolencias para una amiga" → luto (frase prioritaria 50pts vs amistad 1pt)', async () => {
    const r = await obtenerRecomendaciones("condolencias para una amiga")
    expect(r.intencion).toBe("luto")
  })

  it('"quiero agradecer a una compañera" → agradecimiento (frase prioritaria "quiero agradecer" 100pts)', async () => {
    const r = await obtenerRecomendaciones("quiero agradecer a una compañera")
    expect(r.intencion).toBe("agradecimiento")
  })

  it('"flores para el día de las madres" → dia_madres (frase prioritaria 200pts)', async () => {
    const r = await obtenerRecomendaciones("flores para el día de las madres")
    expect(r.intencion).toBe("dia_madres")
  })

  it('"funeral de un amigo" → luto (frase prioritaria 50pts vs amistad 1pt)', async () => {
    const r = await obtenerRecomendaciones("funeral de un amigo")
    expect(r.intencion).toBe("luto")
  })

  it('"necesito reconciliarme con mi pareja" → disculpa (frase prioritaria 50pts vs romance 1pt)', async () => {
    const r = await obtenerRecomendaciones("necesito reconciliarme con mi pareja")
    expect(r.intencion).toBe("disculpa")
  })

  it('"baby shower para mi hermana" → nacimiento (frase prioritaria 100pts)', async () => {
    const r = await obtenerRecomendaciones("baby shower para mi hermana")
    expect(r.intencion).toBe("nacimiento")
  })

  it('"lo siento mucho, fue mi culpa" → disculpa (varias frases prioritarias)', async () => {
    const r = await obtenerRecomendaciones("lo siento mucho, fue mi culpa")
    expect(r.intencion).toBe("disculpa")
  })
})

// ─── Keywords claros — una sola intención activa ────────────────────────────
// Cuando solo hay matches en una intención, ambos algoritmos coinciden.
describe("paridad — keyword único por intención", () => {
  it('"flores para mi novia" → romance ("novia" solo en romance)', async () => {
    const r = await obtenerRecomendaciones("flores para mi novia")
    expect(r.intencion).toBe("romance")
  })

  it('"algo para relajar y dar calma" → bienestar ("relajar"+"calma" ambos en bienestar)', async () => {
    const r = await obtenerRecomendaciones("algo para relajar y dar calma")
    expect(r.intencion).toBe("bienestar")
  })

  it('"aniversario de boda" → aniversario ("aniversario"+"boda" ambos en aniversario)', async () => {
    const r = await obtenerRecomendaciones("aniversario de boda")
    expect(r.intencion).toBe("aniversario")
  })

  it('"computadoras electrodomesticos internet" → general (sin matches)', async () => {
    const r = await obtenerRecomendaciones("computadoras electrodomesticos internet")
    expect(r.intencion).toBe("general")
  })

  it('"amor" → romance (una sola palabra, solo en romance)', async () => {
    const r = await obtenerRecomendaciones("amor")
    expect(r.intencion).toBe("romance")
  })

  it('"gracias" → agradecimiento (solo en agradecimiento)', async () => {
    const r = await obtenerRecomendaciones("gracias")
    expect(r.intencion).toBe("agradecimiento")
  })
})

// ─── Empates — ambos algoritmos los resuelven igual (orden del dict) ─────────
// IDF no resuelve empates porque todas las keywords son únicas por intención.
// El desempate usa el orden del dict JSON — mismo en Python y TS.
// Resultado puede ser contra-intuitivo pero es CONSISTENTE entre implementaciones.
describe("paridad — empates con desempate por orden de dict", () => {
  it('"gracias por tu apoyo" → amistad (empate; amistad antes que agradecimiento en dict)', async () => {
    const r = await obtenerRecomendaciones("gracias por tu apoyo")
    // "apoyo" → amistad 1pt  |  "gracias" → agradecimiento 1pt
    // Empate → primer key con score máximo = amistad (2°) antes que agradecimiento (6°).
    // Python produce el mismo resultado: IDF es constante cuando df=1.
    // Humano esperaría "agradecimiento" — ambas implementaciones fallan igual.
    expect(r.intencion).toBe("amistad")
  })

  it('"cumpleaños de mi mejor amiga" → amistad (empate; amistad antes que cumpleanos en dict)', async () => {
    const r = await obtenerRecomendaciones("cumpleaños de mi mejor amiga")
    // amistad: "amiga"(1) + "mejor amiga"(2) = 3pts
    // cumpleanos: "cumpleanos"(1) + "cumple"(1) + "anos"(1) = 3pts  ← "años" y "cumple" son
    //   substrings de "cumpleaños", contaminación de keywords cortas.
    // Empate 3-3 → primer key con score máximo = amistad (2°) antes que cumpleanos (4°).
    // Python produce el mismo resultado.
    expect(r.intencion).toBe("amistad")
  })
})

// ─── Modo y contrato del fallback local ─────────────────────────────────────
describe("paridad — contrato del fallback local", () => {
  it("modo local cuando fetch falla", async () => {
    const r = await obtenerRecomendaciones("flores para mi novia")
    expect(r.modo).toBe("local")
  })

  it("consulta_original se preserva exacta", async () => {
    const r = await obtenerRecomendaciones("flores para mi novia")
    expect(r.consulta_original).toBe("flores para mi novia")
  })

  it("flores son un array de objetos con nombre string y precio number", async () => {
    const r = await obtenerRecomendaciones("flores para mi novia")
    expect(Array.isArray(r.flores)).toBe(true)
    for (const f of r.flores) {
      expect(typeof f.nombre).toBe("string")
      expect(typeof f.precio).toBe("number")
    }
  })

  it("mensaje no vacío para cualquier intención", async () => {
    for (const consulta of [
      "flores para mi novia",
      "condolencias",
      "computadoras electrodomesticos",
    ]) {
      const r = await obtenerRecomendaciones(consulta)
      expect(r.mensaje.length).toBeGreaterThan(0)
    }
  })
})
