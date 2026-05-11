import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ModalCheckout } from "@/components/ModalCheckout"
import type { ItemCarrito } from "@/lib/tipos"

const items: ItemCarrito[] = [
  { flor: { id: 1, nombre: "Rosa", color: "Rojo", ocasion: "amor", precio: 10, descripcion: "", imagen: "", disponible: true, creado_en: "" }, cantidad: 1 },
]

function renderModal(overrides = {}) {
  return render(
    <ModalCheckout
      items={items}
      total={10}
      alCerrar={vi.fn()}
      alConfirmar={vi.fn()}
      {...overrides}
    />
  )
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }))
}

describe("ModalCheckout", () => {
  it.each([
    { desc: "email válido",               email: "ana@example.com"     },
    { desc: "email con espacios (trim)",  email: "  ana@example.com  " },
  ])("acepta $desc y no muestra error", ({ email }) => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText("Tu nombre"),             { target: { value: "Ana López" } })
    fireEvent.change(screen.getByPlaceholderText("tu@email.com"),          { target: { value: email } })
    fireEvent.change(screen.getByPlaceholderText("Calle, número, ciudad"), { target: { value: "Calle 1" } })
    submitForm()
    expect(screen.queryByText("Email inválido")).toBeNull()
  })

  it("rechaza email sin dominio", () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText("Tu nombre"), { target: { value: "Ana López" } })
    fireEvent.change(screen.getByPlaceholderText("tu@email.com"), { target: { value: "nodominio@" } })
    fireEvent.change(screen.getByPlaceholderText("Calle, número, ciudad"), { target: { value: "Calle 1" } })
    submitForm()
    expect(screen.getByText("Email inválido")).toBeInTheDocument()
  })

  it("captura autofill via onInput en el campo email", () => {
    renderModal()
    const emailInput = screen.getByPlaceholderText("tu@email.com")
    fireEvent.input(emailInput, { target: { value: "autofill@example.com" } })
    expect((emailInput as HTMLInputElement).value).toBe("autofill@example.com")
  })

  it("inputs tienen atributos name y autoComplete correctos", () => {
    renderModal()
    expect(screen.getByPlaceholderText("Tu nombre")).toHaveAttribute("name", "name")
    expect(screen.getByPlaceholderText("Tu nombre")).toHaveAttribute("autoComplete", "name")
    expect(screen.getByPlaceholderText("tu@email.com")).toHaveAttribute("name", "email")
    expect(screen.getByPlaceholderText("tu@email.com")).toHaveAttribute("autoComplete", "email")
    expect(screen.getByPlaceholderText("Calle, número, ciudad")).toHaveAttribute("name", "street-address")
    expect(screen.getByPlaceholderText("Calle, número, ciudad")).toHaveAttribute("autoComplete", "street-address")
  })
})
