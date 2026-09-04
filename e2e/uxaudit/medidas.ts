import type { Page } from '@playwright/test'

/**
 * Geometría de una pantalla, medida DENTRO del navegador en una sola llamada.
 *
 * Va todo junto a propósito: veinte `evaluate` sobre la misma pantalla cuestan
 * veinte viajes y, peor, cada uno mide en un instante distinto.
 */

export interface Culpable {
  selector: string
  right: number
  width: number
  recortadoPorAncestro: boolean
}

export interface Objetivo {
  selector: string
  nombre: string
  width: number
  height: number
  envoltorio: { selector: string; width: number; height: number } | null
  exencionInline: boolean
}

export interface Desalineacion {
  contenedor: string
  izquierdas: number[]
  diferencia: number
  ejemplos: string[]
}

export interface Espaciado {
  propiedad: string
  valor: number
  ocurrencias: number
  ejemplo: string
}

export interface Truncado {
  selector: string
  scrollWidth: number
  clientWidth: number
  conElipsis: boolean
  texto: string
}

export interface Solape {
  a: string
  b: string
  solapeX: number
  solapeY: number
}

export interface ImagenRota {
  selector: string
  src: string
}

export interface ImagenDeformada {
  selector: string
  src: string
  relacionNatural: number
  relacionPintada: number
  desviacion: number
}

export interface Metricas {
  documento: {
    scrollWidth: number
    innerWidth: number
    scrollHeight: number
    innerHeight: number
    desbordaHorizontal: boolean
  }
  culpablesDeDesborde: Culpable[]
  scrollers: { visibles: string[]; fueraDePantalla: string[] }
  objetivosPequenos: Objetivo[]
  desalineaciones: Desalineacion[]
  espaciadoFueraDeEscala: Espaciado[]
  textoTruncado: Truncado[]
  textoDesbordadoSinElipsis: Truncado[]
  solapamientos: Solape[]
  imagenesRotas: ImagenRota[]
  imagenesDeformadas: ImagenDeformada[]
  conteos: {
    elementosPintados: number
    objetivosEvaluados: number
    titulos: number
    h1: number
    landmarks: number
  }
}

