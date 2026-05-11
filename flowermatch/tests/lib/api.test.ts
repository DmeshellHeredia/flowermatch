import { describe, it, expect, vi, beforeEach } from "vitest"
import { ocultarFlor, eliminarFlorDefinitiva, obtenerFlores, iniciarSesion, FLORES_ESTATICAS, obtenerRecomendaciones, crearFlor, actualizarFlor } from "@/lib/api"

const mockFetch = vi.mocked(global.fetch)

const FLOR_OCULTA = {
  id: 2, nombre: "Girasol", color: "Amarillo", ocasion: "amistad",
  precio: 15, descripcion: "", imagen: null, disponible: 0, creado_en: "2024-01-01",
}

function respuestaOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response)
}

function respuestaError(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

const FLOR_RAW = {
  id: 1, nombre: "Rosa Roja", color: "Rojo", ocasion: "romance",
  precio: "25.00", descripcion: "", imagen: null, disponible: 1, creado_en: "2024-01-01",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ocultarFlor", () => {
  it("llama PUT /api/flores.php?id=X con disponible:0 y Bearer token", async () => {
    mockFetch.mockReturnValue(respuestaOk(FLOR_OCULTA))
    await ocultarFlor(2, "mi-token")

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/api/flores.php?id=2")
    expect(opts.method).toBe("PUT")
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer mi-token")
    const body = JSON.parse(opts.body as string)
    expect(body.disponible).toBe(0)
  })

  it("lanza UNAUTHORIZED en 401", async () => {
    mockFetch.mockReturnValue(respuestaError(401, { error: "No autorizado" }))
    await expect(ocultarFlor(2, "token")).rejects.toThrow("UNAUTHORIZED")
  })

  it("lanza el mensaje de error del backend en 404", async () => {
    mockFetch.mockReturnValue(respuestaError(404, { error: "Flor no encontrada" }))
    await expect(ocultarFlor(99, "token")).rejects.toThrow("Flor no encontrada")
  })
})

describe("eliminarFlorDefinitiva", () => {
  it("llama DELETE /api/admin/flores.php?id=X con Bearer token", async () => {
    mockFetch.mockReturnValue(respuestaOk({ mensaje: "Flor eliminada definitivamente" }))
    await eliminarFlorDefinitiva(2, "mi-token")

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/api/admin/flores.php?id=2")
    expect(opts.method).toBe("DELETE")
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer mi-token")
  })

  it("NO llama /api/flores.php (no es soft delete)", async () => {
    mockFetch.mockReturnValue(respuestaOk({ mensaje: "Flor eliminada definitivamente" }))
    await eliminarFlorDefinitiva(2, "mi-token")

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).not.toMatch(/\/api\/flores\.php/)
  })

  it("lanza UNAUTHORIZED en 401", async () => {
    mockFetch.mockReturnValue(respuestaError(401, { error: "No autorizado" }))
    await expect(eliminarFlorDefinitiva(2, "token")).rejects.toThrow("UNAUTHORIZED")
  })

  it("lanza el mensaje de error del backend en 404", async () => {
    mockFetch.mockReturnValue(respuestaError(404, { error: "Flor no encontrada" }))
    await expect(eliminarFlorDefinitiva(99, "token")).rejects.toThrow("Flor no encontrada")
  })

  it("resuelve sin valor (void) en éxito", async () => {
    mockFetch.mockReturnValue(respuestaOk({ mensaje: "Flor eliminada definitivamente" }))
    const resultado = await eliminarFlorDefinitiva(2, "token")
    expect(resultado).toBeUndefined()
  })
})

