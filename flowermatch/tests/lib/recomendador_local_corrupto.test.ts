import { describe, it, expect, vi, beforeEach } from "vitest"

// IDS_POR_INTENCION=null simula corrupción en datos compartidos.
// recomendarLocalmente intenta null[intencion] → TypeError → propagada a obtenerRecomendaciones.
vi.mock("@/lib/recomendador-datos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/recomendador-datos")>()
  return { ...original, IDS_POR_INTENCION: null as unknown as Record<string, number[]> }
})

import { obtenerRecomendaciones } from "@/lib/api"

const mockFetch = vi.mocked(global.fetch)

describe("recomendarLocalmente — datos corruptos (IDS_POR_INTENCION=null)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lanza excepción cuando el fetch falla y los datos locales están corruptos", async () => {
    mockFetch.mockRejectedValue(new Error("offline"))

    await expect(obtenerRecomendaciones("flores para amor")).rejects.toThrow()
  })

  it("la excepción propagada permite al componente mostrar el error al usuario", async () => {
    mockFetch.mockRejectedValue(new Error("offline"))

    await expect(obtenerRecomendaciones("cualquier consulta")).rejects.toThrow()
  })
})
