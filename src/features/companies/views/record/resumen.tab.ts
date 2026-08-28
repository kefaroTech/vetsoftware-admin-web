import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/resumen` — la sub-vista por defecto del expediente de empresa
 * (§I2).
 *
 * <p><b>Este fichero es la plantilla de los lotes que cuelgan de W5-A.</b> Para
 * construir una pestaña que hoy está declarada como pendiente se abre su
 * `*.tab.ts`, se le cambia el `component` por el SFC propio, <b>se le borra el
 * `pending`</b>, y se escribe ese SFC al lado. No hay que editar ningún fichero
 * existente —ni `router/index.ts`, ni el módulo de rutas, ni la barra de
 * pestañas, ni el armazón—: el módulo de rutas descubre estos ficheros y la
 * pestaña aparece sola, en la posición que diga `order`.
 *
 * <p>Los diez, con los valores ya acordados aquí para que ningún lote tenga que
 * negociarlos:
 *
 * <pre>
 *   resumen.tab.ts           order  1  «Resumen»          company-record-resumen
 *   datos.tab.ts             order  2  «Datos»            company-record-datos
 *   cupos.tab.ts             order  3  «Cupos»            company-record-cupos
 *   prueba.tab.ts            order  4  «Prueba»           company-record-prueba
 *   cartera.tab.ts           order  5  «Cartera»          company-record-cartera
 *   fiscal.tab.ts            order  6  «Fiscal»           company-record-fiscal
 *   accesos.tab.ts           order  7  «Accesos»          company-record-accesos
 *   datos-personales.tab.ts  order  8  «Datos personales» company-record-datos-personales
 *   archivo.tab.ts           order  9  «Archivo»          company-record-archivo
 *   cesion.tab.ts            order 10  «Cesión»           company-record-cesion
 * </pre>
 *
 * <p>Tres `segment` tienen consumidores desde antes de existir y por eso no son
 * negociables: la tarjeta de cartera del resumen busca `cartera`, la de cupos
 * busca `cupos` y la de prueba busca `prueba`. Mientras el fichero no exista, las
 * tres pintan su texto sin enlace en vez de dejar una ruta rota.
 *
 * <p>`component` va como función para que el SFC siga cargándose de forma
 * diferida: el módulo de rutas importa estos metadatos de golpe, pero no las
 * vistas.
 */
const resumenTab: CompanyRecordTab = {
  segment: 'resumen',
  routeName: 'company-record-resumen',
  label: 'Resumen',
  order: 1,
  component: () => import('./CompanySummaryView.vue'),
}

export default resumenTab
