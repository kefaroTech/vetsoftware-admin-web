import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/prueba` — <b>la prueba dentro del contrato</b>
 * (§C2, la otra mitad de §I5).
 *
 * <p>Es la séptima sub-vista del expediente del contrato. Las seis de §4.4.2
 * —resumen, contratado, historia, acceso, dinero, cobranza— cuentan lo que se
 * firmó y lo que se cobra; ninguna cuenta lo que se está probando, y esa es
 * justamente la pregunta que se hace quien mira un contrato en el mes en que
 * vence la prueba: «¿esto ya se factura o todavía es gratis?».
 *
 * <p>Este fichero es todo lo que hace falta para que la pestaña exista: el módulo
 * de rutas descubre los `*.tab.ts` con `import.meta.glob` y la coloca en la
 * posición que diga `order`. No se ha editado `router/index.ts`, ni
 * `subscriptions-admin.routes.ts`, ni la barra de pestañas, ni el armazón.
 *
 * <p>`order` 7 continúa la serie de §4.4.2 sin reordenar ninguna de las seis: una
 * pestaña nueva que se cuela en medio mueve de sitio las que la gente ya tiene
 * memorizadas.
 */
const pruebaTab: SubscriptionRecordTab = {
  segment: 'prueba',
  routeName: 'subscription-record-prueba',
  label: 'Prueba',
  order: 7,
  component: () => import('./SubscriptionTrialView.vue'),
}

export default pruebaTab
