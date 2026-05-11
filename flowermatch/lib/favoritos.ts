// Gestión de favoritos con localStorage - FlowerMatch

const CLAVE_STORAGE = "flowermatch_favoritos"

export function obtenerFavoritos(): Set<number> {
  if (typeof window === "undefined") return new Set()
  try {
    const datos = localStorage.getItem(CLAVE_STORAGE)
    return datos ? new Set(JSON.parse(datos) as number[]) : new Set()
  } catch {
    return new Set()
  }
}

export function guardarFavoritos(favoritos: Set<number>): void {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify([...favoritos]))
}

export function alternarFavorito(id: number): Set<number> {
  const favoritos = obtenerFavoritos()
  if (favoritos.has(id)) {
    favoritos.delete(id)
  } else {
    favoritos.add(id)
  }
  guardarFavoritos(favoritos)
  return new Set(favoritos)
}
