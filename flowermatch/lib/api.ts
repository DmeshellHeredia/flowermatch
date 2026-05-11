import type { Flor, FiltrosFlores, Recomendacion } from "./tipos"
import {
  _PESO_PRIORITARIO,
  FRASES_PRIORITARIAS,
  PALABRAS_CLAVE,
  CONTEXTOS,
  MENSAJES,
  MENSAJES_CONTEXTUALES,
  IDS_POR_INTENCION,
} from "./recomendador-datos"

const URL_API = process.env.NEXT_PUBLIC_URL_API ?? "http://localhost:8080"

export const FLORES_ESTATICAS: Flor[] = [
  {
    id: 1, nombre: "Rosa Roja", color: "Rojo",
    ocasion: "romance,amor,aniversario", precio: 25,
    descripcion: "La reina de las flores, símbolo universal del amor romántico. Sus pétalos aterciopelados y su fragancia inigualable la hacen perfecta para expresar sentimientos profundos.",
    imagen: "/imagenes/flores/Rosa Roja.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 2, nombre: "Girasol", color: "Amarillo",
    ocasion: "amistad,cumpleaños,alegría", precio: 15,
    descripcion: "Flor del sol y la alegría. Su gran tamaño y color vibrante llenan cualquier espacio de positividad. Ideal para celebrar la amistad y los momentos felices.",
    imagen: "/imagenes/flores/Girasol.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 3, nombre: "Tulipán Morado", color: "Morado",
    ocasion: "disculpa,amor,primavera", precio: 20,
    descripcion: "Elegante y sofisticado, el tulipán morado representa la realeza y los sentimientos profundos. Perfecto para pedir perdón con clase.",
    imagen: "/imagenes/flores/Tulipán Morado.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 4, nombre: "Lirio Blanco", color: "Blanco",
    ocasion: "aniversario,boda,pureza", precio: 30,
    descripcion: "Símbolo de pureza y elegancia. El lirio blanco es la elección perfecta para bodas, aniversarios y celebraciones especiales de amor eterno.",
    imagen: "/imagenes/flores/Lirio Blanco.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 5, nombre: "Margarita", color: "Blanco",
    ocasion: "amistad,cumpleaños,alegría", precio: 10,
    descripcion: "Simple y encantadora, la margarita evoca inocencia y alegría. Perfecta para expresar cariño genuino a amigos y seres queridos.",
    imagen: "/imagenes/flores/Margarita.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 6, nombre: "Orquídea Púrpura", color: "Morado",
    ocasion: "aniversario,lujo,admiración", precio: 45,
    descripcion: "La más exótica y sofisticada de las flores. La orquídea representa lujo, admiración y amor maduro. Un regalo verdaderamente especial para ocasiones únicas.",
    imagen: "/imagenes/flores/Orquídea Púrpura.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 7, nombre: "Clavel Rosado", color: "Rosado",
    ocasion: "disculpa,amor,gratitud", precio: 12,
    descripcion: "Flor de la gratitud y el afecto sincero. El clavel rosado es ideal para expresar amor verdadero, pedir disculpas o agradecer de corazón.",
    imagen: "/imagenes/flores/Clavel Rosado.jpeg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 8, nombre: "Amapola Roja", color: "Rojo",
    ocasion: "romance,pasión,recuerdo", precio: 18,
    descripcion: "Símbolo de pasión y recuerdo. La amapola roja transmite emociones intensas y genuinas, perfecta para declaraciones románticas.",
    imagen: "/imagenes/flores/Amapola Roja.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 9, nombre: "Hortensia Azul", color: "Azul",
    ocasion: "aniversario,boda,agradecimiento", precio: 35,
    descripcion: "Con sus flores en forma de bola, la hortensia azul representa gratitud profunda y amor duradero. Perfecta para celebrar años de unión.",
    imagen: "/imagenes/flores/Hortensia Azul.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 10, nombre: "Gerbera Naranja", color: "Naranja",
    ocasion: "amistad,cumpleaños,energía", precio: 14,
    descripcion: "Alegre y llena de vida, la gerbera naranja irradia energía positiva. La elección perfecta para celebraciones y para alegrar el día de alguien especial.",
    imagen: "/imagenes/flores/Gerbera Naranja.jpeg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 11, nombre: "Lavanda", color: "Morado claro",
    ocasion: "relajación,bienestar,serenidad", precio: 22,
    descripcion: "Más que una flor, la lavanda es una experiencia sensorial. Su fragancia calmante y su hermoso color morado la hacen ideal para transmitir serenidad.",
    imagen: "/imagenes/flores/Lavanda.jpg", disponible: true, creado_en: "2024-01-01",
  },
  {
    id: 12, nombre: "Peonía Rosa", color: "Rosado",
    ocasion: "romance,boda,prosperidad", precio: 40,
    descripcion: "Exuberante y romántica, la peonía rosa es símbolo de buena fortuna y amor floreciente. Una de las flores más solicitadas para bodas y celebraciones románticas.",
    imagen: "/imagenes/flores/Peonía Rosa.jpg", disponible: true, creado_en: "2024-01-01",
  },
]

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function aplicarFiltrosLocales(flores: Flor[], filtros?: Partial<FiltrosFlores>): Flor[] {
  if (!filtros) return flores
  let resultado = [...flores]

  if (filtros.busqueda) {
    const t = normalizar(filtros.busqueda)
    resultado = resultado.filter(
      (f) =>
        normalizar(f.nombre).includes(t) ||
        normalizar(f.descripcion).includes(t) ||
        normalizar(f.color).includes(t)
    )
  }
  if (filtros.color) {
    resultado = resultado.filter((f) => f.color === filtros.color)
  }
  if (filtros.ocasion) {
    const o = normalizar(filtros.ocasion)
    resultado = resultado.filter((f) => normalizar(f.ocasion).includes(o))
  }
  if (filtros.precioMin !== undefined) {
    resultado = resultado.filter((f) => f.precio >= filtros.precioMin!)
  }
  if (filtros.precioMax !== undefined) {
    resultado = resultado.filter((f) => f.precio <= filtros.precioMax!)
  }
  switch (filtros.orden) {
    case "precio_asc":  resultado.sort((a, b) => a.precio - b.precio); break
    case "precio_desc": resultado.sort((a, b) => b.precio - a.precio); break
    default:            resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  }
  return resultado
}

