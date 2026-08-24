import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/acceso` — <b>lo que la empresa puede usar ahora
 * mismo</b> (§4.4.2, tarea W2-D).
 *
 * <p>Los cinco campos son los que W2-A dejó acordados para que las cinco
 * instancias no tuvieran que negociarlos: `acceso`, `order` 4 y el `routeName`
 * con la convención `subscription-record-<segmento>`.
 *
 * <p>Este fichero es todo lo que hace falta para que la pestaña exista: el módulo
 * de rutas descubre los `*.tab.ts` con `import.meta.glob` y la coloca en la
 * posición que diga `order`. No se ha editado `router/index.ts`, ni el módulo de
 * rutas, ni la barra de pestañas, ni el armazón.
 *
 * <p>`component` va como función para que el SFC siga cargándose de forma
 * diferida.
 */
const accesoTab: SubscriptionRecordTab = {
  segment: 'acceso',
  routeName: 'subscription-record-acceso',
  label: 'Acceso',
  order: 4,
  component: () => import('./SubscriptionAccessView.vue'),
}

export default accesoTab
