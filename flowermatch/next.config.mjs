/** @type {import('next').NextConfig} */

const API_URL = process.env.NEXT_PUBLIC_URL_API ?? "http://localhost:8080"

// Extraer solo el origen (scheme + host + port) para usarlo en connect-src
const API_ORIGIN = (() => {
  try {
    const { origin } = new URL(API_URL)
    return origin
  } catch {
    return API_URL
  }
})()

const csp = [
  "default-src 'self'",

  // Scripts: Next.js necesita 'self' + inline para sus chunks internos.
  // 'unsafe-eval' solo en desarrollo (next dev usa eval para hot-reload).
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",

  // Estilos: Tailwind v4 inyecta <style> en runtime → 'unsafe-inline' requerido.
  "style-src 'self' 'unsafe-inline'",

  // Imágenes: self + data URIs (Next.js Image placeholder) + blob (canvas).
  "img-src 'self' data: blob:",

  // Fuentes: solo self (no hay Google Fonts ni CDN externo).
  "font-src 'self'",

  // Fetch / WebSocket: self para RSC y el backend PHP.
  `connect-src 'self' ${API_ORIGIN}`,

  // Frames: no se usan iframes.
  "frame-src 'none'",
  "frame-ancestors 'none'",

  "object-src 'none'",

  // Base: evitar redirección de relative URLs.
  "base-uri 'self'",

  // Form actions: solo self.
  "form-action 'self'",

  // Workers: Next.js puede usar blob workers en dev.
  "worker-src 'self' blob:",

  // Upgrade insecure requests solo en producción.
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ")

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Content-Security-Policy",   value: csp },
]

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
