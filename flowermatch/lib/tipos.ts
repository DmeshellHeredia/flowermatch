// Tipos de datos principales para FlowerMatch

export interface Flor {
  id: number
  nombre: string
  color: string
  ocasion: string
  precio: number
  descripcion: string
  imagen: string | null
  disponible: boolean
  creado_en: string
}

export type ModoRecomendacion = "python-nlp" | "php-reglas" | "local"

export interface Recomendacion {
  intencion: string
  contexto?: string | null
  flores: Flor[]
  mensaje: string
  consulta_original: string
  modo?: ModoRecomendacion
  degradado?: boolean
}

export interface ItemCarrito {
  flor: Flor
  cantidad: number
}

export interface FiltrosFlores {
  busqueda: string
  color: string
  ocasion: string
  precioMin: number
  precioMax: number
  orden: "nombre" | "precio_asc" | "precio_desc"
}

