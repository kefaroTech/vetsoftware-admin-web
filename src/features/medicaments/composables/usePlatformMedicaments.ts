import { ref } from 'vue'
import { medicamentsApi } from '../api/medicaments.api'
import { useServerPaged } from '@/composables/useServerPaged'
import type { MedicamentResponse } from '../types/medicaments.types'

/**
 * El listado MIXTO de `GET /medicaments`: el vademécum global más lo que cada
 * empresa da de alta por su cuenta.
 *
 * **Solo lectura, y no expone ni una mutación.** No es una omisión: es la razón
 * de ser de la pantalla que lo consume. Sobre una fila de empresa no hay nada
 * legítimo que hacer desde aquí —`medicaments` no tiene columna de firma de
 * plataforma, así que el cambio le llegaría a la clínica sin rastro de quién lo
 * hizo—, y sobre una fila global tampoco, porque esa misma fila ya es editable
 * en la pantalla principal y duplicar el afordance crea dos caminos a la misma
 * mutación.
 *
 * Mismo mecanismo de búsqueda que el catálogo global: servida por `q`, con el
 * mismo rebote y el mismo aborto de la petición en vuelo, para que el mismo
 * término dé un resultado explicable en las dos pantallas.
 */
export function usePlatformMedicaments(initialQuery = '') {
  /** Término vigente. Lo escribe la vista y lo vigila `useServerPaged`. */
  const query = ref(initialQuery)

  // `debounceMs: 0`: el rebote de 300 ms ya lo pone `AppListSearch`. Ver
  // `useMedicaments` y `useCompanies` para el porqué de no encadenar los dos.
  const paged = useServerPaged<MedicamentResponse>(
    (page, pageSize, q, signal) => medicamentsApi.listPlatform(page, pageSize, q, signal),
    { query, debounceMs: 0 },
  )

  return {
    medicaments: paged.items,
    /** 1-based, que es lo que ve el usuario y lo que viaja en la URL. */
    page: paged.page,
    pageSize: paged.pageSize,
    total: paged.total,
    pageCount: paged.pageCount,
    loading: paged.loading,
    error: paged.error,
    errorTraceId: paged.errorTraceId,
    query,
    goTo: paged.goTo,
    reload: paged.reload,
  }
}
