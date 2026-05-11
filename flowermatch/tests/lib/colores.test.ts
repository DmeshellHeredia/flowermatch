import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { COLORES } from "@/lib/constantes"

const coloresJSON: string[] = JSON.parse(
  readFileSync(resolve(__dirname, "../../../shared/colores.json"), "utf-8")
)

describe("COLORES — sincronización con shared/colores.json", () => {
  it("COLORES no está vacío", () => {
    expect(COLORES.length).toBeGreaterThan(0)
  })

  it("COLORES coincide exactamente con shared/colores.json", () => {
    expect(COLORES).toEqual(coloresJSON)
  })

  it("todo color en shared/colores.json aparece en COLORES", () => {
    for (const color of coloresJSON) {
      expect(COLORES).toContain(color)
    }
  })

  it("no hay colores en COLORES que no estén en shared/colores.json", () => {
    for (const color of COLORES) {
      expect(coloresJSON).toContain(color)
    }
  })

  it("Rojo está presente", () => {
    expect(COLORES).toContain("Rojo")
  })

  it("Morado claro está presente", () => {
    expect(COLORES).toContain("Morado claro")
  })
})
