import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
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
 *
 * Y una tercera, añadida después: que el registro de acceso del contenedor no
 * vuelva a escribir el `?token=` de los enlaces de correo. Ese bloque está al
 * final, con su propio comentario.
 */

const ROOT = path.resolve(import.meta.dirname, '../..')

/**
 * Todas las reglas de `public/_headers`, indexadas por su patrón de ruta.
 *
 * Antes esto solo leía el bloque `/*`. Ahora el archivo declara además una regla
 * por cada ruta que llega desde un enlace de correo, y la correspondencia entre
 * esas reglas y el `map` de nginx es justamente lo que hay que comprobar.
 */
function parseCloudflareRules(): Map<string, Map<string, string>> {
  const raw = readFileSync(path.join(ROOT, 'public/_headers'), 'utf8')
  const rules = new Map<string, Map<string, string>>()
  let current: Map<string, string> | null = null

  for (const line of raw.split(/\r?\n/)) {
    if (line.trimStart().startsWith('#')) continue
    if (line.trim() === '') {
      current = null
      continue
    }
    if (!line.startsWith(' ')) {
      current = new Map()
      rules.set(line.trim(), current)
      continue
    }
    if (current === null) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue
    current.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }
  return rules
}

const NGINX = readFileSync(path.join(ROOT, 'docker/nginx.conf'), 'utf8')

/**
 * `docker/nginx.conf` con los comentarios quitados.
 *
 * Todo lo que se busca abajo son DIRECTIVAS, y ese archivo explica en un
 * comentario largo por qué NO se usa `access_log /dev/stdout;` a secas — citando
 * la directiva dentro del texto. Buscando sobre el archivo entero, el aserto de
 * «no queda ningún access_log sin formato» lo encontraba en su propia
 * explicación y se ponía rojo con la configuración correcta delante.
 *
 * Si alguna vez un valor de `add_header` llegara a contener una almohadilla,
 * esto lo truncaría — pero entonces la comparación contra `public/_headers`
 * fallaría de forma ruidosa, no silenciosa.
 */
