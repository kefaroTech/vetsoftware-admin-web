import type { CompanyRecordTab } from '../../types/company-record.types'

/**
 * `/empresas/:id/datos` — <b>el formulario de siempre</b> (§I3).
 *
 * <p>No nace con este lote: es `CompanyDetailView.vue`, la vista suelta que era
 * `/empresas/:id` hasta ahora, mudada bajo el armazón sin tocar el formulario.
 * Ver la cabecera de `CompanyDataView.vue` para las tres diferencias que la
 * mudanza sí impone.
 *
 * <p>Es la segunda de la barra y no la primera a propósito: quien abre el
 * expediente de una clínica desde un ticket busca saber qué le pasa, no editarle
 * la dirección.
 */
const datosTab: CompanyRecordTab = {
  segment: 'datos',
  routeName: 'company-record-datos',
  label: 'Datos',
  order: 2,
  component: () => import('./CompanyDataView.vue'),
}

export default datosTab
