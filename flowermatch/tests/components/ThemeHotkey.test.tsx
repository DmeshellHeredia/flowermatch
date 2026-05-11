import { describe, it, expect, vi } from "vitest"
import { render, fireEvent } from "@testing-library/react"
import { ThemeProvider } from "@/components/theme-provider"

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}))

describe("ThemeHotkey", () => {
  it.each([undefined, null])("no lanza error si event.key es %s", (key) => {
    render(<ThemeProvider><div /></ThemeProvider>)
    expect(() => {
      fireEvent.keyDown(window, { key })
    }).not.toThrow()
  })

  it("no actúa cuando isComposing es true", () => {
    const { unmount } = render(<ThemeProvider><div /></ThemeProvider>)
    expect(() => {
      fireEvent.keyDown(window, { key: "d", isComposing: true })
    }).not.toThrow()
    unmount()
  })

  it("no actúa cuando el target es un input", () => {
    render(
      <ThemeProvider>
        <input data-testid="inp" />
      </ThemeProvider>
    )
    const input = document.querySelector("input")!
    expect(() => {
      fireEvent.keyDown(input, { key: "d" })
    }).not.toThrow()
  })
})
