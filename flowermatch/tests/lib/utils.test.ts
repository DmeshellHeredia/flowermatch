import { describe, it, expect } from "vitest"
import { sanitizarImagen, validarImagenInput } from "@/lib/utils"

describe("sanitizarImagen", () => {
  it("devuelve null para null", () => {
    expect(sanitizarImagen(null)).toBeNull()
  })

  it("devuelve null para undefined", () => {
    expect(sanitizarImagen(undefined)).toBeNull()
  })

  it("devuelve null para cadena vacía", () => {
    expect(sanitizarImagen("")).toBeNull()
  })

  it("pasa ruta relativa válida sin modificar", () => {
    expect(sanitizarImagen("/imagenes/flores/rosa.jpg")).toBe("/imagenes/flores/rosa.jpg")
  })

  it("pasa URL https válida sin modificar", () => {
    expect(sanitizarImagen("https://example.com/flor.jpg")).toBe("https://example.com/flor.jpg")
  })

  it("bloquea javascript:", () => {
    expect(sanitizarImagen("javascript:alert(1)")).toBeNull()
  })

  it("bloquea javascript: en mayúsculas", () => {
    expect(sanitizarImagen("JAVASCRIPT:alert(1)")).toBeNull()
  })

  it("bloquea javascript: con espacios iniciales", () => {
    expect(sanitizarImagen("  javascript:alert(1)")).toBeNull()
  })

  it("bloquea data:", () => {
    expect(sanitizarImagen("data:image/png;base64,abc")).toBeNull()
  })

  it("bloquea data: en mayúsculas", () => {
    expect(sanitizarImagen("DATA:text/html,<h1>x</h1>")).toBeNull()
  })

  it("bloquea vbscript:", () => {
    expect(sanitizarImagen("vbscript:alert(1)")).toBeNull()
  })

  it("bloquea vbscript: en mayúsculas", () => {
    expect(sanitizarImagen("VBSCRIPT:alert(1)")).toBeNull()
  })
})

describe("validarImagenInput", () => {
  it("acepta cadena vacía", () => {
    expect(validarImagenInput("")).toBeNull()
  })

  it("acepta ruta relativa", () => {
    expect(validarImagenInput("/imagenes/flores/Rosa.jpg")).toBeNull()
  })

  it("acepta URL https", () => {
    expect(validarImagenInput("https://example.com/a.jpg")).toBeNull()
  })

  it("rechaza javascript:", () => {
    expect(validarImagenInput("javascript:alert(1)")).toBe("URL de imagen no permitida.")
  })

  it("rechaza javascript: en mayúsculas", () => {
    expect(validarImagenInput("JAVASCRIPT:alert(1)")).toBe("URL de imagen no permitida.")
  })

  it("rechaza javascript: con espacios iniciales", () => {
    expect(validarImagenInput("  javascript:alert(1)")).toBe("URL de imagen no permitida.")
  })

  it("rechaza data:", () => {
    expect(validarImagenInput("data:image/png;base64,abc")).toBe("URL de imagen no permitida.")
  })

  it("rechaza data: en mayúsculas", () => {
    expect(validarImagenInput("DATA:text/html,<h1>x</h1>")).toBe("URL de imagen no permitida.")
  })

  it("rechaza vbscript:", () => {
    expect(validarImagenInput("vbscript:alert(1)")).toBe("URL de imagen no permitida.")
  })

  it("rechaza path con ..", () => {
    expect(validarImagenInput("../etc/passwd")).toBe("URL de imagen no permitida.")
  })

  it("rechaza path con .. interno", () => {
    expect(validarImagenInput("/imagenes/../../../etc/passwd")).toBe("URL de imagen no permitida.")
  })
})
