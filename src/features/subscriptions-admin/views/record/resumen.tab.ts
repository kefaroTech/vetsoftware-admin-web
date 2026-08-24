import type { SubscriptionRecordTab } from '../../types/subscription-record.types'

/**
 * `/suscripciones/:companyId/:id/resumen` — la sub-vista por defecto del
 * expediente (§4.4.2).
 *
 * <p><b>Este fichero es la plantilla de W2-B … W2-F.</b> Para añadir una
 * sub-vista se copia tal cual, se cambian los cinco campos y se escribe el SFC al
 * lado. No hay que editar ningún fichero existente —ni `router/index.ts`, ni el
 * módulo de rutas, ni la barra de pestañas—: el módulo de rutas descubre estos
 * ficheros y la pestaña aparece sola, en la posición que diga `order`.
 *
 * <p>Los cinco que faltan, con sus valores ya acordados en §4.4.2 para que las
 * cinco instancias no tengan que negociarlos:
 *
 * <pre>
 *   contratado.tab.ts  order 2  «Lo contratado»  subscription-record-contratado
 *   historia.tab.ts    order 3  «Historia»       subscription-record-historia
 *   acceso.tab.ts      order 4  «Acceso»         subscription-record-acceso
 *   dinero.tab.ts      order 5  «Dinero»         subscription-record-dinero
 *   cobranza.tab.ts    order 6  «Cobranza»       subscription-record-cobranza
 * </pre>
 *
 * <p>El `segment` de «Dinero» tiene además un consumidor: el banner de una cuenta
 * vencida busca la pestaña `dinero` para ofrecer «Registrar pago», y mientras no
 * exista no pinta el botón en vez de dejar un enlace roto.
 *
 * <p>`component` va como función para que el SFC siga cargándose de forma
 * diferida: el módulo de rutas importa estos metadatos de golpe, pero no las
 * vistas.
 */
const resumenTab: SubscriptionRecordTab = {
  segment: 'resumen',
  routeName: 'subscription-record-resumen',
  label: 'Resumen',
  order: 1,
  component: () => import('./SubscriptionSummaryView.vue'),
}

export default resumenTab