describe("iniciarSesion", () => {
  it("login JWT exitoso devuelve modo jwt y csrf_token", async () => {
    mockFetch.mockReturnValue(respuestaOk({ modo: "jwt", csrf_token: "abc" }))
    const resultado = await iniciarSesion("admin", "pass")
    expect(resultado.modo).toBe("jwt")
    expect(resultado.csrf_token).toBe("abc")
    expect(resultado.token).toBeUndefined()
  })

  it("login token dev exitoso devuelve modo token y token", async () => {
    mockFetch.mockReturnValue(respuestaOk({ modo: "token", token: "dev-token" }))
    const resultado = await iniciarSesion("admin", "pass")
    expect(resultado.modo).toBe("token")
    expect(resultado.token).toBe("dev-token")
  })

  it("lanza el mensaje del backend en 401", async () => {
    mockFetch.mockReturnValue(respuestaError(401, { error: "Credenciales incorrectas" }))
    await expect(iniciarSesion("admin", "mal")).rejects.toThrow("Credenciales incorrectas")
  })

  it("lanza 'Credenciales incorrectas' si el body de error no tiene campo error", async () => {
    mockFetch.mockReturnValue(respuestaError(401, {}))
    await expect(iniciarSesion("admin", "mal")).rejects.toThrow("Credenciales incorrectas")
  })

  it("envía POST a /api/auth.php con usuario y password", async () => {
    mockFetch.mockReturnValue(respuestaOk({ modo: "jwt", csrf_token: "abc" }))
    await iniciarSesion("admin", "secreto")
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/api/auth.php")
    expect(opts.method).toBe("POST")
    const body = JSON.parse(opts.body as string)
    expect(body.usuario).toBe("admin")
    expect(body.password).toBe("secreto")
  })

  it("JSON inesperado (modo ausente) lanza error", async () => {
    mockFetch.mockReturnValue(respuestaOk({}))
    await expect(iniciarSesion("admin", "pass")).rejects.toThrow("Respuesta de login inesperada")
  })
})

describe("obtenerFlores", () => {
  it("normaliza respuesta paginada { data, total, page, limit, total_pages }", async () => {
    mockFetch.mockReturnValue(respuestaOk({
      data: [FLOR_RAW], total: 1, page: 1, limit: 20, total_pages: 1,
    }))
    const resultado = await obtenerFlores()
    expect(resultado.data).toHaveLength(1)
    expect(resultado.data[0].nombre).toBe("Rosa Roja")
    expect(resultado.data[0].precio).toBe(25)
  })

  it("normaliza respuesta array directo", async () => {
    mockFetch.mockReturnValue(respuestaOk([FLOR_RAW]))
    const resultado = await obtenerFlores()
    expect(resultado.data).toHaveLength(1)
    expect(resultado.data[0].nombre).toBe("Rosa Roja")
  })

  it("backend OK → fuente 'api'", async () => {
    mockFetch.mockReturnValue(respuestaOk([FLOR_RAW]))
    const resultado = await obtenerFlores()
    expect(resultado.fuente).toBe("api")
  })

  it("usa fallback local si fetch falla con usarFallback=true (default)", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    const resultado = await obtenerFlores()
    expect(resultado.data.length).toBeGreaterThan(0)
    expect(resultado.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ nombre: expect.any(String) }),
    ]))
  })

  it("fallback → fuente 'estatica'", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    const resultado = await obtenerFlores()
    expect(resultado.fuente).toBe("estatica")
  })

  it("el fallback local devuelve flores de FLORES_ESTATICAS", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    const resultado = await obtenerFlores()
    expect(resultado.data.length).toBe(FLORES_ESTATICAS.length)
  })

  it("lanza el mensaje del backend con usarFallback=false y body { error }", async () => {
    mockFetch.mockReturnValue(respuestaError(400, { error: "busqueda muy larga" }))
    await expect(obtenerFlores({}, { usarFallback: false })).rejects.toThrow("busqueda muy larga")
  })

  it("lanza 'HTTP 500' con usarFallback=false y body sin campo error", async () => {
    mockFetch.mockReturnValue(respuestaError(500, {}))
    await expect(obtenerFlores({}, { usarFallback: false })).rejects.toThrow("HTTP 500")
  })

  it("lanza si fetch rechaza con usarFallback=false", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    await expect(obtenerFlores({}, { usarFallback: false })).rejects.toThrow("Network Error")
  })
})

describe("recomendarLocalmente — modo local (via obtenerRecomendaciones con fetch fallido)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("devuelve modo 'local' cuando el backend no responde", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    const resultado = await obtenerRecomendaciones("flores para amor")
    expect(resultado.modo).toBe("local")
    expect(resultado.consulta_original).toBe("flores para amor")
  })

  it("flores locales tienen nombre string y precio number", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    const resultado = await obtenerRecomendaciones("aniversario de boda")
    expect(Array.isArray(resultado.flores)).toBe(true)
    for (const f of resultado.flores) {
      expect(typeof f.nombre).toBe("string")
      expect(typeof f.precio).toBe("number")
    }
  })

  it("no emite console.warn con datos válidos", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockRejectedValue(new Error("Network Error"))
    await obtenerRecomendaciones("flores para mi amiga")
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("devuelve intencion y mensaje no vacíos", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    const resultado = await obtenerRecomendaciones("quiero pedir perdón")
    expect(resultado.intencion).not.toBe("")
    expect(resultado.mensaje).not.toBe("")
  })
})

