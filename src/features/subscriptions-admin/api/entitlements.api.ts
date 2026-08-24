import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  CompanyAccessResponse,
  CompanyEntitlementResponse,
  EntitlementRecalculationResponse,
} from '../types/entitlements.types'

/**
 * Los tres endpoints de `/acceso` (§4.4.2, tarea W2-D).
 *
 * <p><b>Ninguno recibe la empresa como argumento del servidor.</b>
 * `CompanyEntitlementController` no la acepta ni en la ruta ni en el cuerpo: la
 * pone con `authz.currentCompanyId()`, que para el operador de esta consola —un
 * `SystemUserContext`— lee la cabecera `X-Company-Id`. Su javadoc lo dice sin
 * rodeos: «dejar que el cliente eligiera la empresa aquí sería regalar los
 * permisos de cualquier clínica a quien supiera escribir un número».
 *
 * <p>Consecuencia para este cliente: `companyId` es un parámetro <b>obligatorio y
 * explícito</b> de los tres métodos, igual que en `subscription-record.api.ts`.
 * No hay interceptor que lo adivine de un store — una cabecera invisible que
 * cambia de qué empresa se están leyendo (o recalculando) los permisos es
 * exactamente el mecanismo con el que se repara la empresa equivocada.
 *
 * <p><b>Por qué dos lecturas y no una.</b> Los dos GET responden preguntas
 * distintas y el controller lo declara:
 *
 * <ul>
 *   <li>`GET /entitlements/access` — «la consulta caliente: qué puede usar mi
 *       clínica ahora mismo». Es el <b>único</b> que trae las capacidades y el
 *       `recalculatedAt` del conjunto.</li>
 *   <li>`GET /entitlements` — «el listado de auditoría, con los caducados y los
 *       ocultos». Es el único paginado, y por eso el único que puede enseñar la
 *       tabla entera sin truncarla en silencio.</li>
 * </ul>
 *
 * <p>No hay `create`, `update` ni `remove`, y no es un olvido: <b>aquí no se
 * edita nada</b>. El nivel de acceso sale del contrato; la única escritura es
 * `recalculate`, que no es una edición sino una reparación.
 */
export const entitlementsApi = {
  /**
   * Lo que la empresa puede usar ahora mismo, con sus contadores.
   *
   * <p>Sin paginar: es la foto del acceso vigente, no un listado.
   */
  async findAccess(companyId: number, signal?: AbortSignal): Promise<CompanyAccessResponse> {
    const { data } = await http.get<CompanyAccessResponse>('/entitlements/access', {
      companyId,
      signal,
    })
    return data
  },

  /**
   * El listado de auditoría: <b>todas</b> las filas de la empresa, incluidas las
   * caducadas y las ocultas.
   *
   * <p>`page` es el índice desde 0 del backend. La conversión desde la página
   * 1-based que ve el operador vive en el composable, no aquí.
   */
  async listAll(
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<CompanyEntitlementResponse>> {
    const { data } = await http.get<PageResponse<CompanyEntitlementResponse>>('/entitlements', {
      companyId,
      params: { page, pageSize },
      signal,
    })
    return data
  },

  /**
   * Fuerza el recálculo. <b>No es el camino normal</b> —el normal es que lo
   * dispare cada cambio de contrato— sino la palanca para cuando
   * `recalculatedAt` se ha quedado viejo y hay que reparar una empresa sin
   * esperar a su siguiente movimiento.
   *
   * <p>No lleva cuerpo. El `undefined` es el `data` de axios: sin él, el
   * `companyId` del tercer argumento se leería como el cuerpo del POST.
   */
  async recalculate(companyId: number): Promise<EntitlementRecalculationResponse> {
    const { data } = await http.post<EntitlementRecalculationResponse>(
      '/entitlements/recalculate',
      undefined,
      { companyId },
    )
    return data
  },
}
