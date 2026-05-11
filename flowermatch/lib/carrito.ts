// Gestión de carrito con localStorage - FlowerMatch

import type { Flor, ItemCarrito } from "./tipos"

const CLAVE  = "flowermatch_carrito"
export const EVENTO_CARRITO = "flowermatch:carrito"

function leer(): ItemCarrito[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as ItemCarrito[]
  } catch {
    return []
  }
}

function escribir(items: ItemCarrito[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(items))
  window.dispatchEvent(new Event(EVENTO_CARRITO))
}

export function obtenerCarrito(): ItemCarrito[] {
  return leer()
}

export function agregarAlCarrito(flor: Flor): void {
  const items = leer()
  const idx   = items.findIndex((i) => i.flor.id === flor.id)
  if (idx >= 0) items[idx].cantidad++
  else          items.push({ flor, cantidad: 1 })
  escribir(items)
}

export function cambiarCantidad(id: number, delta: number): void {
  const items = leer()
  const idx   = items.findIndex((i) => i.flor.id === id)
  if (idx < 0) return
  items[idx].cantidad += delta
  if (items[idx].cantidad <= 0) items.splice(idx, 1)
  escribir(items)
}

export function quitarDelCarrito(id: number): void {
  escribir(leer().filter((i) => i.flor.id !== id))
}

export function vaciarCarrito(): void {
  escribir([])
}

export function contarItems(): number {
  return leer().reduce((s, i) => s + i.cantidad, 0)
}

export function calcularTotal(): number {
  return leer().reduce((s, i) => s + i.flor.precio * i.cantidad, 0)
}
