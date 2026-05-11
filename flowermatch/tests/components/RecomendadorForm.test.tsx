import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecomendadorForm } from "@/components/RecomendadorForm"

vi.mock("@/lib/api", () => ({
  obtenerRecomendaciones: vi.fn(),
}))

import { obtenerRecomendaciones } from "@/lib/api"
const mockRecomendar = vi.mocked(obtenerRecomendaciones)

const respuestaMock = {
  intencion: "romance",
  flores: [
    {
      id: 1, nombre: "Rosa Roja", color: "Rojo", ocasion: "romance,amor",
      precio: 25, descripcion: "La reina.", imagen: "", disponible: true, creado_en: "2024-01-01",
    },
  ],
  mensaje: "Para expresar amor romántico, te recomendamos:",
  consulta_original: "quiero flores para mi novia",
  modo: "local" as const,
}

const respuestaLutoMock = {
  intencion: "luto",
  contexto: "amistad",
  flores: [
    {
      id: 3, nombre: "Lirio Blanco", color: "Blanco", ocasion: "luto,condolencias",
      precio: 18, descripcion: "Símbolo de paz.", imagen: "", disponible: true, creado_en: "2024-01-01",
    },
  ],
  mensaje: "Para expresar tus condolencias a un amigo, te recomendamos:",
  consulta_original: "condolencias para mi amiga",
  modo: "local" as const,
}

const respuestaDisculpaMock = {
  intencion: "disculpa",
  contexto: "amistad",
  flores: [
    {
      id: 7, nombre: "Clavel Rosado", color: "Rosado", ocasion: "disculpa,amor",
      precio: 12, descripcion: "Flor de la gratitud.", imagen: "", disponible: true, creado_en: "2024-01-01",
    },
  ],
  mensaje: "Para pedir perdón a un amigo, te recomendamos:",
  consulta_original: "Necesito un regalo para pedir perdón a mi mejor amigo",
  modo: "local" as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("RecomendadorForm", () => {
  it("renderiza el textarea y el botón de búsqueda", () => {
    render(<RecomendadorForm />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /encontrar flores/i })).toBeInTheDocument()
  })

  it("el botón está deshabilitado con textarea vacío", () => {
    render(<RecomendadorForm />)
    expect(screen.getByRole("button", { name: /encontrar flores/i })).toBeDisabled()
  })

  it("el botón se habilita al escribir en el textarea", () => {
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "quiero flores" } })
    expect(screen.getByRole("button", { name: /encontrar flores/i })).not.toBeDisabled()
  })

  it("el botón permanece deshabilitado con solo espacios en el textarea", () => {
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } })
    expect(screen.getByRole("button", { name: /encontrar flores/i })).toBeDisabled()
  })

  it("llama a obtenerRecomendaciones y muestra resultados", async () => {
    mockRecomendar.mockResolvedValue(respuestaMock)
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "quiero flores para mi novia" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Rosa Roja")).toBeInTheDocument()
    })
    expect(mockRecomendar).toHaveBeenCalledWith("quiero flores para mi novia")
  })

  it("muestra la intención detectada tras recibir respuesta", async () => {
    mockRecomendar.mockResolvedValue(respuestaMock)
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores románticas" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Amor romántico")).toBeInTheDocument()
    })
  })

  it("muestra sugerencias cuando no hay resultado", () => {
    render(<RecomendadorForm />)
    expect(screen.getByText(/pedir perd/i)).toBeInTheDocument()
  })

  it("al hacer click en sugerencia llama a obtenerRecomendaciones con ese texto", async () => {
    mockRecomendar.mockResolvedValue(respuestaMock)
    render(<RecomendadorForm />)
    const sugerencia = screen.getByText(/pedir perd/i)
    fireEvent.click(sugerencia)
    await waitFor(() => {
      expect(mockRecomendar).toHaveBeenCalledWith(
        "Necesito un regalo para pedir perdón a mi mejor amigo"
      )
    })
  })

  it("muestra intención Disculpa y contexto Amistad cuando la respuesta los contiene", async () => {
    mockRecomendar.mockResolvedValue(respuestaDisculpaMock)
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Necesito un regalo para pedir perdón a mi mejor amigo" },
    })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Disculpa")).toBeInTheDocument()
      expect(screen.getByText("Amistad")).toBeInTheDocument()
      expect(screen.getByText("Para pedir perdón a un amigo, te recomendamos:")).toBeInTheDocument()
    })
  })

  it("muestra el badge de modo cuando está presente", async () => {
    mockRecomendar.mockResolvedValue(respuestaMock)
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("fallback navegador")).toBeInTheDocument()
    })
  })

  it("muestra 'Luto / condolencias' y contexto Amistad para luto+amistad", async () => {
    mockRecomendar.mockResolvedValue(respuestaLutoMock)
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "condolencias para mi amiga" },
    })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Luto / condolencias")).toBeInTheDocument()
      expect(screen.getByText("Amistad")).toBeInTheDocument()
    })
  })

  it("no muestra contexto cuando la respuesta no lo incluye", async () => {
    mockRecomendar.mockResolvedValue(respuestaMock)
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores bonitas" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Amor romántico")).toBeInTheDocument()
    })
    expect(screen.queryByText("Contexto")).not.toBeInTheDocument()
  })

  it("muestra aviso ámbar cuando modo es 'local'", async () => {
    mockRecomendar.mockResolvedValue({ ...respuestaMock, modo: "local" })
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText(/El servicio de IA no está disponible/)).toBeInTheDocument()
    })
  })

  it("no muestra aviso ámbar cuando modo es 'python-nlp'", async () => {
    mockRecomendar.mockResolvedValue({ ...respuestaMock, modo: "python-nlp" })
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Rosa Roja")).toBeInTheDocument()
    })
    expect(screen.queryByText(/El servicio de IA no está disponible/)).not.toBeInTheDocument()
  })

  it("muestra aviso 'Servicio temporalmente limitado' cuando degradado=true", async () => {
    mockRecomendar.mockResolvedValue({
      ...respuestaMock,
      flores: [],
      modo: "php-reglas",
      degradado: true,
    })
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText(/Servicio temporalmente limitado/)).toBeInTheDocument()
    })
  })

  it("no muestra aviso 'Servicio temporalmente limitado' cuando degradado ausente", async () => {
    mockRecomendar.mockResolvedValue({ ...respuestaMock, modo: "php-reglas" })
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText("Rosa Roja")).toBeInTheDocument()
    })
    expect(screen.queryByText(/Servicio temporalmente limitado/)).not.toBeInTheDocument()
  })

  it("muestra mensaje de error cuando obtenerRecomendaciones lanza excepción", async () => {
    mockRecomendar.mockRejectedValue(new Error("datos corruptos"))
    render(<RecomendadorForm />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "flores" } })
    fireEvent.click(screen.getByRole("button", { name: /encontrar flores/i }))
    await waitFor(() => {
      expect(screen.getByText(/Ocurrió un error al obtener recomendaciones/)).toBeInTheDocument()
    })
  })
})
