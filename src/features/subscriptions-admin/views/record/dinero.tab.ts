import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/dinero` — <b>devengado · facturado · cobrado</b>
 * (§3.5 y §4.4.2, tarea W2-E).
 *
 * <p>Los cinco campos son los que W2-A dejó acordados para que las cinco
 * instancias no tuvieran que negociarlos: `dinero`, `order` 5 y el `routeName`
 * con la convención `subscription-record-<segmento>`.
 *
 * <p><b>Este `segment` tiene consumidores desde antes de existir</b>, y por eso no
 * es negociable: `SubscriptionStatusBanner` busca la pestaña `dinero` para ofrecer
 * «Registrar pago» en las seis sub-vistas cuando la cuenta está vencida, y
 * `AmendmentEntry` enlaza aquí con `?otrosi=` para que el prorrateo de un otrosí
 * se pueda leer con su fracción de días —«18 de 31»—, que es la única forma de
 * reconstruirlo. Mientras el fichero no existía, los dos pintaban texto sin enlace
 * en vez de dejar una ruta rota.
 *
 * <p>Este fichero es todo lo que hace falta para que la pestaña exista: el módulo
 * de rutas descubre los `*.tab.ts` con `import.meta.glob` y la coloca en la
 * posición que diga `order`. No se ha editado `router/index.ts`, ni el módulo de
 * rutas, ni la barra de pestañas, ni el armazón.
 *
 * <p>`component` va como función para que el SFC siga cargándose de forma
 * diferida.
 */
const dineroTab: SubscriptionRecordTab = {
  segment: 'dinero',
  routeName: 'subscription-record-dinero',
  label: 'Dinero',
  order: 5,
  component: () => import('./SubscriptionMoneyView.vue'),
}

export default dineroTab
