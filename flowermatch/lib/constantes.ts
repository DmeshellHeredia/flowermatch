import type { FiltrosFlores } from "./tipos"

export { COLORES } from "./recomendador-datos"

export const FILTROS_INICIALES: FiltrosFlores = {
  busqueda: "",
  color: "",
  ocasion: "",
  precioMin: 0,
  precioMax: 200,
  orden: "nombre",
}
