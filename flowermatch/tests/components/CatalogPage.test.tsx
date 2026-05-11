import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import PaginaCatalogo from "@/app/page"
import * as api from "@/lib/api"

vi.mock("@/lib/api", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/api")>()
  return { ...real, obtenerFlores: vi.fn() }
})

const FLOR_BACKEND = {
  id: 99, nombre: "Orquídea Backend", color: "Morado", ocasion: "lujo",
  precio: 45, descripcion: "", imagen: null, disponible: true, creado_en: "2024-01-01",
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

const FLOR_ESTATICA = {
  id: 1, nombre: "Rosa Roja", color: "Rojo", ocasion: "romance",
  precio: 25, descripcion: "", imagen: null, disponible: true, creado_en: "2024-01-01",
}

describe("PaginaCatalogo — manejo de errores y fallback", () => {
  it("muestra flores del backend cuando obtenerFlores resuelve", async () => {
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_BACKEND], fuente: "api" })
    render(<PaginaCatalogo />)
    await screen.findByText("Orquídea Backend")
    expect(screen.queryByText(/Modo local/)).not.toBeInTheDocument()
  })

  it("no muestra banner ámbar cuando fuente es 'api'", async () => {
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_BACKEND], fuente: "api" })
    render(<PaginaCatalogo />)
    await screen.findByText("Orquídea Backend")
    expect(screen.queryByText(/catálogo local temporal/)).not.toBeInTheDocument()
  })

  it("muestra banner ámbar 'Modo local' cuando fuente es 'estatica'", async () => {
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_ESTATICA], fuente: "estatica" })
    render(<PaginaCatalogo />)
    await waitFor(() => {
      expect(screen.getByText(/Modo local/)).toBeInTheDocument()
    })
  })

  it("muestra flores del fallback cuando fuente es 'estatica'", async () => {
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_ESTATICA], fuente: "estatica" })
    render(<PaginaCatalogo />)
    await waitFor(() => {
      expect(screen.getByText("Rosa Roja")).toBeInTheDocument()
    })
  })

  it("el banner de fallback dice 'catálogo local temporal'", async () => {
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_ESTATICA], fuente: "estatica" })
    render(<PaginaCatalogo />)
    await waitFor(() => {
      expect(screen.getByText(/catálogo local temporal/)).toBeInTheDocument()
    })
  })
})
