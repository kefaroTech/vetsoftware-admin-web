import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useCompaniesStore } from '../stores/companies.store'
import { companiesApi } from '../api/companies.api'
import { useToast } from '@/composables/useToast'
import { useServerPaged } from '@/composables/useServerPaged'
import type {
  CompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../types/companies.types'

/**
 * @param initialQuery término con el que arranca el listado, leído de la URL por
 * la vista. Tiene que llegar ANTES de crear `useServerPaged`: si se asignara
 * después, el `watch` del término dispararía una carga de la página 1 que
 * abortaría la de la página que pedía el enlace, y un `?q=milo&page=2`
 * compartido aterrizaría siempre en la primera página.
 */
export function useCompanies(initialQuery = '') {
  const store = useCompaniesStore()
  const { selected, loadingSelected } = storeToRefs(store)
  const { success, errorFrom } = useToast()

  /** Término vigente. Lo escribe la vista y lo vigila `useServerPaged`. */
  const query = ref(initialQuery)

  /**
   * Empresas es el ÚNICO listado servido de la consola. La decisión de a qué
   * endpoint ir vive AQUÍ, en una línea, y no se filtra a la vista: término
   * vacío es el listado, término escrito es la búsqueda.
   *
   * `debounceMs: 0` porque el rebote de 300 ms ya lo hace `AppListSearch` antes
   * de emitir el término; encadenar los dos daría 600 ms y el usuario notaría el
   * retraso. Lo que sí se aprovecha de `useServerPaged` es el `AbortController`:
   * cada término nuevo cancela la petición anterior, de modo que una respuesta
   * lenta de «mil» no puede llegar después de la de «milo» y pisarla.
   */
  const paged = useServerPaged<CompanyResponse>(
    (page, pageSize, q, signal) =>
      q
        ? companiesApi.search(q, page, pageSize, signal)
        : companiesApi.listAll(page, pageSize, signal),
    { query, debounceMs: 0 },
  )

  async function fetchById(id: number) {
    store.setLoadingSelected(true)
    try {
      const data = await companiesApi.findById(id)
      store.setSelected(data)
    } catch (e) {
      errorFrom('Empresa no encontrada', e)
    } finally {
      store.setLoadingSelected(false)
    }
  }

  async function create(payload: CreateCompanyRequest) {
    try {
      const data = await companiesApi.create(payload)
      success('Empresa creada exitosamente')
      // Con la lista paginada ya no vale con empujar el elemento al array: la
      // empresa nueva puede caer en otra página, o fuera de la búsqueda vigente.
      await paged.reload()
      return data
    } catch (e) {
      errorFrom('Error al crear la empresa', e, 'No se pudo crear la empresa.')
      throw e
    }
  }

  async function update(id: number, payload: UpdateCompanyRequest) {
    try {
      const data = await companiesApi.update(id, payload)
      store.setSelected(data)
      success('Empresa actualizada')
      return data
    } catch (e) {
      errorFrom('Error al actualizar la empresa', e, 'No se pudo actualizar la empresa.')
      throw e
    }
  }

  async function remove(id: number) {
    try {
      await companiesApi.remove(id)
      success('Empresa eliminada')
      // Si era la última fila de la página, quedarse en ella enseñaría un vacío
      // que no lo es: se retrocede una.
      const seQuedaVacia = paged.items.value.length === 1 && paged.page.value > 1
      await paged.goTo(seQuedaVacia ? paged.page.value - 1 : paged.page.value)
    } catch (e) {
      errorFrom('Error al eliminar la empresa', e, 'No se pudo eliminar la empresa.')
      throw e
    }
  }

  return {
    companies: paged.items,
    /** 1-based, que es lo que ve el usuario y lo que viaja en la URL. */
    page: paged.page,
    pageSize: paged.pageSize,
    total: paged.total,
    pageCount: paged.pageCount,
    loading: paged.loading,
    error: paged.error,
    errorTraceId: paged.errorTraceId,
    query,
    reload: paged.reload,
    goTo: paged.goTo,
    selected,
    loadingSelected,
    fetchById,
    create,
    update,
    remove,
  }
}
