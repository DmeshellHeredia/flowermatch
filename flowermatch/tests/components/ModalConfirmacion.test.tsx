import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ModalConfirmacion } from "@/components/ModalConfirmacion"

const base = {
  titulo: "Confirmar acción",
  mensaje: "¿Estás seguro de continuar?",
  textoConfirmar: "Sí, confirmar",
  alCancelar: vi.fn(),
  alConfirmar: vi.fn(),
}

describe("ModalConfirmacion", () => {
  it("muestra título y mensaje", () => {
    render(<ModalConfirmacion {...base} />)
    expect(screen.getByText("Confirmar acción")).toBeInTheDocument()
    expect(screen.getByText("¿Estás seguro de continuar?")).toBeInTheDocument()
  })

  it("muestra el texto del botón de confirmar", () => {
    render(<ModalConfirmacion {...base} />)
    expect(screen.getByRole("button", { name: "Sí, confirmar" })).toBeInTheDocument()
  })

  it("click en Cancelar llama alCancelar", () => {
    const alCancelar = vi.fn()
    render(<ModalConfirmacion {...base} alCancelar={alCancelar} />)
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(alCancelar).toHaveBeenCalledOnce()
  })

  it("Escape llama alCancelar cuando no está procesando", () => {
    const alCancelar = vi.fn()
    render(<ModalConfirmacion {...base} alCancelar={alCancelar} />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(alCancelar).toHaveBeenCalledOnce()
  })

  it("click en el overlay llama alCancelar", () => {
    const alCancelar = vi.fn()
    const { container } = render(<ModalConfirmacion {...base} alCancelar={alCancelar} />)
    fireEvent.click(container.firstChild!)
    expect(alCancelar).toHaveBeenCalledOnce()
  })

  it("click dentro del modal no cierra", () => {
    const alCancelar = vi.fn()
    render(<ModalConfirmacion {...base} alCancelar={alCancelar} />)
    fireEvent.click(screen.getByRole("dialog"))
    expect(alCancelar).not.toHaveBeenCalled()
  })

  it("click en confirmar llama alConfirmar", () => {
    const alConfirmar = vi.fn()
    render(<ModalConfirmacion {...base} alConfirmar={alConfirmar} />)
    fireEvent.click(screen.getByRole("button", { name: "Sí, confirmar" }))
    expect(alConfirmar).toHaveBeenCalledOnce()
  })

  it("mientras procesando muestra 'Procesando...'", () => {
    render(<ModalConfirmacion {...base} procesando />)
    expect(screen.getByText("Procesando...")).toBeInTheDocument()
    expect(screen.queryByText("Sí, confirmar")).toBeNull()
  })

  it("Escape no llama alCancelar mientras procesando", () => {
    const alCancelar = vi.fn()
    render(<ModalConfirmacion {...base} alCancelar={alCancelar} procesando />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(alCancelar).not.toHaveBeenCalled()
  })

  it("botones deshabilitados mientras procesando", () => {
    render(<ModalConfirmacion {...base} procesando />)
    const botones = screen.getAllByRole("button")
    botones.forEach((btn) => expect(btn).toBeDisabled())
  })
})