const NGINX_DIRECTIVAS = NGINX.replace(/#.*$/gm, '')

/**
 * Un bloque `map … $destino { … }` de `docker/nginx.conf`.
 *
 * Devuelve el valor de `default` por separado, porque es el que tiene que
 * coincidir con lo que `public/_headers` declara en `/*`.
 */
function parseNginxMap(destino: string): { fallback: string; entries: Map<string, string> } {
  const bloque = new RegExp(`map\\s+\\S+\\s+\\$${destino}\\s*\\{([^}]*)\\}`).exec(NGINX_DIRECTIVAS)
  const cuerpo = bloque?.[1]
  if (cuerpo === undefined) throw new Error(`docker/nginx.conf no declara el map $${destino}`)

  let fallback = ''
  const entries = new Map<string, string>()
  for (const linea of cuerpo.split(/\r?\n/)) {
    const limpia = linea.replace(/#.*$/, '').trim()
    if (limpia === '') continue
    const par = /^"?([^"\s]+)"?\s+"([^"]*)"\s*;$/.exec(limpia)
    const clave = par?.[1]
    const valor = par?.[2]
    if (clave === undefined || valor === undefined) continue
    if (clave === 'default') fallback = valor
    else entries.set(clave, valor)
  }
  return { fallback, entries }
}

/**
 * Cabeceras `add_header` del `server` de `docker/nginx.conf`.
 *
 * `Referrer-Policy` ya no es un literal: su valor sale de un `map`, porque
 * depende de la ruta. Para comparar contra el bloque `/*` de Cloudflare se
 * resuelve con el `default` de ese `map`, que es exactamente el valor que se
 * sirve en todas las rutas menos las de enlace de correo.
 */
function parseNginxHeaders(): Map<string, string> {
  const headers = new Map<string, string>()
  const literal = /^\s*add_header\s+(\S+)\s+"([^"]*)"\s*always\s*;/gm

  for (const match of NGINX_DIRECTIVAS.matchAll(literal)) {
    const name = match[1]
    const value = match[2]
    if (name === undefined || value === undefined) continue
    headers.set(name, value)
  }

  const porVariable = /^\s*add_header\s+(\S+)\s+\$(\w+)\s*always\s*;/gm
  for (const match of NGINX_DIRECTIVAS.matchAll(porVariable)) {
    const name = match[1]
    const variable = match[2]
    if (name === undefined || variable === undefined) continue
    headers.set(name, parseNginxMap(variable).fallback)
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
  const valor = match[1]
  if (valor === undefined) throw new Error(`${envFile}: VITE_API_URL sin grupo capturado`)
  return new URL(valor.trim()).origin
}

/** Todos los archivos bajo un directorio, recursivamente. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(full) : [full]
  })
}

const reglas = parseCloudflareRules()
const cloudflare = reglas.get('/*') ?? new Map<string, string>()
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

describe('idioma de la página', () => {
  // Auditoría EST-03 / WCAG 2.2 §3.1.1. `index.html` declaraba `lang="en"` en
  // una aplicación íntegramente en español. No es un detalle cosmético: el
  // lector de pantalla elige la voz y las reglas de pronunciación por este
  // atributo, así que leía "Configuración" con fonética inglesa — inteligible
  // para nadie. Es una línea que se copia entre plantillas y vuelve sola.
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8')

  it('declara español en el elemento raíz', () => {
    // Regex sobre el atributo, no `toContain('<html lang="es">')`: añadir un
    // `class` o un `data-theme` al `<html>` no debe romper esta prueba.
    expect(html).toMatch(/<html[^>]*\slang="es"/)
  })

  it('no deja ningún resto de inglés declarado', () => {
    // El fallo real fue una plantilla en inglés. Si `lang="en"` reaparece en
    // cualquier parte del archivo —el `<html>`, un `<span lang>` copiado— es
    // la misma regresión aunque el aserto de arriba siga pasando.
    expect(html).not.toMatch(/\slang="en"/)
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

/**
 * EL `?token=` DE LOS ENLACES DE CORREO NO PUEDE ACABAR EN UN LOG.
 *
 * `docker/nginx.conf` declaraba `access_log /dev/stdout;` sin `log_format`, así
 * que nginx usaba `combined`, cuyo `"$request"` es la línea de petición con su
 * cadena de consulta. La salida estándar del contenedor es la entrada de la
 * tubería hacia CloudWatch/Firehose, de modo que cada apertura de un enlace de
 * correo escribía la credencial dos veces: una en `$request` al servir el
 * documento y otra en el `$http_referer` de cada `/assets/…`, porque
 * `strict-origin-when-cross-origin` manda la URL completa entre peticiones del
 * MISMO origen.
 *
 * En esta consola las dos rutas afectadas son `/aceptar-invitacion` —donde el
 * token CREA la contraseña de la cuenta— y `/aprobar-acceso`.
 *
 * Estas pruebas existen para que nadie deshaga el arreglo por el camino que
 * parece razonable —volver al formato estándar «que entienden las
 * herramientas»— sin darse cuenta de lo que arrastra.
 */
describe('registro de acceso sin credenciales', () => {
  const formato = /log_format\s+(\w+)\s+([\s\S]*?);/.exec(NGINX_DIRECTIVAS)
  const nombreFormato = formato?.[1]
  const cuerpoFormato = formato?.[2]

  it('define un log_format propio y lo usa en el access_log', () => {
    expect(nombreFormato, 'docker/nginx.conf no declara ningún log_format').toBeDefined()
    // Un `access_log` sin nombre de formato es `combined`, que es exactamente el
    // fallo que se está evitando.
    expect(NGINX_DIRECTIVAS).toMatch(
      new RegExp(`access_log\\s+/dev/stdout\\s+${nombreFormato}\\s*;`),
    )
    expect(NGINX_DIRECTIVAS).not.toMatch(/access_log\s+\/dev\/stdout\s*;/)
    expect(NGINX_DIRECTIVAS).not.toMatch(/access_log\s+\S+\s+combined\s*;/)
  })

  it.each([
    // `$request` es la línea de petición ENTERA, con la cadena de consulta. El
    // límite de palabra es imprescindible: `$request_method` y `$request_time` sí
    // están en el formato y son inofensivos.
    ['$request', /\$request(?![_a-zA-Z0-9])/],
    ['$request_uri', /\$request_uri\b/],
    ['$args', /\$args\b/],
    ['$query_string', /\$query_string\b/],
    ['$http_referer', /\$http_referer\b/],
  ])('no escribe %s, que arrastraría el token', (_variable, patron) => {
    expect(cuerpoFormato).toBeDefined()
    expect(cuerpoFormato ?? '').not.toMatch(patron)
  })

  it('sigue registrando lo que hace falta para diagnosticar', () => {
    // El otro lado del equilibrio: quitar el secreto no puede dejar el log ciego.
    for (const variable of [
      '$request_method',
      '$vs_ruta',
      '$server_protocol',
      '$status',
      '$body_bytes_sent',
      '$request_time',
    ]) {
      expect(cuerpoFormato ?? '', `el log ya no registra ${variable}`).toContain(variable)
    }
  })

  it('registra la ruta original del SPA, no el /index.html reescrito', () => {
    // `$uri` tampoco lleva la consulta, pero `try_files … /index.html` lo reescribe
    // en toda ruta del SPA: loguearlo dejaría el log sin saber qué pantalla se
    // pidió. `$vs_ruta` sale de `$request_uri` recortado en el `?`.
    const declaracion = /map\s+\$request_uri\s+\$vs_ruta\s*\{([^}]*)\}/.exec(NGINX_DIRECTIVAS)
    expect(declaracion, 'no existe el map que recorta la cadena de consulta').not.toBeNull()
    expect(declaracion?.[1] ?? '').toContain('[^?]')
  })
})

