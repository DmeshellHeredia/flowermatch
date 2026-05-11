import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ESQUEMAS_PELIGROSOS = ["javascript:", "data:", "vbscript:"]

export function sanitizarImagen(url: string | null | undefined): string | null {
  if (!url) return null
  const lower = url.trimStart().toLowerCase()
  if (ESQUEMAS_PELIGROSOS.some((e) => lower.startsWith(e))) return null
  return url
}

export function validarImagenInput(url: string): string | null {
  if (!url) return null
  const lower = url.trimStart().toLowerCase()
  if (ESQUEMAS_PELIGROSOS.some((e) => lower.startsWith(e))) return "URL de imagen no permitida."
  if (url.includes("..")) return "URL de imagen no permitida."
  return null
}
