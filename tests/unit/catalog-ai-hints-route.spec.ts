import { describe, expect, it } from 'vitest'
import { catalogAiHintsRoutes } from '@/router/routes/catalog-ai-hints.routes'
import { navGroups, isParent, type NavLeaf } from '@/components/layout/sidebar-nav'

/**
 * La entrada del menú y las dos rutas, atadas entre sí.
 *
 * <p>`AppSidebar.isAvailable` decide si pintar una hoja del menú comprobando que
 * el router conozca su `path`: una entrada cuya ruta no existe <b>no se pinta</b>,
 * en silencio. Así que un `path` mal escrito aquí no da error, da una entrada
 * que desaparece — y nadie se entera hasta que alguien pregunta dónde está la
 * pantalla. Por eso se afirman los dos lados a la vez.
 */

function hojas(): NavLeaf[] {
  return navGroups.flatMap((group) =>
    group.items.flatMap((item) => (isParent(item) ? item.children : [item])),
  )
}

describe('las rutas de las pistas del asistente', () => {
  it('cuelgan de `/asistente/`, con la del listado y la de la ficha', () => {
    expect(catalogAiHintsRoutes.map((r) => r.path)).toEqual([
      '/asistente/pistas',
      '/asistente/pistas/:catalogItemId',
    ])
  })

  it('el parámetro es `catalogItemId` y NUNCA `id`', () => {
    // El recurso es «la pista vigente de un artículo» y su identidad es el
    // artículo. Un parámetro llamado `id` invitaría a pasarle el `id` de una
    // revisión, y la ficha cargaría otra cosa sin fallar.
    const ficha = catalogAiHintsRoutes[1]
    expect(ficha?.path).toContain(':catalogItemId')
    expect(ficha?.path).not.toMatch(/:id\b/)
  })

  it('las dos se cargan de forma diferida', () => {
    for (const ruta of catalogAiHintsRoutes) {
      expect(typeof ruta.component).toBe('function')
    }
  })

  it('ninguna declara `meta.permission`: los seis puertos son solo `hasRole(SYSTEM)`', () => {
    for (const ruta of catalogAiHintsRoutes) {
      expect(ruta.meta?.permission).toBeUndefined()
    }
  })
})

describe('la entrada del menú', () => {
  it('existe y apunta exactamente al `path` de la ruta del listado', () => {
    const entrada = hojas().find((leaf) => leaf.label === 'Pistas del asistente')
    expect(entrada, 'el menú perdió la entrada de las pistas del asistente').toBeDefined()
    expect(entrada?.path).toBe(catalogAiHintsRoutes[0]?.path)
  })

  it('va justo antes de «Supresión de datos»: son el mismo eslabón', () => {
    // Las pistas gobiernan lo que el asistente hace todos los días; la supresión
    // es un deber legal que se ejerce a petición. Ese es el orden.
    const etiquetas = hojas().map((leaf) => leaf.label)
    const pistas = etiquetas.indexOf('Pistas del asistente')
    const supresion = etiquetas.indexOf('Supresión de datos')

    expect(pistas).toBeGreaterThanOrEqual(0)
    expect(supresion).toBe(pistas + 1)
  })

  it('vive en el grupo Suscripciones, entre el catálogo y la oferta', () => {
    const grupo = navGroups.find((g) => g.title === 'Suscripciones')
    const etiquetas = (grupo?.items ?? []).flatMap((item) =>
      isParent(item) ? item.children.map((c) => c.label) : [item.label],
    )
    expect(etiquetas.indexOf('Pistas del asistente')).toBeGreaterThan(
      etiquetas.indexOf('Catálogo y precios'),
    )
    expect(etiquetas.indexOf('Pistas del asistente')).toBeLessThan(
      etiquetas.indexOf('Cotizaciones'),
    )
  })

  it('no lleva contador ni rótulo «Nuevo»', () => {
    // Un «Sin pista (3)» exige una petición extra en cada navegación o enseña un
    // número viejo; el recuento vive donde es exacto, en el pie del paginador.
    const entrada = hojas().find((leaf) => leaf.label === 'Pistas del asistente')
    expect(entrada?.label).toBe('Pistas del asistente')
    expect(Object.keys(entrada ?? {})).toEqual(expect.not.arrayContaining(['count', 'badge']))
  })
})
