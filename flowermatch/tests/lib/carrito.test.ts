import { describe, it, expect, beforeEach } from "vitest"
import {
  obtenerCarrito, agregarAlCarrito, cambiarCantidad,
  quitarDelCarrito, vaciarCarrito, contarItems, calcularTotal,
} from "@/lib/carrito"
import type { Flor } from "@/lib/tipos"

const rosa: Flor = {
  id: 1, nombre: "Rosa Roja", color: "Rojo", ocasion: "romance",
  precio: 25, descripcion: "", imagen: "", disponible: true, creado_en: "2024-01-01",
}
const girasol: Flor = {
  id: 2, nombre: "Girasol", color: "Amarillo", ocasion: "amistad",
  precio: 15, descripcion: "", imagen: "", disponible: true, creado_en: "2024-01-01",
}

beforeEach(() => localStorage.clear())

describe("carrito", () => {
  it("empieza vacío", () => {
    expect(obtenerCarrito()).toEqual([])
    expect(contarItems()).toBe(0)
  })

  it("agrega un producto", () => {
    agregarAlCarrito(rosa)
    const items = obtenerCarrito()
    expect(items).toHaveLength(1)
    expect(items[0].flor.id).toBe(1)
    expect(items[0].cantidad).toBe(1)
  })

  it("incrementa cantidad si el mismo producto se agrega dos veces", () => {
    agregarAlCarrito(rosa)
    agregarAlCarrito(rosa)
    const items = obtenerCarrito()
    expect(items).toHaveLength(1)
    expect(items[0].cantidad).toBe(2)
  })

  it("agrega productos distintos por separado", () => {
    agregarAlCarrito(rosa)
    agregarAlCarrito(girasol)
    expect(obtenerCarrito()).toHaveLength(2)
  })

  it("cambiarCantidad +1 incrementa", () => {
    agregarAlCarrito(rosa)
    cambiarCantidad(1, 1)
    expect(obtenerCarrito()[0].cantidad).toBe(2)
  })

  it("cambiarCantidad -1 decrementa", () => {
    agregarAlCarrito(rosa)
    agregarAlCarrito(rosa)
    cambiarCantidad(1, -1)
    expect(obtenerCarrito()[0].cantidad).toBe(1)
  })

  it("cambiarCantidad a 0 elimina el item", () => {
    agregarAlCarrito(rosa)
    cambiarCantidad(1, -1)
    expect(obtenerCarrito()).toHaveLength(0)
  })

  it("quitarDelCarrito elimina solo ese producto", () => {
    agregarAlCarrito(rosa)
    agregarAlCarrito(girasol)
    quitarDelCarrito(1)
    const items = obtenerCarrito()
    expect(items).toHaveLength(1)
    expect(items[0].flor.id).toBe(2)
  })

  it("vaciarCarrito deja el carrito vacío", () => {
    agregarAlCarrito(rosa)
    agregarAlCarrito(girasol)
    vaciarCarrito()
    expect(obtenerCarrito()).toHaveLength(0)
  })

  it("contarItems suma todas las cantidades", () => {
    agregarAlCarrito(rosa)
    agregarAlCarrito(rosa)
    agregarAlCarrito(girasol)
    expect(contarItems()).toBe(3)
  })

  it("calcularTotal multiplica precio × cantidad", () => {
    agregarAlCarrito(rosa)    // 25
    agregarAlCarrito(rosa)    // 25
    agregarAlCarrito(girasol) // 15
    expect(calcularTotal()).toBe(65)
  })
})
