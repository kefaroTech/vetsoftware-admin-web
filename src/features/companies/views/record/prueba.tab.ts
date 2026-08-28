import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/prueba` — la ventana de prueba (§I5, que es la misma pantalla que §C2).
 *
 * <p><b>Construida.</b> Ya no declara `pending`: la pantalla existe y vive en
 * `src/features/trials/views/CompanyTrialView.vue`, con su propio store, su
 * composable y su cliente de API. Este fichero es lo único que se ha tocado del
 * armazón —cambiar el `component` y borrar la marca—, que es exactamente lo que
 * `resumen.tab.ts` dejó dicho: ni `router/index.ts`, ni el módulo de rutas, ni la
 * barra de pestañas, ni `CompanyRecordLayout.vue`.
 *
 * <p>`component` sigue siendo una función para que el SFC se cargue de forma
 * diferida: el módulo de rutas importa estos metadatos de golpe, pero no las
 * vistas.
 */
const pruebaTab: CompanyRecordTab = {
  segment: 'prueba',
  routeName: 'company-record-prueba',
  label: 'Prueba',
  order: 4,
  component: () => import('@/features/trials/views/CompanyTrialView.vue'),
}

export default pruebaTab
