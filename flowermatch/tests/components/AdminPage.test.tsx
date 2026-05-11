import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import PaginaAdmin from "@/app/admin/page"
import * as api from "@/lib/api"

vi.mock("@/lib/api", () => ({
  obtenerFloresAdmin:     vi.fn(),
  obtenerFlores:          vi.fn(),
  ocultarFlor:            vi.fn(),
  eliminarFlorDefinitiva: vi.fn(),
  actualizarFlor:         vi.fn(),
  crearFlor:              vi.fn(),
  iniciarSesion:          vi.fn(),
  cerrarSesionApi:        vi.fn(),
}))

const FLOR_DISPONIBLE = {
  id: 1, nombre: "Rosa Roja", color: "Rojo", ocasion: "amor",
  precio: 25, descripcion: "", imagen: null, disponible: true, creado_en: "2024-01-01",
}

const FLOR_OCULTA = {
  id: 2, nombre: "Girasol", color: "Amarillo", ocasion: "amistad",
  precio: 15, descripcion: "", imagen: null, disponible: false, creado_en: "2024-01-01",
}

beforeEach(() => {
  localStorage.setItem("fm_token", "test-token")
  vi.mocked(api.obtenerFloresAdmin).mockResolvedValue([FLOR_DISPONIBLE])
  vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [], fuente: "api" })
  vi.mocked(api.ocultarFlor).mockResolvedValue({ ...FLOR_DISPONIBLE, disponible: false })
  vi.mocked(api.eliminarFlorDefinitiva).mockResolvedValue(undefined)
  vi.mocked(api.actualizarFlor).mockResolvedValue(FLOR_DISPONIBLE)
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

async function renderConFlores(flores = [FLOR_DISPONIBLE]) {
  vi.mocked(api.obtenerFloresAdmin).mockResolvedValue(flores)
  render(<PaginaAdmin />)
  return screen.findByText(flores[0].nombre)
}

describe("PaginaAdmin — columna Estado y Modo local", () => {
  it("renderiza el encabezado de columna Estado", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    expect(screen.getByRole("columnheader", { name: /estado/i })).toBeInTheDocument()
  })

  it("flor disponible muestra badge Disponible en columna Estado", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    expect(screen.getByText("Disponible")).toBeInTheDocument()
  })

  it("flor oculta muestra badge Oculta en columna Estado", async () => {
    await renderConFlores([FLOR_OCULTA])
    expect(screen.getByText("Oculta")).toBeInTheDocument()
  })

  it("tabla con disponible y oculta muestra ambos badges a la vez", async () => {
    await renderConFlores([FLOR_DISPONIBLE, FLOR_OCULTA])
    expect(screen.getByText("Disponible")).toBeInTheDocument()
    expect(screen.getByText("Oculta")).toBeInTheDocument()
  })

  it("flor disponible muestra Ocultar; flor oculta muestra Eliminar definitivamente", async () => {
    await renderConFlores([FLOR_DISPONIBLE, FLOR_OCULTA])
    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeInTheDocument()
  })

  it("aviso Modo local aparece cuando el backend no responde", async () => {
    vi.mocked(api.obtenerFloresAdmin).mockRejectedValue(new Error("Network Error"))
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_DISPONIBLE], fuente: "api" })
    render(<PaginaAdmin />)
    await screen.findByText("Rosa Roja")
    expect(screen.getByText(/Modo local/)).toBeInTheDocument()
    expect(screen.getByText(/datos.*respaldo/i)).toBeInTheDocument()
    expect(screen.getByText(/no se puede ocultar/i)).toBeInTheDocument()
  })

  it("muestra el mensaje de error específico del backend al fallar la carga", async () => {
    vi.mocked(api.obtenerFloresAdmin).mockRejectedValue(new Error("Error de conexión a la base de datos"))
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_DISPONIBLE], fuente: "api" })
    render(<PaginaAdmin />)
    await screen.findByText("Rosa Roja")
    expect(screen.getByText(/Error de conexión a la base de datos/)).toBeInTheDocument()
  })

  it("muestra 'Backend no disponible.' si el error no es una instancia de Error", async () => {
    vi.mocked(api.obtenerFloresAdmin).mockRejectedValue("fallo inesperado")
    vi.mocked(api.obtenerFlores).mockResolvedValue({ data: [FLOR_DISPONIBLE], fuente: "api" })
    render(<PaginaAdmin />)
    await screen.findByText("Rosa Roja")
    expect(screen.getByText(/Backend no disponible\./)).toBeInTheDocument()
  })
})

