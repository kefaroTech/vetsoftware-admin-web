import axios from 'axios'
import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  CompanyBillingProfileResponse,
  SucceedCompanyBillingProfileRequest,
} from '../types/company-cession.types'

/**
 * Las tres operaciones de la <b>cesión del contrato</b> (§I11, D-62).
 *
 * <p><b>Las tres exigen la cabecera `X-Company-Id`</b> —ninguna recibe la empresa
 * en la ruta ni en el cuerpo: `CompanyBillingProfileController` la resuelve con
 * `authz.currentCompanyId()`, que para el operador de esta consola lee esa
 * cabecera— y por eso los tres métodos piden `companyId` como parámetro
 * obligatorio y explícito. `http.client.ts` la manda solo si quien llama la pasa,
 * y deliberadamente no hay ningún interceptor que la adivine de un store: una
 * cabecera invisible que cambia de qué empresa se está cediendo el contrato es
 * el mecanismo exacto con el que se cede el de la empresa equivocada. Es la misma
 * decisión que documentan `company-record.api.ts` y `company-fiscal.api.ts`.
 *
 * <p><b>No hay `update` ni `remove`, y las dos ausencias son la regla.</b> Un
 * titular no se edita: se cierra el suyo y se abre el del siguiente, que es lo
 * que hace `succeed`. Editar en sitio haría que una factura del año pasado
 * cambiara de destinatario, y una cesión borrada dejaría un tramo de tiempo sin
 * nadie que respondiera por él.
 *
 * <p><b>`open` existe en el contrato y este cliente NO lo expone.</b>
 * `POST /company-billing-profile` abre el <i>primer</i> perfil de una empresa que
 * todavía no tiene ninguno, y responde 409 si ya lo hay. No es una cesión: es el
 * alta. Ofrecerlo desde esta pantalla —cuyo nombre es «Cesión»— invitaría a
 * usarlo como si sucediera al titular anterior, y lo que haría es fallar o, peor,
 * crear un titular sin cerrar el que estaba.
 */
export const companyCessionApi = {
  /**
   * El titular vigente del contrato.
   *
   * <p><b>Devuelve `null` en un 404, y eso NO es un error.</b> Una empresa que
   * nunca ha tenido perfil de facturación no tiene titular; es un hecho del
   * negocio y la pantalla lo dice con palabras, además de ser justo el caso en
   * el que ceder no es lo que hace falta. Cualquier otro estado —403, 500, un
   * timeout— sí se propaga: de esos no se sabe si hay titular o no.
   */
  async findCurrent(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<CompanyBillingProfileResponse | null> {
    try {
      const { data } = await http.get<CompanyBillingProfileResponse>('/company-billing-profile', {
        companyId,
        signal,
      })
      return data
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null
      throw err
    }
  },

  /**
   * <b>La serie de titulares</b>, del más reciente al más antiguo.
   *
   * <p>Es la que contesta «cuántas veces se ha cedido este contrato y a quién en
   * cada momento». Está paginada en el contrato y aquí también: una cesión es un
   * hecho raro, pero la lista crece y nunca se poda.
   *
   * <p>`page` es el índice desde 0 del backend. La conversión desde la página
   * 1-based que ve el operador vive en el composable, no aquí.
   */
  async listHistory(
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<CompanyBillingProfileResponse>> {
    const { data } = await http.get<PageResponse<CompanyBillingProfileResponse>>(
      '/company-billing-profile/history',
      { companyId, params: { page, pageSize }, signal },
    )
    return data
  },

  /**
   * <b>Cede el contrato</b>: cierra el titular vigente y abre el del entrante
   * desde `effectiveFrom`.
   *
   * <p>Devuelve el perfil nuevo tal y como quedó guardado — con su `validFrom`
   * puesto por el servidor, que es el que manda y no el que se pidió.
   */
  async succeed(
    companyId: number,
    body: SucceedCompanyBillingProfileRequest,
  ): Promise<CompanyBillingProfileResponse> {
    const { data } = await http.post<CompanyBillingProfileResponse>(
      '/company-billing-profile/succession',
      body,
      { companyId },
    )
    return data
  },
}
