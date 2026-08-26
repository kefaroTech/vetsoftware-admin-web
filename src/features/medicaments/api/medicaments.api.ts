import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  CreateGlobalMedicamentRequest,
  MedicamentResponse,
  UpdateGlobalMedicamentRequest,
} from '../types/medicaments.types'

/**
 * Cliente HTTP del vademécum.
 *
 * **Dos grupos de métodos con prefijo distinto, y esto hay que leerlo aquí y no
 * deducirlo del backend:**
 *
 *  - `/admin/medicaments` — la superficie de ESTA consola. Sus seis endpoints
 *    van con `hasRole('SYSTEM')` a secas y el controlador no inyecta `Authz`:
 *    no pide `X-Company-Id` ni puede pedirla.
 *  - `/medicaments` — la superficie del TENANT, con gates `prescription.*`. Sus
 *    métodos que mutan o leen por id resuelven la empresa con
 *    `Authz.currentCompanyId()`, que para un usuario de sistema lee la cabecera
 *    `X-Company-Id` y **lanza sin ella**. El cliente de esta consola no la
 *    añade (`COMPANY_ID_HEADER` existe como constante, pero no hay interceptor),
 *    así que **desde aquí solo se usa su listado**, que es de lectura y ya está
 *    abierto a `SYSTEM` desde BE-29.
 *
 * De ahí la regla: esta consola **escribe por `/admin/medicaments` y nunca por
 * `/medicaments`**.
 */
export const medicamentsApi = {
  /* ── Vademécum global · /admin/medicaments ─────────────────────────────── */

  /**
   * Globales ACTIVOS, paginados y filtrados **en el servidor**.
   *
   * La búsqueda tiene que ser servida y no en cliente: la respuesta es una
   * página, así que filtrar en memoria miraría solo las veinte filas visibles y
   * diría «no existe» sobre lo que está en la página 6 — y el operador crearía
   * un duplicado que después el índice único rechaza con un 409 sobre algo que
   * él mismo acaba de buscar sin encontrar.
   *
   * Va sin velo global porque es una búsqueda con rebote y bloquear la pantalla
   * en cada tecla sería invasivo. El `signal` lo pone `useServerPaged`: cada
   * término nuevo aborta la petición anterior, para que la respuesta de «amox»
   * no llegue después de la de «amoxi» y la pise.
   */
  async listAll(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    query = '',
    signal?: AbortSignal,
  ): Promise<PageResponse<MedicamentResponse>> {
    const { data } = await http.get<PageResponse<MedicamentResponse>>('/admin/medicaments', {
      params: query ? { q: query, page, pageSize } : { page, pageSize },
      skipGlobalLoader: true,
      signal,
    })
    return data
  },

  /**
   * Globales PAUSADOS. **No está paginado** —devuelve la lista entera— y llega
   * ya ordenado por nombre desde el servidor, así que no se reordena aquí: un
   * `localeCompare` en cliente solo podría discrepar del servidor en los
   * acentos.
   *
   * **No acepta `q`.** Es una diferencia real con el listado de activos y la
   * consecuencia está documentada en `useMedicaments`: el filtro de esta
   * pestaña se aplica sobre la lista completa que ya está en memoria.
   */
  async listDisabled(signal?: AbortSignal): Promise<MedicamentResponse[]> {
    const { data } = await http.get<MedicamentResponse[]>('/admin/medicaments/disabled', {
      signal,
    })
    return data
  },

  async create(payload: CreateGlobalMedicamentRequest): Promise<MedicamentResponse> {
    const { data } = await http.post<MedicamentResponse>('/admin/medicaments', payload)
    return data
  },

  async update(id: number, payload: UpdateGlobalMedicamentRequest): Promise<MedicamentResponse> {
    const { data } = await http.put<MedicamentResponse>(`/admin/medicaments/${id}`, payload)
    return data
  },

  /**
   * Baja lógica (`@SQLDelete … SET enabled = false`). En la interfaz se llama
   * «pausar», no «eliminar»: el verbo tiene que describir lo que pasa.
   */
  async remove(id: number): Promise<void> {
    await http.delete(`/admin/medicaments/${id}`)
  },

  /** Reactiva un global pausado. Va por `reactivateGlobal`, con `company_id IS NULL`. */
  async enable(id: number): Promise<MedicamentResponse> {
    const { data } = await http.patch<MedicamentResponse>(`/admin/medicaments/${id}/enable`)
    return data
  },

  /* ── Lente de consulta de plataforma · /medicaments ─────────────────────── */

  /**
   * Listado MIXTO: el vademécum global más lo que cada empresa da de alta por
   * su cuenta. Paginado y con búsqueda servida por `q`, igual que el de arriba
   * y por el mismo motivo, con más fuerza: aquí el conjunto incluye lo de todos
   * los tenants, así que es el listado con más páginas de las tres pantallas.
   *
   * **Solo lectura.** Ni esta consola ni ninguna pantalla suya escribe por esta
   * raíz.
   */
  async listPlatform(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    query = '',
    signal?: AbortSignal,
  ): Promise<PageResponse<MedicamentResponse>> {
    const { data } = await http.get<PageResponse<MedicamentResponse>>('/medicaments', {
      params: query ? { q: query, page, pageSize } : { page, pageSize },
      skipGlobalLoader: true,
      signal,
    })
    return data
  },
}