// PHP/MySQL puede devolver precio como string y disponible como 0/1 o "0"/"1".
function normalizarFlor(f: unknown): Flor {
  const r = f != null && typeof f === "object" ? (f as Record<string, unknown>) : {}
  return {
    id:          Number(r.id ?? 0),
    nombre:      String(r.nombre ?? ""),
    color:       String(r.color ?? ""),
    ocasion:     String(r.ocasion ?? ""),
    precio:      Number(r.precio ?? 0),
    descripcion: String(r.descripcion ?? ""),
    imagen:      r.imagen != null ? String(r.imagen) : null,
    disponible:  Boolean(Number(r.disponible)),
    creado_en:   String(r.creado_en ?? ""),
  }
}

function validarFlor(f: Flor): boolean {
  if (f.nombre === "" || !(f.precio > 0)) {
    console.warn("[api] flor inválida descartada", { id: f.id, nombre: f.nombre, precio: f.precio })
    return false
  }
  return true
}

function normalizarFlores(raw: unknown): Flor[] {
  const lista = Array.isArray(raw)
    ? raw
    : (raw != null && typeof raw === "object" && "data" in raw)
      ? (raw as { data: unknown }).data
      : null
  if (!Array.isArray(lista)) return []
  return lista.map(normalizarFlor).filter(validarFlor)
}

export interface ResultadoCatalogo {
  data: Flor[]
  fuente: "api" | "estatica"
}

