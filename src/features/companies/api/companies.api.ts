import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  CompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../types/companies.types'

export const companiesApi = {
  /**
   * VUE-06: `GET /companies` devuelve una PÁGINA, no el censo.
   *
   * Este método declaraba a mano `http.get<CompanyResponse[]>` — un tipo que
   * TypeScript no tenía forma de discutir porque nadie lo contrastaba con el
   * servidor, y que llevaba tiempo siendo FALSO: el controller responde
   * `PageResponse<CompanyResponse>`. Con el backend ya desplegado, `data` era
   * un objeto `{content, page, …}`, `companies.length` daba `undefined`, el
   * estado vacío no se pintaba nunca y el `v-for` iteraba las propiedades del
   * sobre de paginación. La consola de plataforma no listaba empresas y ningún
   * gate lo veía.
   *
   * El `signal` lo pone `useServerPaged`: cada término nuevo aborta la petición
   * en vuelo, para que la respuesta de «mil» no llegue después de la de «milo»
   * y la pise.
   */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CompanyResponse>> {
    const { data } = await http.get<PageResponse<CompanyResponse>>('/companies', {
      params: { page, pageSize },
      signal,
    })
    return data
  },
  /**
   * Búsqueda por nombre o identificador fiscal, servida por el backend.
   *
   * Es obligatorio que sea servida y no en cliente: la respuesta es una página,
   * así que filtrar en memoria miraría solo las veinte filas visibles y
   * encontraría menos de lo que hay. Va sin velo global porque es una búsqueda
   * con rebote y bloquear la pantalla en cada tecla sería invasivo.
   */
  async search(
    query: string,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<CompanyResponse>> {
    const { data } = await http.get<PageResponse<CompanyResponse>>('/companies/search', {
      params: { q: query, page, pageSize },
      skipGlobalLoader: true,
      signal,
    })
    return data
  },
  async findById(id: number): Promise<CompanyResponse> {
    const { data } = await http.get<CompanyResponse>(`/companies/${id}`)
    return data
  },
  async create(payload: CreateCompanyRequest): Promise<CompanyResponse> {
    const { data } = await http.post<CompanyResponse>('/companies', payload)
    return data
  },
  async update(id: number, payload: UpdateCompanyRequest): Promise<CompanyResponse> {
    const { data } = await http.put<CompanyResponse>(`/companies/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/companies/${id}`)
  },
  /**
   * Inverso de `remove`: saca del archivo una empresa dada de baja por error.
   *
   * **Por qué `enable` y no `restore`/`reactivate`.** El vocabulario fijo de
   * `CLAUDE.md` (`listAll`, `findById`, `create`, `update`, `remove`,
   * `listBy<X>`, `search`) no nombra el inverso de `remove`, pero esta consola
   * ya lo tenía resuelto: `catalogItemsApi.enable`, `priceListsApi.enable` y
   * `medicamentsApi.enable` son exactamente esta operación con exactamente este
   * nombre, y el contrato la publica como `/{recurso}/{id}/enable` en las 29
   * rutas hermanas. Llamarla aquí `restore` habría inventado un cuarto nombre
   * para la misma cosa y roto la lectura en paralelo cliente↔contrato.
   *
   * El rótulo de la interfaz **sí** dice «Restaurar», que es la palabra del
   * operador; el cliente habla el idioma del contrato. Es la misma separación
   * que ya hace `medicamentsApi.remove`, cuyo botón se llama «pausar».
   *
   * `PATCH` sin cuerpo: no hay nada que elegir, solo el id de la URL. Devuelve
   * la ficha ya restaurada (`CompanyResponse`), no `void`, porque el backend
   * relee la fila tras el `UPDATE` nativo y con ella viene la `version` nueva.
   *
   * **404 significa dos cosas a la vez**, y las dos son la misma para quien
   * llama: el id no existe, o la empresa ya estaba activa. `ReactivateCompanyService`
   * decide contando filas actualizadas, así que no puede distinguirlas. Ver
   * `useCompanyRestore`, que es donde eso se traduce a palabras.
   */
  async enable(id: number): Promise<CompanyResponse> {
    const { data } = await http.patch<CompanyResponse>(`/companies/${id}/enable`)
    return data
  },
}