describe("normalizarFlores — validación runtime", () => {
  it("descarta flores con nombre vacío y emite console.warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockReturnValue(respuestaOk([{ ...FLOR_RAW, nombre: "" }]))
    const { data } = await obtenerFlores({}, { usarFallback: false })
    expect(data).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[api]"), expect.anything())
    warn.mockRestore()
  })

  it("descarta flores con precio 0 y emite console.warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockReturnValue(respuestaOk([{ ...FLOR_RAW, precio: 0 }]))
    const { data } = await obtenerFlores({}, { usarFallback: false })
    expect(data).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[api]"), expect.anything())
    warn.mockRestore()
  })

  it("descarta flores con precio negativo y emite console.warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockReturnValue(respuestaOk([{ ...FLOR_RAW, precio: -5 }]))
    const { data } = await obtenerFlores({}, { usarFallback: false })
    expect(data).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("descarta flores con precio NaN (string no numérico) y emite console.warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockReturnValue(respuestaOk([{ ...FLOR_RAW, precio: "no-es-numero" }]))
    const { data } = await obtenerFlores({}, { usarFallback: false })
    expect(data).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("conserva flores válidas sin emitir warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockReturnValue(respuestaOk([FLOR_RAW]))
    const { data } = await obtenerFlores({}, { usarFallback: false })
    expect(data).toHaveLength(1)
    expect(data[0].nombre).toBe("Rosa Roja")
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it("descarta solo las inválidas en lista mixta y avisa una vez por descarte", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mockFetch.mockReturnValue(respuestaOk([
      FLOR_RAW,
      { ...FLOR_RAW, id: 2, nombre: "" },
      { ...FLOR_RAW, id: 3, nombre: "Tulipán", precio: 0 },
    ]))
    const { data } = await obtenerFlores({}, { usarFallback: false })
    expect(data).toHaveLength(1)
    expect(data[0].nombre).toBe("Rosa Roja")
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})

const FLOR_NUEVA = {
  nombre: "Orquídea Azul", color: "Azul" as const, ocasion: "general",
  precio: 30, descripcion: "", imagen: "", disponible: true,
}

describe("crearFlor / actualizarFlor — nombre duplicado (409)", () => {
  it("crearFlor lanza el mensaje del backend en 409", async () => {
    mockFetch.mockReturnValue(respuestaError(409, { error: "Ya existe una flor con ese nombre" }))
    await expect(crearFlor(FLOR_NUEVA, "token")).rejects.toThrow("Ya existe una flor con ese nombre")
  })

  it("actualizarFlor lanza el mensaje del backend en 409", async () => {
    mockFetch.mockReturnValue(respuestaError(409, { error: "Ya existe una flor con ese nombre" }))
    await expect(actualizarFlor(1, { nombre: "Rosa Roja" }, "token")).rejects.toThrow("Ya existe una flor con ese nombre")
  })

  it("crearFlor lanza UNAUTHORIZED en 401", async () => {
    mockFetch.mockReturnValue(respuestaError(401, { error: "No autorizado" }))
    await expect(crearFlor(FLOR_NUEVA, "token")).rejects.toThrow("UNAUTHORIZED")
  })

  it("actualizarFlor lanza UNAUTHORIZED en 401", async () => {
    mockFetch.mockReturnValue(respuestaError(401, { error: "No autorizado" }))
    await expect(actualizarFlor(1, { nombre: "Rosa Roja" }, "token")).rejects.toThrow("UNAUTHORIZED")
  })

  it("crearFlor devuelve la flor normalizada en éxito", async () => {
    mockFetch.mockReturnValue(respuestaOk({ ...FLOR_RAW, nombre: "Orquídea Azul" }))
    const flor = await crearFlor(FLOR_NUEVA, "token")
    expect(flor.nombre).toBe("Orquídea Azul")
    expect(typeof flor.precio).toBe("number")
  })
})