describe("PaginaAdmin — acciones separadas", () => {
  it("flor disponible muestra botón Ocultar y no Eliminar definitivamente", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Eliminar definitivamente" })).toBeNull()
  })

  it("flor oculta muestra botón Eliminar definitivamente y no Ocultar", async () => {
    await renderConFlores([FLOR_OCULTA])
    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ocultar" })).toBeNull()
  })

  it("flor disponible muestra badge Disponible", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    expect(screen.getByText("Disponible")).toBeInTheDocument()
  })

  it("flor oculta muestra badge Oculta", async () => {
    await renderConFlores([FLOR_OCULTA])
    expect(screen.getByText("Oculta")).toBeInTheDocument()
  })

  it("window.confirm no se llama al ocultar", async () => {
    const spy = vi.spyOn(window, "confirm")
    await renderConFlores([FLOR_DISPONIBLE])
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }))
    expect(spy).not.toHaveBeenCalled()
  })

  it("window.confirm no se llama al eliminar definitivamente", async () => {
    const spy = vi.spyOn(window, "confirm")
    await renderConFlores([FLOR_OCULTA])
    fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }))
    expect(spy).not.toHaveBeenCalled()
  })

  it("click Ocultar abre modal con texto de ocultar", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/dejará de aparecer en el catálogo público/)).toBeInTheDocument()
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Ocultar flor" })).toBeInTheDocument()
  })

  it("click Eliminar definitivamente abre modal con texto de eliminar", async () => {
    await renderConFlores([FLOR_OCULTA])
    fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/borrará "Girasol"/)).toBeInTheDocument()
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar definitivamente" })).toBeInTheDocument()
  })

  it("Cancelar cierra el modal", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("Escape cierra el modal", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }))
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("al ocultar, la flor sigue en tabla con estado Oculta", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Ocultar flor" }))

    expect(api.ocultarFlor).toHaveBeenCalledWith(1, "test-token")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    expect(screen.getByText("Rosa Roja")).toBeInTheDocument()
    expect(screen.getByText("Oculta")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ocultar" })).toBeNull()
    expect(screen.getByRole("button", { name: "Eliminar definitivamente" })).toBeInTheDocument()
  })

  it("al eliminar definitivamente, la flor desaparece de la tabla", async () => {
    await renderConFlores([FLOR_OCULTA])
    fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar definitivamente" }))

    expect(api.eliminarFlorDefinitiva).toHaveBeenCalledWith(2, "test-token")
    await waitFor(() => expect(screen.queryByText("Girasol")).toBeNull())
    expect(screen.getByText(/Flor eliminada definitivamente/)).toBeInTheDocument()
  })

  it("cancelar no llama a la API", async () => {
    await renderConFlores([FLOR_DISPONIBLE])
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(api.ocultarFlor).not.toHaveBeenCalled()
    expect(api.eliminarFlorDefinitiva).not.toHaveBeenCalled()
  })
})

describe("PaginaAdmin — sesión expirada", () => {
  it("UNAUTHORIZED en carga muestra formulario de login con mensaje de sesión expirada", async () => {
    vi.mocked(api.obtenerFloresAdmin).mockRejectedValue(new Error("UNAUTHORIZED"))
    vi.mocked(api.cerrarSesionApi).mockResolvedValue(undefined)

    render(<PaginaAdmin />)

    await screen.findByRole("heading", { name: /iniciar sesión/i })
    expect(screen.getByText(/sesión expirada/i)).toBeInTheDocument()
    expect(localStorage.getItem("fm_token")).toBeNull()
  })
})

