import { describe, it, expect, beforeEach } from "vitest"
import { obtenerFavoritos, guardarFavoritos, alternarFavorito } from "@/lib/favoritos"

beforeEach(() => localStorage.clear())

describe("favoritos", () => {
  it("devuelve Set vacío si no hay datos", () => {
    expect(obtenerFavoritos().size).toBe(0)
  })

  it("guarda y recupera favoritos", () => {
    guardarFavoritos(new Set([1, 2, 3]))
    const f = obtenerFavoritos()
    expect(f.has(1)).toBe(true)
    expect(f.has(3)).toBe(true)
    expect(f.size).toBe(3)
  })

  it("alternar agrega si no existe", () => {
    const resultado = alternarFavorito(5)
    expect(resultado.has(5)).toBe(true)
  })

  it("alternar quita si ya existe", () => {
    guardarFavoritos(new Set([5]))
    const resultado = alternarFavorito(5)
    expect(resultado.has(5)).toBe(false)
  })

  it("no afecta otros IDs al quitar uno", () => {
    guardarFavoritos(new Set([1, 2, 3]))
    const resultado = alternarFavorito(2)
    expect(resultado.has(1)).toBe(true)
    expect(resultado.has(2)).toBe(false)
    expect(resultado.has(3)).toBe(true)
  })
})