export async function obtenerFlores(
  filtros?: Partial<FiltrosFlores>,
  { usarFallback = true }: { usarFallback?: boolean } = {}
): Promise<ResultadoCatalogo> {
  try {
    const params = new URLSearchParams()
    if (filtros?.busqueda)                    params.set("busqueda",   filtros.busqueda)
    if (filtros?.color)                       params.set("color",      filtros.color)
    if (filtros?.ocasion)                     params.set("ocasion",    filtros.ocasion)
    if (filtros?.precioMin !== undefined)     params.set("precio_min", String(filtros.precioMin))
    if (filtros?.precioMax !== undefined)     params.set("precio_max", String(filtros.precioMax))
    if (filtros?.orden)                       params.set("orden",      filtros.orden)

    const respuesta = await fetch(`${URL_API}/api/flores.php?${params}`, {
      signal: AbortSignal.timeout(5000),
      credentials: "include",
    })
    if (!respuesta.ok) {
      let msg = `HTTP ${respuesta.status}`
      try { const b = await respuesta.json(); if (typeof b?.error === "string") msg = b.error } catch { /* no-op */ }
      throw new Error(msg)
    }
    return { data: normalizarFlores(await respuesta.json()), fuente: "api" }
  } catch (err) {
    if (!usarFallback) throw err
    return { data: aplicarFiltrosLocales(FLORES_ESTATICAS, filtros), fuente: "estatica" }
  }
}

export async function obtenerFloresAdmin(token: string | null): Promise<Flor[]> {
  const headers: Record<string, string> = {}
  if (token !== null) headers["Authorization"] = `Bearer ${token}`
  const respuesta = await fetch(`${URL_API}/api/admin/flores.php`, {
    headers,
    signal: AbortSignal.timeout(5000),
    credentials: "include",
  })
  if (respuesta.status === 401) throw new Error("UNAUTHORIZED")
  if (!respuesta.ok) {
    const err = await respuesta.json()
    throw new Error(err.error ?? "Error al obtener flores")
  }
  return normalizarFlores(await respuesta.json())
}

export interface ResultadoLogin {
  modo: "jwt" | "token"
  token?: string
  csrf_token?: string
}

export async function iniciarSesion(usuario: string, password: string): Promise<ResultadoLogin> {
  const respuesta = await fetch(`${URL_API}/api/auth.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
    credentials: "include",
  })
  if (!respuesta.ok) {
    const err = await respuesta.json()
    throw new Error(err.error ?? "Credenciales incorrectas")
  }
  const datos = await respuesta.json() as ResultadoLogin
  if (datos.modo !== "jwt" && datos.modo !== "token") {
    throw new Error("Respuesta de login inesperada")
  }
  return datos
}

export async function cerrarSesionApi(): Promise<void> {
  try {
    await fetch(`${URL_API}/api/logout.php`, {
      method: "POST",
      credentials: "include",
    })
  } catch {
    // No crítico: el JWT expira en 1 h de todas formas
  }
}

function leerCsrfCookie(): string {
  if (typeof document === "undefined") return ""
  const m = document.cookie.match(/(?:^|;\s*)fm_csrf=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : ""
}

function headersAuth(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token !== null) headers["Authorization"] = `Bearer ${token}`
  const csrf = leerCsrfCookie()
  if (csrf) headers["X-CSRF-Token"] = csrf
  return headers
}

export async function crearFlor(datos: Omit<Flor, "id" | "creado_en">, token: string | null): Promise<Flor> {
  const respuesta = await fetch(`${URL_API}/api/flores.php`, {
    method: "POST",
    headers: headersAuth(token),
    body: JSON.stringify({ ...datos, disponible: datos.disponible ? 1 : 0 }),
    credentials: "include",
  })
  if (respuesta.status === 401) throw new Error("UNAUTHORIZED")
  if (!respuesta.ok) {
    const err = await respuesta.json()
    throw new Error(err.error ?? "Error al crear la flor")
  }
  return normalizarFlor(await respuesta.json())
}

export async function actualizarFlor(id: number, datos: Partial<Flor>, token: string | null): Promise<Flor> {
  const payload: Record<string, unknown> = { ...datos }
  if ("disponible" in payload) payload.disponible = payload.disponible ? 1 : 0
  const respuesta = await fetch(`${URL_API}/api/flores.php?id=${id}`, {
    method: "PUT",
    headers: headersAuth(token),
    body: JSON.stringify(payload),
    credentials: "include",
  })
  if (respuesta.status === 401) throw new Error("UNAUTHORIZED")
  if (!respuesta.ok) {
    const err = await respuesta.json()
    throw new Error(err.error ?? "Error al actualizar la flor")
  }
  return normalizarFlor(await respuesta.json())
}

export async function eliminarFlor(id: number, token: string | null): Promise<void> {
  const respuesta = await fetch(`${URL_API}/api/flores.php?id=${id}`, {
    method: "DELETE",
    headers: headersAuth(token),
    credentials: "include",
  })
  if (respuesta.status === 401) throw new Error("UNAUTHORIZED")
  if (!respuesta.ok) {
    const err = await respuesta.json()
    throw new Error(err.error ?? "Error al eliminar la flor")
  }
}

export function ocultarFlor(id: number, token: string | null): Promise<Flor> {
  return actualizarFlor(id, { disponible: false }, token)
}

export async function eliminarFlorDefinitiva(id: number, token: string | null): Promise<void> {
  const respuesta = await fetch(`${URL_API}/api/admin/flores.php?id=${id}`, {
    method: "DELETE",
    headers: headersAuth(token),
    credentials: "include",
  })
  if (respuesta.status === 401) throw new Error("UNAUTHORIZED")
  if (!respuesta.ok) {
    const err = await respuesta.json()
    throw new Error(err.error ?? "Error al eliminar la flor")
  }
}

export async function obtenerRecomendaciones(consulta: string): Promise<Recomendacion> {
  try {
    const respuesta = await fetch(`${URL_API}/api/recomendar.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consulta }),
      signal: AbortSignal.timeout(10000),
      credentials: "include",
    })
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
    const dados = await respuesta.json() as Record<string, unknown>
    return { ...(dados as unknown as Recomendacion), flores: normalizarFlores(dados.flores) }
  } catch {
    return recomendarLocalmente(consulta)
  }
}

