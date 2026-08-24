import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/historia` — los otrosíes y la bitácora de
 * estados, en una sola línea de tiempo (§3.3 y §4.4.2, tarea W2-C).
 *
 * <p>Es la sub-vista que hace auditable el modelo entero: sin ella se vería el
 * estado final del contrato pero no la película de cómo se llegó ahí.
 *
 * <p>Copia de `resumen.tab.ts` con los cinco campos cambiados, tal como pide la
 * plantilla: no hay que tocar `router/index.ts`, ni el módulo de rutas, ni la
 * barra de pestañas. El módulo de rutas descubre este fichero y la pestaña
 * aparece sola en la posición que dice `order`.
 */
const historiaTab: SubscriptionRecordTab = {
  segment: 'historia',
  routeName: 'subscription-record-historia',
  label: 'Historia',
  order: 3,
  component: () => import('./SubscriptionHistoryView.vue'),
}

export default historiaTab
