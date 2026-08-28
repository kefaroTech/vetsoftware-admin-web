import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/cupos` — los cupos de la empresa (§I4, que es la misma pantalla que §B8).
 *
 * <p><b>Construida.</b> Ya no declara `pending`: la pantalla existe y vive en
 * `src/features/company-limits/views/CompanyLimitsView.vue`, con su store, su
 * composable y su cliente de API. Este fichero es lo único que se ha tocado del
 * armazón —cambiar el `component` y borrar la marca—, que es exactamente lo que
 * `resumen.tab.ts` dejó dicho: ni `router/index.ts`, ni el módulo de rutas, ni la
 * barra de pestañas, ni `CompanyRecordLayout.vue`.
 *
 * <p>La vista está partida en cuatro ficheros desde el primer commit —textos,
 * tarjeta de cupo, tabla de bitácora y modal de corrección— porque esta pantalla
 * estaba marcada como candidata a pasarse del techo de 500 líneas por SFC.
 *
 * <p>`component` sigue siendo una función para que el SFC se cargue de forma
 * diferida: el módulo de rutas importa estos metadatos de golpe, pero no las
 * vistas.
 */
const cuposTab: CompanyRecordTab = {
  segment: 'cupos',
  routeName: 'company-record-cupos',
  label: 'Cupos',
  order: 3,
  component: () => import('@/features/company-limits/views/CompanyLimitsView.vue'),
}

export default cuposTab
