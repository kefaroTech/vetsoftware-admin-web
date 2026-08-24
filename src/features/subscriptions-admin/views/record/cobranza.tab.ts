import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/cobranza` — el expediente de mora de <b>este</b>
 * contrato (§3.3 y §4.4.2, tarea W2-F).
 *
 * <p>Es la sexta y última sub-vista, y la que responde la pregunta que llega por
 * teléfono: «¿se le avisó antes de restringirle la cuenta?». La Cobranza global
 * de `/cobranza/mora` no puede responderla —allí cada fila es de una empresa
 * distinta y el orden es el contrario, del más reciente al más antiguo—, y por
 * eso esta existe.
 *
 * <p>Copia de `resumen.tab.ts` con los cinco campos cambiados y sus valores ya
 * acordados: no se ha tocado `router/index.ts`, ni el módulo de rutas, ni la
 * barra de pestañas, ni el armazón. El módulo de rutas descubre este fichero con
 * `import.meta.glob` y la pestaña aparece sola en la posición que dice `order`.
 *
 * <p><b>La ruta lleva dos parámetros, `companyId` e `id`.</b> §2.2 de la
 * especificación escribe `/suscripciones/:id/*` y está desactualizada (issue
 * #159): los dos endpoints de esta sub-vista resuelven la empresa con
 * `authz.currentCompanyId()`, así que hay que saberla antes de la primera
 * petición. Quien construya un enlace aquí con `params: { id }` a secas verá
 * fallar `router.resolve`.
 */
const cobranzaTab: SubscriptionRecordTab = {
  segment: 'cobranza',
  routeName: 'subscription-record-cobranza',
  label: 'Cobranza',
  order: 6,
  component: () => import('./SubscriptionDunningView.vue'),
}

export default cobranzaTab
