import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PanelFiltros } from "@/components/Filtros"
import type { FiltrosFlores } from "@/lib/tipos"

const BASE: FiltrosFlores = {
  color: "", ocasion: "", busqueda: "",
  precioMin: 0, precioMax: 200, orden: "nombre",
}

describe("PanelFiltros — validación rango de precio", () => {
  it("no muestra error con rango válido", () => {
    render(<PanelFiltros filtros={{ ...BASE, precioMin: 10, precioMax: 50 }} totalResultados={5} alCambiar={vi.fn()} alLimpiar={vi.fn()} />)
    expect(screen.queryByText(/mínimo no puede ser mayor/i)).not.toBeInTheDocument()
  })

  it("muestra error cuando precioMin > precioMax", () => {
    render(<PanelFiltros filtros={{ ...BASE, precioMin: 100, precioMax: 50 }} totalResultados={0} alCambiar={vi.fn()} alLimpiar={vi.fn()} />)
    expect(screen.getByText(/mínimo no puede ser mayor/i)).toBeInTheDocument()
  })

  it("no muestra error cuando precioMin === precioMax", () => {
    render(<PanelFiltros filtros={{ ...BASE, precioMin: 50, precioMax: 50 }} totalResultados={0} alCambiar={vi.fn()} alLimpiar={vi.fn()} />)
    expect(screen.queryByText(/mínimo no puede ser mayor/i)).not.toBeInTheDocument()
  })
})
