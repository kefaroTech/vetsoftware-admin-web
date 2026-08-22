import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompanyResponse } from '../types/companies.types'

/**
 * Store de empresas.
 *
 * Guarda SOLO la empresa seleccionada, que es lo que se comparte entre
 * pantallas (la ficha de detalle y quien navegue a ella). El listado ya no vive
 * aquí: VUE-06 lo pasó a paginación servida y su estado —página, total,
 * carga, error y el aborto de la petición en vuelo— lo lleva `useServerPaged`,
 * gemelo TR-02 portado desde el front del tenant. Es estado por pantalla, no
 * estado compartido, así que duplicarlo en un store solo habría añadido una
 * segunda fuente de verdad que hay que mantener sincronizada.
 *
 * Por eso este store tampoco usa `createCatalogStore`: esa factoría guarda una
 * lista plana y aquí no hay ninguna que guardar.
 */
export const useCompaniesStore = defineStore('companies', () => {
  const selected = ref<CompanyResponse | null>(null)
  const loadingSelected = ref(false)

  function setSelected(value: CompanyResponse | null) {
    selected.value = value
  }
  function setLoadingSelected(value: boolean) {
    loadingSelected.value = value
  }

  return { selected, loadingSelected, setSelected, setLoadingSelected }
})
