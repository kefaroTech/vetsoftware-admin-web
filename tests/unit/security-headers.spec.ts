import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Las cabeceras de seguridad se declaran DOS veces —`public/_headers` para
 * Cloudflare Pages y `docker/nginx.conf` para el contenedor— y hasta ahora nada
 * garantizaba que dijeran lo mismo. Un despliegue quedaba protegido y el otro no,
 * sin ninguna señal.
 *
 * Estas pruebas fijan las dos cosas que se rompen solas:
 *  1. que ambos archivos declaren idénticamente el mismo juego de cabeceras, y
 *  2. que la CSP siga permitiendo exactamente lo que la aplicación carga de
 *     verdad — incluida la API de CADA entorno, que es el error más fácil de
 *     cometer: el mismo archivo estático se despliega en dev y en prod, así que
 *     una `connect-src` con un solo origen deja un entorno sin poder hablar con
 *     su backend, y el fallo aparece en tiempo de ejecución, no en el build.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')

/** Cabeceras del bloque `/*` de `public/_headers`. */
function parseCloudflareHeaders(): Map<string, string> {
  const raw = readFileSync(path.join(ROOT, 'public/_headers'), 'utf8')
  const headers = new Map<string, string>()
  let inGlobalRule = false

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#')) continue
    if (!line.startsWith(' ')) {
      inGlobalRule = line.trim() === '/*'
      continue
    }
    if (!inGlobalRule) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue
    headers.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }
  return headers
}

/** Cabeceras `add_header` del `server` de `docker/nginx.conf`. */
function parseNginxHeaders(): Map<string, string> {
  const raw = readFileSync(path.join(ROOT, 'docker/nginx.conf'), 'utf8')
  const headers = new Map<string, string>()
  const pattern = /^\s*add_header\s+(\S+)\s+"([^"]*)"\s*always\s*;/gm

  for (const [, name, value] of raw.matchAll(pattern)) {
    headers.set(name, value)
  }
  return headers
}

/** Divide una CSP en `{ directiva: [valores] }`. */
function parseCsp(policy: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {}
  for (const chunk of policy.split(';')) {
    const [name, ...values] = chunk.trim().split(/\s+/)
    if (name) directives[name] = values
  }
  return directives
}

/** Origen (`https://host`) del `VITE_API_URL` de un archivo de entorno. */
function apiOriginOf(envFile: string): string {
  const raw = readFileSync(path.join(ROOT, envFile), 'utf8')
  const match = raw.match(/^VITE_API_URL=(.+)$/m)
  if (!match) throw new Error(`${envFile} no define VITE_API_URL`)
  return new URL(match[1].trim()).origin
}

const cloudflare = parseCloudflareHeaders()
const nginx = parseNginxHeaders()
const csp = parseCsp(cloudflare.get('Content-Security-Policy') ?? '')

describe('cabeceras de seguridad', () => {
  it('declara las mismas cabeceras en Cloudflare Pages y en el contenedor', () => {
    // Cache-Control lo gestiona cada plataforma a su manera (nginx usa `expires`),
    // así que es la única que legítimamente puede diferir.
    const comparable = new Map(cloudflare)
    comparable.delete('Cache-Control')

    expect(Object.fromEntries(nginx)).toEqual(Object.fromEntries(comparable))
  })

  it('incluye Content-Security-Policy', () => {
    // El resto de cabeceras ya existían; esta es la que faltaba y la que da la
    // segunda barrera cuando las credenciales viven en localStorage.
    expect(cloudflare.get('Content-Security-Policy')).toBeTruthy()
  })
})

describe('Content-Security-Policy', () => {
  it('no permite scripts en línea ni eval', () => {
    // Es la directiva que convierte un XSS reflejado en nada. El build de Vite no
    // necesita ninguna de las dos, así que admitirlas sería regalar la protección.
    expect(csp['script-src']).toEqual(["'self'"])
  })

  it('cierra los vectores que no dependen de ejecutar script', () => {
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['form-action']).toEqual(["'self'"])
  })

  it.each([
    ['dev', '.env.dev'],
    ['prod', '.env.prod'],
  ])('permite hablar con la API de %s', (_entorno, envFile) => {
    expect(csp['connect-src']).toContain(apiOriginOf(envFile))
  })

  it('permite todos los orígenes externos que carga index.html', () => {
    const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    const externalHosts = new Set(
      Array.from(html.matchAll(/(?:href|src)="(https:\/\/[^"/]+)/g), (m) => m[1]),
    )
    const policy = cloudflare.get('Content-Security-Policy') ?? ''

    expect(externalHosts.size).toBeGreaterThan(0)
    for (const host of externalHosts) {
      expect(policy, `${host} se carga en index.html pero la CSP lo bloquea`).toContain(host)
    }
  })

  it('no permite la CDN pública de Iconify', () => {
    // Los iconos se resuelven desde el subset local generado en build. Si alguien
    // reintroduce la descarga en tiempo de ejecución, esto lo detiene aquí en vez
    // de en producción, un icono a la vez.
    expect(cloudflare.get('Content-Security-Policy')).not.toContain('iconify')
  })
})
