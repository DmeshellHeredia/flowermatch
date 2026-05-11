import { describe, it, expect } from "vitest"
import { aplicarFiltrosLocales, FLORES_ESTATICAS } from "@/lib/api"

describe("aplicarFiltrosLocales", () => {
  it("sin filtros devuelve todas las flores", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS)
    expect(resultado).toHaveLength(FLORES_ESTATICAS.length)
  })

  it("con filtros vacíos {} ordena por nombre por defecto", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, {})
    expect(resultado).toHaveLength(FLORES_ESTATICAS.length)
    for (let i = 1; i < resultado.length; i++) {
      expect(resultado[i - 1].nombre.localeCompare(resultado[i].nombre, "es")).toBeLessThanOrEqual(0)
    }
  })

  it("filtra por color", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { color: "Rojo" })
    expect(resultado.length).toBeGreaterThan(0)
    resultado.forEach((f) => expect(f.color).toBe("Rojo"))
  })

  it("filtra por ocasión (parcial)", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { ocasion: "romance" })
    expect(resultado.length).toBeGreaterThan(0)
    resultado.forEach((f) => expect(f.ocasion).toMatch(/romance/))
  })

  it("filtra por precio mínimo", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { precioMin: 30 })
    resultado.forEach((f) => expect(f.precio).toBeGreaterThanOrEqual(30))
  })

  it("filtra por precio máximo", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { precioMax: 20 })
    resultado.forEach((f) => expect(f.precio).toBeLessThanOrEqual(20))
  })

  it("filtra por búsqueda de texto (ignora acentos)", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { busqueda: "Orquidea" })
    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado[0].nombre).toMatch(/Orquídea/i)
  })

  it("búsqueda sin resultados devuelve arreglo vacío", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { busqueda: "xyz_no_existe" })
    expect(resultado).toHaveLength(0)
  })

  it("ordena por precio ascendente", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { orden: "precio_asc" })
    for (let i = 1; i < resultado.length; i++) {
      expect(resultado[i - 1].precio).toBeLessThanOrEqual(resultado[i].precio)
    }
  })

  it("ordena por precio descendente", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { orden: "precio_desc" })
    for (let i = 1; i < resultado.length; i++) {
      expect(resultado[i - 1].precio).toBeGreaterThanOrEqual(resultado[i].precio)
    }
  })

  it("combina color y precio máximo", () => {
    const resultado = aplicarFiltrosLocales(FLORES_ESTATICAS, { color: "Morado", precioMax: 25 })
    resultado.forEach((f) => {
      expect(f.color).toBe("Morado")
      expect(f.precio).toBeLessThanOrEqual(25)
    })
  })
})