export async function medir(page: Page, escala: number[]): Promise<Metricas> {
  return page.evaluate((escalaPermitida: number[]) => {
    const TOPE = 40
    const permitidos = new Set(escalaPermitida)

    const selector = (el: Element): string => {
      const etiqueta = el.tagName.toLowerCase()
      const id = el.id !== '' ? `#${el.id}` : ''
      const testid = el.getAttribute('data-testid')
      const clases = String((el as HTMLElement).className || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
      return `${etiqueta}${id}${testid !== null ? `[data-testid="${testid}"]` : ''}${
        clases.length > 0 ? `.${clases.join('.')}` : ''
      }`
    }

    /**
     * Un elemento de uno o dos píxeles de lado no lo ve nadie: es el patrón de
     * ocultación para lector de pantalla (`.ds-sr-only`). Contarlo como parte de
     * la maquetación produce un falso positivo en tres métricas a la vez —texto
     * «desbordado», borde izquierdo «desalineado» y objetivo táctil diminuto—.
     */
    const pintado = (el: Element): boolean => {
      const r = el.getBoundingClientRect()
      if (r.width < 3 || r.height < 3) return false
      if (el.closest('[inert]') !== null) return false
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.opacity === '0') return false
      return r.right > 0
    }

    const todos = Array.from(document.querySelectorAll('*'))
    const visibles = todos.filter(pintado)

    /* ── Desbordamiento horizontal ─────────────────────────────────────── */
    const ancho = window.innerWidth
    // `hidden`/`clip` recortan de verdad —así vive el adorno decorativo del
    // armazón público— y `auto`/`scroll` ofrecen una barra que el usuario
    // maneja. En los cuatro casos el elemento no ensancha el documento, que es
    // lo que esta métrica busca.
    const recortadoPorAncestro = (el: Element): boolean => {
      let padre: Element | null = el.parentElement
      while (padre !== null && padre !== document.documentElement) {
        const ox = getComputedStyle(padre).overflowX
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true
        padre = padre.parentElement
      }
      return false
    }
    const culpablesDeDesborde: Culpable[] = visibles
      .filter((el) => el.getBoundingClientRect().right > ancho + 1)
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          selector: selector(el),
          right: Math.round(r.right),
          width: Math.round(r.width),
          recortadoPorAncestro: recortadoPorAncestro(el),
        }
      })
      .filter((c) => !c.recortadoPorAncestro)
      .slice(0, TOPE)

    /* ── Contenedores de scroll (mismo criterio que `app-shell.ts`) ─────── */
    const alcanzable = (el: Element): boolean => {
      if (el.closest('[inert]') !== null) return false
      const r = el.getBoundingClientRect()
      return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
    }
    const desplazables = todos.filter((el) => {
      const overflow = getComputedStyle(el).overflowY
      if (overflow !== 'auto' && overflow !== 'scroll') return false
      return el.scrollHeight - el.clientHeight > 1
    })

    /* ── Objetivos táctiles (WCAG 2.2 §2.5.8) ──────────────────────────── */
    const interactivos = visibles.filter((el) =>
      el.matches(
        'button, a, input, select, [role="button"], [role="tab"], [role="checkbox"], [role="switch"]',
      ),
    )
    // Se consulta `aria-labelledby` y el `<label for>` antes de rendirse: un
    // campo de formulario correctamente etiquetado no tiene texto propio, y sin
    // esto la lista entera de campos salía como «sin nombre accesible».
    const nombreAccesible = (el: Element): string => {
      const aria = el.getAttribute('aria-label')
      if (aria !== null && aria.trim() !== '') return aria.trim()
      const etiquetadoPor = el.getAttribute('aria-labelledby')
      if (etiquetadoPor !== null) {
        const textos = etiquetadoPor
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim()
        if (textos !== '') return textos.replace(/\s+/g, ' ').slice(0, 60)
      }
      if (el.id !== '') {
        const etiqueta = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
        const texto = (etiqueta?.textContent ?? '').trim()
        if (texto !== '') return texto.replace(/\s+/g, ' ').slice(0, 60)
      }
      const propio = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
      if (propio !== '') return propio.slice(0, 60)
      const titulo = el.getAttribute('title')
      if (titulo !== null && titulo.trim() !== '') return titulo.trim()
      const marcador = el.getAttribute('placeholder')
      if (marcador !== null && marcador.trim() !== '') return `(placeholder) ${marcador.trim()}`
      const alt = el.querySelector('img')?.getAttribute('alt')
      return alt ?? '(sin nombre accesible)'
    }
    /**
     * El envoltorio visible de un control: el ancestro más cercano que pinta
     * borde o fondo y lo contiene.
     *
     * Se reporta junto al rect propio porque son dos cifras distintas y las dos
     * importan. El campo de `/login` mide 350×43 en pantalla y su `<input>`
     * 297×21; el que decide §2.5.8 es el segundo, porque pulsar el relleno del
     * envoltorio NO enfoca el campo — comprobado con un clic real en
     * `verificacion.uxaudit.ts`: el foco acaba en `main#pub-main`.
     */
    const envoltorioVisible = (el: Element) => {
      let padre: Element | null = el.parentElement
      for (let i = 0; i < 3 && padre !== null; i += 1) {
        const s = getComputedStyle(padre)
        const conFondo = s.backgroundColor !== 'rgba(0, 0, 0, 0)'
        const conBorde = s.borderTopWidth !== '0px' || s.borderLeftWidth !== '0px'
        if (conFondo || conBorde) {
          const r = padre.getBoundingClientRect()
          return {
            selector: selector(padre),
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
          }
        }
        padre = padre.parentElement
      }
      return null
    }

    /** §2.5.8 exime al objetivo «en línea» dentro de una frase o bloque de texto. */
    const enLineaEnTexto = (el: Element): boolean => {
      if (!getComputedStyle(el).display.startsWith('inline')) return false
      const padre = el.parentElement
      if (padre === null) return false
      return (padre.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 3
    }

    const objetivosPequenos: Objetivo[] = interactivos
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width < 24 || r.height < 24
      })
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          selector: selector(el),
          nombre: nombreAccesible(el),
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          envoltorio: envoltorioVisible(el),
          exencionInline: enLineaEnTexto(el),
        }
      })
      .slice(0, TOPE)

    /* ── Alineación de los bordes izquierdos ───────────────────────────────
     * Solo en contenedores que apilan en vertical (`block` / `flow-root`): en
     * una fila flex los hijos comparten el borde superior, no el izquierdo, y
     * medir ahí produciría un hallazgo por cada fila de la pantalla. */
    const desalineaciones: Desalineacion[] = []
    const contenedores = Array.from(
      document.querySelectorAll('main, section, article, header, form, [class*="card"]'),
    ).filter(pintado)
    for (const contenedor of contenedores) {
      const display = getComputedStyle(contenedor).display
      if (display !== 'block' && display !== 'flow-root') continue
      const hijos = Array.from(contenedor.children).filter(pintado)
      if (hijos.length < 2) continue
      const porIzquierda = new Map<number, Element[]>()
      for (const hijo of hijos) {
        const izq = Math.round(hijo.getBoundingClientRect().left * 2) / 2
        const grupo = porIzquierda.get(izq)
        if (grupo === undefined) porIzquierda.set(izq, [hijo])
        else grupo.push(hijo)
      }
      const izquierdas = [...porIzquierda.keys()].sort((a, b) => a - b)
      for (let i = 0; i < izquierdas.length - 1; i += 1) {
        const a = izquierdas[i]
        const b = izquierdas[i + 1]
        if (a === undefined || b === undefined) continue
        const diferencia = Math.round((b - a) * 10) / 10
        if (diferencia < 1 || diferencia > 6) continue
        const ejemplos = [...(porIzquierda.get(a) ?? []), ...(porIzquierda.get(b) ?? [])]
          .slice(0, 4)
          .map(selector)
        desalineaciones.push({
          contenedor: selector(contenedor),
          izquierdas: [a, b],
          diferencia,
          ejemplos,
        })
      }
      if (desalineaciones.length >= TOPE) break
    }

    /* ── Espaciado fuera de la escala de `tokens.css` ──────────────────── */
    const propiedades = [
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'rowGap',
      'columnGap',
    ] as const
    const acumulado = new Map<string, { propiedad: string; valor: number; n: number; ej: string }>()
    for (const el of visibles.slice(0, 2000)) {
      const s = getComputedStyle(el)
      for (const propiedad of propiedades) {
        const bruto = s[propiedad]
        if (typeof bruto !== 'string' || !bruto.endsWith('px')) continue
        const valor = Math.round(Number(bruto.slice(0, -2)) * 100) / 100
        if (!Number.isFinite(valor) || valor === 0 || permitidos.has(valor)) continue
        const clave = `${propiedad}:${valor}`
        const previo = acumulado.get(clave)
        if (previo === undefined) {
          acumulado.set(clave, { propiedad, valor, n: 1, ej: selector(el) })
        } else {
          previo.n += 1
        }
      }
    }
    const espaciadoFueraDeEscala: Espaciado[] = [...acumulado.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, TOPE)
      .map((e) => ({ propiedad: e.propiedad, valor: e.valor, ocurrencias: e.n, ejemplo: e.ej }))

    /* ── Texto recortado ───────────────────────────────────────────────── */
    const conTexto = visibles.filter((el) => {
      if (el.children.length > 0) return false
      const texto = (el.textContent ?? '').trim()
      return texto !== ''
    })
    const textoTruncado: Truncado[] = []
    const textoDesbordadoSinElipsis: Truncado[] = []
    for (const el of conTexto) {
      if (el.scrollWidth <= el.clientWidth + 1) continue
      const conElipsis = getComputedStyle(el).textOverflow === 'ellipsis'
      const entrada: Truncado = {
        selector: selector(el),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        conElipsis,
        texto: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
      }
      if (conElipsis) {
        if (textoTruncado.length < TOPE) textoTruncado.push(entrada)
      } else if (textoDesbordadoSinElipsis.length < TOPE) {
        textoDesbordadoSinElipsis.push(entrada)
      }
    }

    /* ── Solapamientos entre hermanos ──────────────────────────────────── */
    const solapamientos: Solape[] = []
    const enFlujo = (el: Element): boolean => {
      const s = getComputedStyle(el)
      if (s.position === 'absolute' || s.position === 'fixed' || s.position === 'sticky') {
        return false
      }
      return s.display !== 'inline'
    }
    const padres = new Set(visibles.map((el) => el.parentElement).filter((p) => p !== null))
    for (const padre of padres) {
      const hermanos = Array.from(padre.children).filter((el) => pintado(el) && enFlujo(el))
      if (hermanos.length < 2 || hermanos.length > 40) continue
      for (let i = 0; i < hermanos.length; i += 1) {
        for (let j = i + 1; j < hermanos.length; j += 1) {
          const a = hermanos[i]
          const b = hermanos[j]
          if (a === undefined || b === undefined) continue
          const ra = a.getBoundingClientRect()
          const rb = b.getBoundingClientRect()
          const solapeX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
          const solapeY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
          if (solapeX <= 2 || solapeY <= 2) continue
          solapamientos.push({
            a: selector(a),
            b: selector(b),
            solapeX: Math.round(solapeX * 10) / 10,
            solapeY: Math.round(solapeY * 10) / 10,
          })
        }
      }
      if (solapamientos.length >= TOPE) break
    }

    /* ── Imágenes ──────────────────────────────────────────────────────── */
    const imagenes = Array.from(document.querySelectorAll('img'))
    const imagenesRotas: ImagenRota[] = imagenes
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => ({ selector: selector(img), src: img.currentSrc || img.src }))
      .slice(0, TOPE)
    const imagenesDeformadas: ImagenDeformada[] = []
    for (const img of imagenes) {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) continue
      const r = img.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) continue
      const relacionNatural = img.naturalWidth / img.naturalHeight
      const relacionPintada = r.width / r.height
      const desviacion = Math.abs(relacionPintada - relacionNatural) / relacionNatural
      if (desviacion <= 0.1) continue
      imagenesDeformadas.push({
        selector: selector(img),
        src: img.currentSrc || img.src,
        relacionNatural: Math.round(relacionNatural * 1000) / 1000,
        relacionPintada: Math.round(relacionPintada * 1000) / 1000,
        desviacion: Math.round(desviacion * 1000) / 1000,
      })
    }

    return {
      documento: {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: ancho,
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        desbordaHorizontal: document.documentElement.scrollWidth > ancho,
      },
      culpablesDeDesborde,
      scrollers: {
        visibles: desplazables.filter(alcanzable).map(selector),
        fueraDePantalla: desplazables.filter((el) => !alcanzable(el)).map(selector),
      },
      objetivosPequenos,
      desalineaciones: desalineaciones.slice(0, TOPE),
      espaciadoFueraDeEscala,
      textoTruncado,
      textoDesbordadoSinElipsis,
      solapamientos: solapamientos.slice(0, TOPE),
      imagenesRotas,
      imagenesDeformadas: imagenesDeformadas.slice(0, TOPE),
      conteos: {
        elementosPintados: visibles.length,
        objetivosEvaluados: interactivos.length,
        titulos: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        h1: document.querySelectorAll('h1').length,
        landmarks: document.querySelectorAll('main, nav, header, footer, aside, [role="main"]')
          .length,
      },
    }
  }, escala)
}
