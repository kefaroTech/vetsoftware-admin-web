import { http } from '@/services/http/http.client'
import type {
  AdjustCompanyUsageRequest,
  CompanyEntitlementSnapshotResponse,
  CompanyLimitEventResponse,
  EffectiveLimitResponse,
} from '../types/company-limits.types'

/**
 * Los cuatro endpoints de plataforma de los cupos (§I4 / §B8).
 *
 * <p><b>Los cuatro cuelgan de `/system/**` y la empresa viaja en la RUTA.</b> No
 * se pasa la opción `companyId` de axios —la que pone `X-Company-Id`— porque
 * estos controladores no la leen: un usuario de plataforma no tiene empresa, y la
 * suya entra como `@PathVariable`.
 *
 * <p><b>La corrección del contador está aquí y no en ningún otro sitio, y esa es
 * la mitad de su razón de ser.</b> `SystemCompanyLimitEventController` está
 * cerrado a `hasRole('SYSTEM')`; el puerto que mueve el contador durante una
 * operación normal admite al cliente, porque tiene que hacerlo —el hecho más
 * frecuente nace dentro de una petición de la clínica, cuando se le niega crear—.
 * Cablear «corregir el contador» a ese otro puerto le daría a la administradora
 * de la clínica la posibilidad de recuperar su propio cupo cada vez que topa
 * contra el techo, y el cupo dejaría de existir sin que ninguna fila del modelo
 * estuviera mal. Es un problema de seguridad, no de diseño: si alguien mueve esta
 * llamada, que lea antes el javadoc del controlador.
 *
 * <p><b>No hay `remove` ni `update`.</b> Un contador no se sobrescribe: se le
 * escribe un hecho compensatorio, que es lo que hace `adjustUsage`. Y no hay
 * ninguna escritura de excepciones negociadas aquí —eso es
 * `/system/company-limit-overrides/**`, que pertenece a otra pantalla—: esta solo
 * <b>lee</b> el techo efectivo para poder decir de dónde sale.
 */
export const companyLimitsApi = {
  /**
   * La bitácora de cupo de una empresa dentro de una ventana temporal.
   *
   * <p>`from` y `to` son obligatorios en el contrato y lo son a propósito: la
   * bitácora crece sin techo y un listado sin ventana acaba siendo un volcado de
   * la tabla. Viajan como `LocalDateTime` —sin zona— y los compone
   * `companyLimitsText.ts` en la zona del negocio, no con el reloj del navegador.
   */
  async listByCompany(
    companyId: number,
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<CompanyLimitEventResponse[]> {
    const { data } = await http.get<CompanyLimitEventResponse[]>(
      `/system/company-limit-events/companies/${companyId}`,
      { params: { from, to }, signal },
    )
    return data
  },

  /**
   * El techo vigente de un eje y <b>de dónde sale</b>.
   *
   * <p>Es una llamada por eje porque el contrato no publica ninguna en bloque:
   * la ruta lleva `{limitDimensionId}`. No es una llamada por fila de una tabla
   * paginada —eso sí sería un defecto—, sino por eje de un catálogo que hoy tiene
   * un puñado de entradas, y solo por los ejes que esta empresa tiene contador.
   */
  async findEffectiveLimit(
    companyId: number,
    limitDimensionId: number,
    signal?: AbortSignal,
  ): Promise<EffectiveLimitResponse> {
    const { data } = await http.get<EffectiveLimitResponse>(
      `/system/company-limit-overrides/companies/${companyId}/effective-limits/${limitDimensionId}`,
      { signal },
    )
    return data
  },

  /**
   * La última foto del cálculo a una fecha. Se usa como <b>indicador de salud</b>:
   * si se quedó vieja, hay un proceso caído.
   *
   * <p>`at` es un `LocalDateTime` obligatorio.
   */
  async findSnapshotAt(
    companyId: number,
    at: string,
    signal?: AbortSignal,
  ): Promise<CompanyEntitlementSnapshotResponse> {
    const { data } = await http.get<CompanyEntitlementSnapshotResponse>(
      `/system/company-entitlement-snapshots/companies/${companyId}`,
      { params: { at }, signal },
    )
    return data
  },

  /**
   * <b>Corrige el contador.</b> Operación de plataforma, con firma y motivo
   * obligatorios, sobre el puerto cerrado a `hasRole('SYSTEM')`.
   *
   * <p>Devuelve el hecho que quedó escrito: es la prueba de que la corrección se
   * registró, con las dos cifras de antes de moverla.
   */
  async adjustUsage(
    companyId: number,
    body: AdjustCompanyUsageRequest,
  ): Promise<CompanyLimitEventResponse> {
    const { data } = await http.post<CompanyLimitEventResponse>(
      `/system/company-limit-events/companies/${companyId}/usage-adjustments`,
      body,
    )
    return data
  },
}
