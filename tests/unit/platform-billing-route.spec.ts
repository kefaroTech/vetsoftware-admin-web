import { describe, expect, it } from 'vitest'
import router from '@/router'
import { platformBillingRoutes } from '@/router/routes/platform-billing.routes'
import { isParent, navGroups, type NavLeaf } from '@/components/layout/sidebar-nav'

/**
 * <b>Una entrada de menú que lleva a una ruta que no existe.</b>
 *
 * <p>`sidebar-nav.ts` publicaba «Facturación de plataforma» apuntando a
 * `/configuracion/facturacion`, mientras que en `router/index.ts` tanto el
 * import como el `...spread` de `platformBillingRoutes` estaban comentados. La
 * pantalla estaba construida entera —vista, dos componentes, store, composables y
 * cliente de API— y era literalmente inalcanzable: el operador pulsaba la fila y
 * el router no resolvía nada.
 *
 * <p><b>Por qué la guarda no se queda en esa fila.</b> Registrar una ruta y
 * publicar su entrada de menú son dos ficheros distintos, los tocan tareas
 * distintas y nada los ata. El defecto no es de esta pantalla: es del reparto. La
 * prueba recorre <b>todas</b> las hojas del menú y exige que cada `path` resuelva
 * contra el router real, así que la próxima entrada publicada sin registrar rompe
 * el build en vez de romperle el día a alguien.
 *
 * <p>Lo que NO mide: que la vista pinte bien. Eso es `platform-billing-config.spec.ts`
 * y la regresión visual. Aquí solo se afirma que la puerta abre.
 */

/** Las hojas del menú, aplanadas: las de primer nivel y las de dentro de un grupo. */
function navLeaves(): NavLeaf[] {
  return navGroups.flatMap((group) =>
    group.items.flatMap((item) => (isParent(item) ? item.children : [item])),
  )
}

describe('la ruta de «Facturación de plataforma» está registrada', () => {
  it('resuelve /configuracion/facturacion a la ruta con nombre platform-billing-config', () => {
    const resolved = router.resolve('/configuracion/facturacion')

    expect(resolved.matched.length).toBeGreaterThan(0)
    expect(resolved.name).toBe('platform-billing-config')
  })

  it('el registro del router es el mismo objeto que declara platform-billing.routes.ts', () => {
    // Si alguien vuelve a comentar el `...spread` y deja una ruta suelta con el
    // mismo path escrita a mano, esto lo dice.
    const declared = platformBillingRoutes[0]
    expect(declared).toBeDefined()

    const registered = router.getRoutes().find((r) => r.name === declared!.name)
    expect(registered).toBeDefined()
    expect(registered!.path).toBe(declared!.path)
  })

  it('carga la vista sin reventar el import perezoso', async () => {
    const record = router.getRoutes().find((r) => r.name === 'platform-billing-config')
    const loader = record!.components?.default as () => Promise<unknown>

    expect(typeof loader).toBe('function')
    const mod = (await loader()) as { default?: unknown }
    expect(mod.default).toBeTruthy()
  })
})

/**
 * <b>El otro caso, que este barrido destapó al escribirse.</b> «Empleados»
 * (`sidebar-nav.ts:58`) apunta a `/empleados` y en `src/router/routes/` no existe
 * ningún fichero de rutas de empleados: no es una ruta comentada como la de
 * facturación, es una pantalla que todavía no está escrita. No se arregla aquí
 * —construirla es trabajo de un lote posterior— pero tampoco se tapa: queda
 * declarada, con nombre, para que el barrido siga sujetando a las demás.
 *
 * <p>La lista se comprueba en los dos sentidos: una entrada que se registre y no
 * se retire de aquí también rompe la prueba, así que el pendiente no puede
 * quedarse escrito para siempre.
 */
const PENDIENTES_SIN_PANTALLA = ['/empleados']

describe('ninguna entrada del menú lleva a una ruta que no existe', () => {
  const leaves = navLeaves()
  const resuelve = (path: string) => router.resolve(path).matched.length > 0

  it('el menú tiene entradas que comprobar', () => {
    expect(leaves.length).toBeGreaterThan(0)
  })

  it.each(
    leaves
      .filter((leaf) => !PENDIENTES_SIN_PANTALLA.includes(leaf.path))
      .map((leaf) => [leaf.label, leaf.path] as const),
  )('«%s» → %s resuelve contra el router', (label, path) => {
    expect(resuelve(path), `«${label}» apunta a ${path} y no hay ruta que lo atienda`).toBe(true)
  })

  it.each(PENDIENTES_SIN_PANTALLA)(
    '%s sigue siendo un pendiente declarado: si ya tiene pantalla, retíralo de la lista',
    (path) => {
      expect(resuelve(path)).toBe(false)
    },
  )

  it('todo pendiente declarado está de verdad publicado en el menú', () => {
    const paths = leaves.map((leaf) => leaf.path)
    for (const pendiente of PENDIENTES_SIN_PANTALLA) expect(paths).toContain(pendiente)
  })
})
