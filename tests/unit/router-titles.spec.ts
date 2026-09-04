import { describe, expect, it } from 'vitest'
import router from '@/router'

/**
 * Toda pantalla de la consola declara su `meta.title`.
 *
 * <p><b>Qué se rompe sin esto.</b> El `afterEach` de `router/index.ts` escribe
 * `document.title` a partir de `meta.title`; sin él la pestaña se queda en
 * «Lumbre» a secas. Con siete pestañas abiertas —que es como se trabaja en una
 * clínica: la ficha, la agenda, la caja— todas se llaman igual, y el historial
 * y los marcadores del navegador guardan ese mismo literal. El operador no
 * puede volver a lo que estaba mirando.
 *
 * <p><b>Por qué recorre el router y no una lista.</b> Los títulos viven
 * repartidos en 32 ficheros de rutas y la pantalla nueva la escribe siempre otra
 * tarea. Una lista escrita a mano envejece el día que alguien añade una ruta;
 * recorrer `getRoutes()` hace que sea la ruta nueva la que rompe el build.
 *
 * <p><b>Qué queda fuera, y por qué.</b> Los registros con `redirect` no pintan
 * nada: su `afterEach` corre ya sobre el destino. Exigirles título daría una
 * prueba roja sin defecto detrás.
 */

/** Descripción legible de una ruta, para que el fallo diga cuál falta. */
function identificar(nombre: unknown, path: string): string {
  return `${String(nombre)} (${path})`
}

describe('los títulos de página del router', () => {
  const pantallas = router
    .getRoutes()
    .filter((r) => typeof r.name === 'string' && r.redirect === undefined)

  it('hay pantallas que auditar', () => {
    expect(pantallas.length).toBeGreaterThan(50)
  })

  it('cada ruta nombrada y sin redirect declara meta.title', () => {
    const sinTitulo = pantallas
      .filter((r) => {
        const titulo = r.meta?.title
        return typeof titulo !== 'string' || titulo.trim() === ''
      })
      .map((r) => identificar(r.name, r.path))

    expect(sinTitulo, 'rutas sin `meta.title`: su pestaña se llamaría solo «Lumbre»').toEqual([])
  })

  it('ningún título trae ya el nombre de la aplicación dentro', () => {
    // El sufijo « · Lumbre» lo pone el `afterEach`. Un literal que ya lo
    // incluya lo muestra dos veces, y eso no lo detecta ningún tipo.
    const duplicados = pantallas
      .filter((r) => String(r.meta?.title ?? '').includes('Lumbre'))
      .map((r) => identificar(r.name, r.path))

    expect(duplicados, 'títulos que repetirían «Lumbre» en la pestaña').toEqual([])
  })
})
