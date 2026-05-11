"use client"

import { useState, useEffect } from "react"
import { obtenerFlores, obtenerFloresAdmin, crearFlor, actualizarFlor, ocultarFlor, eliminarFlorDefinitiva, iniciarSesion, cerrarSesionApi } from "@/lib/api"
import type { Flor } from "@/lib/tipos"
import { COLORES } from "@/lib/constantes"
import { ModalConfirmacion } from "@/components/ModalConfirmacion"
import { validarImagenInput } from "@/lib/utils"

type SesionAdmin = { modo: "jwt" } | { modo: "token"; token: string }

const FLOR_VACIA: Omit<Flor, "id" | "creado_en"> = {
  nombre: "", color: "Rojo", ocasion: "", precio: 0,
  descripcion: "", imagen: "", disponible: true,
}

const INPUT_CLS = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"

export default function PaginaAdmin() {
  // Auth
  const [cargandoAuth, setCargandoAuth] = useState(true)
  const [sesion, setSesion]             = useState<SesionAdmin | null>(null)
  const [loginForm, setLoginForm]       = useState({ usuario: "", password: "" })
  const [loginError, setLoginError]     = useState<string | null>(null)
  const [iniciando, setIniciando]       = useState(false)

  const tokenApi = sesion?.modo === "token" ? sesion.token : null

  useEffect(() => {
    const t = localStorage.getItem("fm_token")
    if (t) {
      setSesion({ modo: "token", token: t })
    } else if (document.cookie.includes("fm_csrf=")) {
      setSesion({ modo: "jwt" })
    }
    setCargandoAuth(false)
  }, [])

  const manejarLogin = async () => {
    if (!loginForm.usuario.trim() || !loginForm.password.trim()) {
      setLoginError("Completa usuario y contraseña.")
      return
    }
    setIniciando(true)
    setLoginError(null)
    try {
      const resultado = await iniciarSesion(loginForm.usuario, loginForm.password)
      if (resultado.modo === "token" && resultado.token) {
        localStorage.setItem("fm_token", resultado.token)
        setSesion({ modo: "token", token: resultado.token })
      } else {
        setSesion({ modo: "jwt" })
      }
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : "Error al iniciar sesión.")
    } finally {
      setIniciando(false)
    }
  }

  const cerrarSesion = async () => {
    await cerrarSesionApi()
    localStorage.removeItem("fm_token")
    setSesion(null)
    setLoginForm({ usuario: "", password: "" })
  }

  const manejarSesionExpirada = () => {
    cerrarSesion()
    setLoginError("Sesión expirada. Inicia sesión de nuevo.")
  }

  // Admin
  const [flores, setFlores]           = useState<Flor[]>([])
  const [cargando, setCargando]       = useState(true)
  const [editando, setEditando]       = useState<Flor | null>(null)
  const [creando, setCreando]         = useState(false)
  const [formulario, setFormulario]   = useState(FLOR_VACIA)
  const [guardando, setGuardando]     = useState(false)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [mensaje, setMensaje]         = useState<{ texto: string; tipo: "ok" | "error" } | null>(null)
  const [modoBackend, setModoBackend]   = useState(false)
  const [confirmacion, setConfirmacion] = useState<{ flor: Flor; tipo: "ocultar" | "eliminar" } | null>(null)
  const [procesandoConfirm, setProcesandoConfirm] = useState(false)

  const mostrarMensaje = (texto: string, tipo: "ok" | "error") => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 3500)
  }

  const cargarFlores = async () => {
    setCargando(true)
    try {
      // Endpoint admin: devuelve todas las flores, incluyendo disponible = 0
      const datos = await obtenerFloresAdmin(tokenApi)
      setFlores(datos)
      setModoBackend(true)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        manejarSesionExpirada()
        return
      }
      setModoBackend(false)
      mostrarMensaje(e instanceof Error ? e.message : "Backend no disponible.", "error")
      const { data } = await obtenerFlores()
      setFlores(data)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { if (sesion) cargarFlores() }, [sesion])

  const abrirCrear = () => { setFormulario(FLOR_VACIA); setEditando(null); setCreando(true); setErrorImagen(null) }
  const abrirEditar = (flor: Flor) => {
    const { id, creado_en, ...resto } = flor
    setFormulario({ ...resto })
    setEditando(flor)
    setCreando(false)
    setErrorImagen(null)
  }
  const cerrarFormulario = () => { setCreando(false); setEditando(null) }
  const manejarCambio = (campo: keyof typeof formulario, valor: string | number | boolean) => {
    setFormulario((f) => ({ ...f, [campo]: valor }))
  }

  const manejarGuardar = async () => {
    if (!formulario.nombre.trim() || !formulario.ocasion.trim() || formulario.precio <= 0) {
      mostrarMensaje("Completa todos los campos requeridos (nombre, ocasión, precio).", "error")
      return
    }
    const errImg = validarImagenInput(formulario.imagen ?? "")
    if (errImg) {
      setErrorImagen(errImg)
      return
    }
    setGuardando(true)
    try {
      if (editando) {
        const actualizada = await actualizarFlor(editando.id, formulario, tokenApi)
        setFlores((prev) => prev.map((f) => (f.id === editando.id ? actualizada : f)))
        mostrarMensaje("Flor actualizada correctamente.", "ok")
      } else {
        const nueva = await crearFlor(formulario, tokenApi)
        setFlores((prev) => [...prev, nueva])
        mostrarMensaje("Flor creada correctamente.", "ok")
      }
      cerrarFormulario()
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") { manejarSesionExpirada(); return }
      mostrarMensaje(e instanceof Error ? e.message : "Error al guardar.", "error")
    } finally {
      setGuardando(false)
    }
  }

  const manejarEliminar = (flor: Flor) => setConfirmacion({ flor, tipo: "eliminar" })

  const manejarOcultar = (flor: Flor) => setConfirmacion({ flor, tipo: "ocultar" })

  const cancelarConfirmacion = () => setConfirmacion(null)

  const confirmarAccion = async () => {
    if (!confirmacion) return
    setProcesandoConfirm(true)
    try {
      if (confirmacion.tipo === "eliminar") {
        await eliminarFlorDefinitiva(confirmacion.flor.id, tokenApi)
        setFlores((prev) => prev.filter((f) => f.id !== confirmacion.flor.id))
        mostrarMensaje("Flor eliminada definitivamente.", "ok")
      } else {
        const actualizada = await ocultarFlor(confirmacion.flor.id, tokenApi)
        setFlores((prev) => prev.map((f) => f.id === confirmacion.flor.id ? actualizada : f))
        mostrarMensaje("Flor ocultada del catálogo.", "ok")
      }
      setConfirmacion(null)
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") { manejarSesionExpirada(); return }
      mostrarMensaje(e instanceof Error ? e.message : "Error al procesar.", "error")
      setConfirmacion(null)
    } finally {
      setProcesandoConfirm(false)
    }
  }

  const formularioVisible = creando || editando !== null

  // Render: cargando auth
  if (cargandoAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground text-sm">
        Cargando...
      </div>
    )
  }

  // Render: login
  if (!sesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold">Iniciar sesión</h1>
          <p className="mb-6 text-sm text-muted-foreground">Panel de administración</p>

          {loginError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
              {loginError}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); manejarLogin() }}
            className="flex flex-col gap-3"
          >
            <div>
              <label htmlFor="login-usuario" className="sr-only">Usuario</label>
              <input
                id="login-usuario"
                type="text"
                placeholder="Usuario"
                value={loginForm.usuario}
                onChange={(e) => setLoginForm((f) => ({ ...f, usuario: e.target.value }))}
                className={INPUT_CLS}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">Contraseña</label>
              <input
                id="login-password"
                type="password"
                placeholder="Contraseña"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                className={INPUT_CLS}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={iniciando}
              className="rounded-lg bg-rose-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
            >
              {iniciando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Render: panel admin
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona el catálogo de flores</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={abrirCrear}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-600"
          >
            + Nueva flor
          </button>
          <button
            onClick={cerrarSesion}
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Aviso si no hay backend */}
      {!modoBackend && !cargando && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
          <strong>Modo local:</strong> El backend PHP no está disponible. Los datos mostrados son
          de respaldo — no se puede ocultar, eliminar ni editar flores realmente sin el servidor PHP.
        </div>
      )}

      {/* Notificación */}
      {mensaje && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "border border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-400"
              : "border border-red-200 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400"
          }`}
        >
          {mensaje.tipo === "ok" ? "✓" : "✕"} {mensaje.texto}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tabla */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {cargando ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Cargando...
            </div>
          ) : flores.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl">🌱</span>
              <p className="text-muted-foreground">No hay flores registradas.</p>
              <button onClick={abrirCrear} className="text-sm text-rose-600 hover:underline">
                Agregar la primera
              </button>
            </div>
          ) : (
            <>
              {/* Tarjetas mobile */}
              <div className="divide-y divide-border md:hidden">
                {flores.map((flor) => (
                  <div key={flor.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{flor.nombre}</span>
                      {flor.disponible ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400">Disponible</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Oculta</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5">{flor.color}</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">${Number(flor.precio).toFixed(2)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{flor.ocasion}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => abrirEditar(flor)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        Editar
                      </button>
                      {flor.disponible ? (
                        <button
                          onClick={() => manejarOcultar(flor)}
                          className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400 dark:hover:bg-amber-950/20"
                        >
                          Ocultar
                        </button>
                      ) : (
                        <button
                          onClick={() => manejarEliminar(flor)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Color</th>
                      <th className="px-4 py-3">Ocasión</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {flores.map((flor) => (
                      <tr key={flor.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{flor.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{flor.color}</span>
                        </td>
                        <td className="max-w-45 truncate px-4 py-3 text-muted-foreground">
                          {flor.ocasion}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                          ${Number(flor.precio).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {flor.disponible ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400">
                              Disponible
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Oculta
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              onClick={() => abrirEditar(flor)}
                              className="whitespace-nowrap rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                            >
                              Editar
                            </button>
                            {flor.disponible ? (
                              <button
                                onClick={() => manejarOcultar(flor)}
                                className="whitespace-nowrap rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400 dark:hover:bg-amber-950/20"
                              >
                                Ocultar
                              </button>
                            ) : (
                              <button
                                onClick={() => manejarEliminar(flor)}
                                className="whitespace-nowrap rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-950/20"
                              >
                                Eliminar definitivamente
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Formulario lateral / modal mobile */}
        {formularioVisible && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={cerrarFormulario}
            />
          <div className="fixed inset-x-4 top-1/2 z-50 max-h-[90vh] -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl lg:static lg:inset-auto lg:max-h-none lg:w-80 lg:shrink-0 lg:translate-y-0 lg:overflow-visible lg:shadow-sm">
            <h2 className="mb-4 font-semibold">
              {editando ? `Editar: ${editando.nombre}` : "Nueva flor"}
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formulario.nombre}
                  onChange={(e) => manejarCambio("nombre", e.target.value)}
                  className={INPUT_CLS} placeholder="Ej: Rosa Roja" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Color</label>
                <select value={formulario.color}
                  onChange={(e) => manejarCambio("color", e.target.value)}
                  className={INPUT_CLS}>
                  {COLORES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Ocasión <span className="text-red-500">*</span>
                  <span className="ml-1 text-muted-foreground/60">(separadas por coma)</span>
                </label>
                <input type="text" value={formulario.ocasion}
                  onChange={(e) => manejarCambio("ocasion", e.target.value)}
                  className={INPUT_CLS} placeholder="romance,amor,aniversario" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Precio ($) <span className="text-red-500">*</span>
                </label>
                <input type="number" min={0} step={0.01} value={formulario.precio}
                  onChange={(e) => { const n = Number.parseFloat(e.target.value); manejarCambio("precio", Number.isNaN(n) ? 0 : n) }}
                  className={INPUT_CLS} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
                <textarea value={formulario.descripcion}
                  onChange={(e) => manejarCambio("descripcion", e.target.value)}
                  rows={3} className={`${INPUT_CLS} resize-none`}
                  placeholder="Descripción de la flor..." />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Imagen
                  <span className="ml-1 text-muted-foreground/60">(ruta o URL)</span>
                </label>
                <input type="text" value={formulario.imagen ?? ""}
                  onChange={(e) => { manejarCambio("imagen", e.target.value); setErrorImagen(null) }}
                  className={`${INPUT_CLS} ${errorImagen ? "border-red-400 focus:ring-red-400/30" : ""}`}
                  placeholder="/imagenes/flores/mi-flor.jpg" />
                {errorImagen && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorImagen}</p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={formulario.disponible}
                  onChange={(e) => manejarCambio("disponible", e.target.checked)}
                  className="h-4 w-4 accent-rose-500" />
                <span className="text-sm">Disponible en catálogo</span>
              </label>

              <div className="flex gap-2 pt-1">
                <button onClick={manejarGuardar} disabled={guardando}
                  className="flex-1 rounded-lg bg-rose-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
                  {guardando ? "Guardando..." : editando ? "Actualizar" : "Crear"}
                </button>
                <button onClick={cerrarFormulario}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Total en catálogo: <strong>{flores.length}</strong> flores
      </p>

      {confirmacion && (
        <ModalConfirmacion
          titulo={confirmacion.tipo === "eliminar" ? "Eliminar definitivamente" : "Ocultar flor del catálogo"}
          mensaje={
            confirmacion.tipo === "eliminar"
              ? `Esta acción borrará "${confirmacion.flor.nombre}" de la base de datos y no se puede deshacer.`
              : `La flor "${confirmacion.flor.nombre}" dejará de aparecer en el catálogo público, pero seguirá disponible en el panel de administración.`
          }
          textoConfirmar={confirmacion.tipo === "eliminar" ? "Eliminar definitivamente" : "Ocultar flor"}
          variante={confirmacion.tipo === "eliminar" ? "peligro" : "advertencia"}
          procesando={procesandoConfirm}
          alCancelar={cancelarConfirmacion}
          alConfirmar={confirmarAccion}
        />
      )}
    </div>
  )
}
