"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { obtenerCarrito, EVENTO_CARRITO } from "@/lib/carrito"

const enlaces = [
  { href: "/", etiqueta: "Catálogo" },
  { href: "/recomendaciones", etiqueta: "Recomendador" },
  { href: "/admin", etiqueta: "Administrar" },
]

export function NavBar() {
  const ruta = usePathname()
  const { theme, setTheme } = useTheme()
  const [montado, setMontado] = useState(false)
  const [conteoCarrito, setConteoCarrito] = useState(0)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    setMontado(true)
    const actualizar = () =>
      setConteoCarrito(obtenerCarrito().reduce((s, i) => s + i.cantidad, 0))
    actualizar()
    window.addEventListener(EVENTO_CARRITO, actualizar)
    return () => window.removeEventListener(EVENTO_CARRITO, actualizar)
  }, [])

  const alternarTema = () => setTheme(theme === "dark" ? "light" : "dark")

  const claseEnlace = (href: string) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      ruta === href
        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-2xl">🌸</span>
          <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            FlowerMatch
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {enlaces.map(({ href, etiqueta }) => (
            <Link key={href} href={href} className={claseEnlace(href)}>
              {etiqueta}
            </Link>
          ))}

          <Link
            href="/carrito"
            className={`relative ml-1 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              ruta === "/carrito" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : ""
            }`}
            aria-label="Ver carrito"
          >
            🛒
            {conteoCarrito > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {conteoCarrito > 9 ? "9+" : conteoCarrito}
              </span>
            )}
          </Link>

          <button
            onClick={alternarTema}
            className="ml-1 rounded-lg border border-border p-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Alternar modo oscuro"
          >
            {montado ? (theme === "dark" ? "☀️" : "🌙") : "🌙"}
          </button>
        </nav>

        {/* Mobile: carrito + tema + hamburguesa */}
        <div className="flex items-center gap-1 sm:hidden">
          <Link
            href="/carrito"
            className={`relative rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              ruta === "/carrito" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : ""
            }`}
            aria-label="Ver carrito"
          >
            🛒
            {conteoCarrito > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {conteoCarrito > 9 ? "9+" : conteoCarrito}
              </span>
            )}
          </Link>

          <button
            onClick={alternarTema}
            className="rounded-lg border border-border p-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Alternar modo oscuro"
          >
            {montado ? (theme === "dark" ? "☀️" : "🌙") : "🌙"}
          </button>

          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Dropdown mobile */}
      {menuAbierto && (
        <nav className="border-t border-border/60 bg-background/95 px-4 py-2 sm:hidden">
          {enlaces.map(({ href, etiqueta }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuAbierto(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                ruta === href
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
