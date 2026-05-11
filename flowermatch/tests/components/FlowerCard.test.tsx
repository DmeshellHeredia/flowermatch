import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TarjetaFlor } from "@/components/FlowerCard"
import type { Flor } from "@/lib/tipos"

const flor: Flor = {
  id: 1, nombre: "Rosa Roja", color: "Rojo",
  ocasion: "romance,amor", precio: 25,
  descripcion: "La reina de las flores.",
  imagen: "", disponible: true, creado_en: "2024-01-01",
}

beforeEach(() => localStorage.clear())

describe("TarjetaFlor", () => {
  it("muestra el nombre y precio", () => {
    render(
      <TarjetaFlor
        flor={flor}
        esFavorito={false}
        alAlternarFavorito={vi.fn()}
      />
    )
    expect(screen.getByText("Rosa Roja")).toBeInTheDocument()
    expect(screen.getByText("$25.00")).toBeInTheDocument()
  })

  it("muestra etiquetas de ocasión", () => {
    render(
      <TarjetaFlor
        flor={flor}
        esFavorito={false}
        alAlternarFavorito={vi.fn()}
      />
    )
    expect(screen.getByText("romance")).toBeInTheDocument()
    expect(screen.getByText("amor")).toBeInTheDocument()
  })

  it("llama alAlternarFavorito al hacer click en el botón de corazón", () => {
    const alAlternar = vi.fn()
    render(
      <TarjetaFlor
        flor={flor}
        esFavorito={false}
        alAlternarFavorito={alAlternar}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /favorito/i }))
    expect(alAlternar).toHaveBeenCalledWith(1)
  })

  it("cambia el texto del botón a '✓ Agregado' al agregar al carrito", async () => {
    render(
      <TarjetaFlor
        flor={flor}
        esFavorito={false}
        alAlternarFavorito={vi.fn()}
      />
    )
    const boton = screen.getByText("🛒 Agregar").closest("button")!
    fireEvent.click(boton)
    expect(await screen.findByText(/Agregado/)).toBeInTheDocument()
  })

  it("muestra botón 'Ver' cuando se provee alVerDetalle", () => {
    render(
      <TarjetaFlor
        flor={flor}
        esFavorito={false}
        alAlternarFavorito={vi.fn()}
        alVerDetalle={vi.fn()}
      />
    )
    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument()
  })

  it("llama alVerDetalle al hacer click en 'Ver'", () => {
    const alVer = vi.fn()
    render(
      <TarjetaFlor
        flor={flor}
        esFavorito={false}
        alAlternarFavorito={vi.fn()}
        alVerDetalle={alVer}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Ver" }))
    expect(alVer).toHaveBeenCalledWith(flor)
  })
})