/**
 * LA SEGUNDA COPIA SE CIERRA TAMBIÉN EN EL NAVEGADOR.
 *
 * Arreglar el `log_format` quita las dos copias de ESTE servidor. `no-referrer`
 * en las rutas de enlace de correo quita la segunda copia en el origen, y por
 * tanto en cualquier salto que no controlemos — empezando por Cloudflare Pages,
 * donde `docker/nginx.conf` no existe.
 *
 * Lo que se comprueba aquí es la correspondencia: las dos declaraciones tienen
 * que cubrir exactamente las mismas rutas.
 */
describe('Referrer-Policy en las rutas que llegan por enlace de correo', () => {
  const mapa = parseNginxMap('vs_referrer_policy')

  /**
   * Las rutas cuya vista —o un composable que esa vista monte— lee
   * `route.query.token`. Se repiten aquí a propósito: que las dos declaraciones
   * coincidan no sirve de nada si alguien vacía las dos a la vez.
   */
  const RUTAS_CON_CREDENCIAL_EN_LA_URL = [
    '/aceptar-invitacion', // el invitado aprobado CREA su contraseña
    '/aprobar-acceso', // aprobación de una solicitud de acceso
  ]

  it('el valor por defecto sigue siendo el de siempre', () => {
    expect(mapa.fallback).toBe('strict-origin-when-cross-origin')
    expect(cloudflare.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  it('nginx pone no-referrer exactamente en las rutas con credencial', () => {
    expect([...mapa.entries.keys()].sort()).toEqual([...RUTAS_CON_CREDENCIAL_EN_LA_URL].sort())
    for (const [ruta, valor] of mapa.entries) {
      expect(valor, `${ruta} no está en no-referrer`).toBe('no-referrer')
    }
  })

  it('public/_headers declara las mismas rutas que el map de nginx', () => {
    const enCloudflare = [...reglas.entries()]
      .filter(([, cabeceras]) => cabeceras.get('Referrer-Policy') === 'no-referrer')
      .map(([ruta]) => ruta)

    expect(enCloudflare.sort()).toEqual([...mapa.entries.keys()].sort())
  })

  it('cada regla por ruta repite el resto de cabeceras de /*', () => {
    // No es redundancia por descuido: `_headers` no documenta de forma inequívoca
    // si una regla más específica fusiona con `/*` o lo sustituye. Repitiéndolo
    // todo, el resultado es correcto en los dos casos; declarando solo
    // Referrer-Policy, bajo semántica de sustitución estas pantallas se quedarían
    // sin CSP ni HSTS en silencio. Esta prueba impide que se desincronicen.
    const esperado = new Map(cloudflare)
    esperado.set('Referrer-Policy', 'no-referrer')

    for (const ruta of RUTAS_CON_CREDENCIAL_EN_LA_URL) {
      const bloque = reglas.get(ruta)
      expect(bloque, `public/_headers no declara ninguna regla para ${ruta}`).toBeDefined()
      expect(Object.fromEntries(bloque ?? new Map()), `la regla de ${ruta}`).toEqual(
        Object.fromEntries(esperado),
      )
    }
  })

  it('no hay en src/ ningún lector de ?token= sin ruta declarada', () => {
    // Tripwire. No puede atar automáticamente un composable a su ruta, pero si
    // aparece un lector nuevo la prueba se pone roja y obliga a mirar si esa
    // pantalla necesita entrar en las dos listas de arriba.
    const lectores = filesUnder(path.join(ROOT, 'src'))
      .filter((file) =>
        /route\.query(?:\.token\b|\[['"]token['"]\])/.test(readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(ROOT, file).replace(/\\/g, '/'))
      .sort()

    expect(lectores).toEqual(['src/composables/useTokenDeEnlace.ts'])
  })
})