describe("PaginaAdmin — sesión JWT expirada (cookie fm_csrf, sin fm_token)", () => {
  afterEach(() => {
    document.cookie = "fm_csrf=; max-age=0"
  })

  it("cookie fm_csrf detectada → UNAUTHORIZED → login con mensaje de sesión expirada", async () => {
    localStorage.clear()
    document.cookie = "fm_csrf=test-csrf-token"

    vi.mocked(api.obtenerFloresAdmin).mockRejectedValue(new Error("UNAUTHORIZED"))
    vi.mocked(api.cerrarSesionApi).mockResolvedValue(undefined)

    render(<PaginaAdmin />)

    await screen.findByRole("heading", { name: /iniciar sesión/i })
    expect(screen.getByText(/sesión expirada/i)).toBeInTheDocument()
    expect(localStorage.getItem("fm_token")).toBeNull()
  })

  it("obtenerFloresAdmin se llama sin token (null) en modo JWT", async () => {
    localStorage.clear()
    document.cookie = "fm_csrf=test-csrf-token"

    vi.mocked(api.obtenerFloresAdmin).mockRejectedValue(new Error("UNAUTHORIZED"))
    vi.mocked(api.cerrarSesionApi).mockResolvedValue(undefined)

    render(<PaginaAdmin />)

    await screen.findByRole("heading", { name: /iniciar sesión/i })
    expect(api.obtenerFloresAdmin).toHaveBeenCalledWith(null)
  })
})

describe("PaginaAdmin — validación imagen en formulario", () => {
  it("imagen con javascript: muestra error inline y no llama a la API", async () => {
    vi.mocked(api.crearFlor).mockResolvedValue({ ...FLOR_DISPONIBLE, id: 99 })
    await renderConFlores([FLOR_DISPONIBLE])

    fireEvent.click(screen.getByRole("button", { name: /\+ nueva flor/i }))

    fireEvent.change(screen.getByPlaceholderText("Ej: Rosa Roja"), { target: { value: "Tulipán" } })
    fireEvent.change(screen.getByPlaceholderText("romance,amor,aniversario"), { target: { value: "amor" } })
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "10" } })
    fireEvent.change(screen.getByPlaceholderText("/imagenes/flores/mi-flor.jpg"), {
      target: { value: "javascript:alert(1)" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    expect(await screen.findByText("URL de imagen no permitida.")).toBeInTheDocument()
    expect(api.crearFlor).not.toHaveBeenCalled()
  })

  it("imagen con .. muestra error inline y no llama a la API", async () => {
    await renderConFlores([FLOR_DISPONIBLE])

    fireEvent.click(screen.getByRole("button", { name: /\+ nueva flor/i }))

    fireEvent.change(screen.getByPlaceholderText("Ej: Rosa Roja"), { target: { value: "Tulipán" } })
    fireEvent.change(screen.getByPlaceholderText("romance,amor,aniversario"), { target: { value: "amor" } })
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "10" } })
    fireEvent.change(screen.getByPlaceholderText("/imagenes/flores/mi-flor.jpg"), {
      target: { value: "../../../etc/passwd" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    expect(await screen.findByText("URL de imagen no permitida.")).toBeInTheDocument()
    expect(api.crearFlor).not.toHaveBeenCalled()
  })

  it("el error de imagen desaparece al corregir el campo", async () => {
    await renderConFlores([FLOR_DISPONIBLE])

    fireEvent.click(screen.getByRole("button", { name: /\+ nueva flor/i }))

    const inputImagen = screen.getByPlaceholderText("/imagenes/flores/mi-flor.jpg")
    fireEvent.change(screen.getByPlaceholderText("Ej: Rosa Roja"), { target: { value: "Tulipán" } })
    fireEvent.change(screen.getByPlaceholderText("romance,amor,aniversario"), { target: { value: "amor" } })
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "10" } })
    fireEvent.change(inputImagen, { target: { value: "javascript:alert(1)" } })
    fireEvent.click(screen.getByRole("button", { name: "Crear" }))

    await screen.findByText("URL de imagen no permitida.")

    fireEvent.change(inputImagen, { target: { value: "/imagenes/flores/tulipan.jpg" } })
    expect(screen.queryByText("URL de imagen no permitida.")).toBeNull()
  })
})
