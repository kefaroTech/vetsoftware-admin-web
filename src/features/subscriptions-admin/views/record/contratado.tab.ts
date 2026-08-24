import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/contratado` — «Lo contratado» (§3.3 · §4.4.2,
 * tarea W2-B).
 *
 * <p>Copiado de `resumen.tab.ts` con los cinco campos cambiados y sus valores ya
 * acordados. No se ha tocado ningún fichero existente para que esta pestaña
 * aparezca: el módulo de rutas descubre estos metadatos con `import.meta.glob` y
 * de ahí salen a la vez la ruta hija y la entrada de la barra.
 *
 * <p><b>La ruta lleva dos parámetros, `companyId` e `id`.</b> §2.2 de la
 * especificación escribe `/suscripciones/:id/*` y está desactualizada (issue
 * #159): `GET /subscriptions/{id}` exige la cabecera `X-Company-Id`, así que la
 * empresa hay que saberla antes de la primera petición y el contrato no ofrece por
 * dónde averiguarla. Quien construya un enlace a esta sub-vista con
 * `params: { id }` a secas verá fallar `router.resolve`.
 *
 * <p>`component` va como función para que el SFC se siga cargando de forma
 * diferida: el módulo de rutas importa estos metadatos de golpe, pero no las
 * vistas.
 */
const contratadoTab: SubscriptionRecordTab = {
  segment: 'contratado',
  routeName: 'subscription-record-contratado',
  label: 'Lo contratado',
  order: 2,
  component: () => import('./SubscriptionItemsView.vue'),
}

export default contratadoTab