function detectarIntencionLocal(texto: string): string {
  const puntos: Record<string, number> = Object.fromEntries(
    Object.keys(PALABRAS_CLAVE).map((k) => [k, 0])
  )

  for (const [intencion, frases] of Object.entries(FRASES_PRIORITARIAS)) {
    for (const frase of frases) {
      const fn = normalizar(frase)
      if (texto.includes(fn)) {
        puntos[intencion] = (puntos[intencion] ?? 0) + _PESO_PRIORITARIO * fn.split(" ").length
      }
    }
  }

  for (const [intencion, palabras] of Object.entries(PALABRAS_CLAVE)) {
    for (const palabra of palabras) {
      const pn = normalizar(palabra)
      if (texto.includes(pn)) {
        puntos[intencion] += pn.split(" ").length
      }
    }
  }

  const max = Math.max(...Object.values(puntos))
  if (max === 0) return "general"
  return Object.entries(puntos).find(([, v]) => v === max)![0]
}

function detectarContextoLocal(texto: string): string | null {
  const candidatos: [string, string][] = []
  for (const [ctx, frases] of Object.entries(CONTEXTOS)) {
    for (const frase of frases) {
      candidatos.push([normalizar(frase), ctx])
    }
  }
  candidatos.sort((a, b) => b[0].split(" ").length - a[0].split(" ").length)
  for (const [frase, ctx] of candidatos) {
    if (texto.includes(frase)) return ctx
  }
  return null
}

function construirMensajeLocal(intencion: string, contexto: string | null): string {
  if (contexto && MENSAJES_CONTEXTUALES[intencion]?.[contexto]) {
    return MENSAJES_CONTEXTUALES[intencion][contexto]
  }
  return MENSAJES[intencion] ?? MENSAJES.general
}

function recomendarLocalmente(consulta: string): Recomendacion {
  const texto     = normalizar(consulta)
  const intencion = detectarIntencionLocal(texto)
  const contexto  = detectarContextoLocal(texto)
  const ids       = IDS_POR_INTENCION[intencion] ?? IDS_POR_INTENCION.general
  const flores    = ids.map((id) => FLORES_ESTATICAS.find((f) => f.id === id)).filter(Boolean) as Flor[]

  if (
    !Array.isArray(flores) ||
    flores.some((f) => typeof f.nombre !== "string" || typeof f.precio !== "number")
  ) {
    throw new Error("[recomendador] flores locales con contrato incompleto")
  }

  const mensaje = construirMensajeLocal(intencion, contexto)
  return { intencion, contexto, flores, mensaje, consulta_original: consulta, modo: "local" }
}
