import axios from 'axios'
import { http } from '@/services/http/http.client'
import type { SubscriptionResponse } from '@/features/subscriptions-admin/types/subscriptions-admin.types'
import type { CompanyAccessResponse } from '@/features/subscriptions-admin/types/entitlements.types'

/**
 * Las dos lecturas del <b>resumen</b> del expediente de empresa (§I2).
 *
 * <p><b>Las dos exigen la cabecera `X-Company-Id`</b> y por eso los dos métodos
 * piden `companyId` como parámetro obligatorio y explícito. Ninguno de los dos
 * endpoints recibe la empresa en la ruta ni en el cuerpo: la resuelve el backend
 * con `Authz.currentCompanyId()`, que para el operador de esta consola lee la
 * cabecera. `http.client.ts` acepta `{ companyId }` por petición y
 * deliberadamente NO hay ningún interceptor que la adivine de un store —una
 * cabecera invisible que cambia de quién se están leyendo los datos es el
 * mecanismo exacto con el que se acaba enseñando la empresa equivocada—, así que
 * quien llama tiene que decir sobre qué empresa lee. Esta pantalla la tiene
 * escrita en la URL y pintada en la cabecera todo el rato.
 *
 * <p><b>Los tipos no se redeclaran aquí.</b> `SubscriptionResponse` y
 * `CompanyAccessResponse` ya están escritos y —lo que importa— ya están atados al
 * contrato en `src/types/api.contract.ts`. Declarar interfaces homónimas en
 * `companies/types/` dejaría las copias sin atar, que es exactamente el fallo
 * TR-01 que esa atadura existe para impedir.
 *
 * <p>No hay ningún método de escritura: el resumen no edita nada. Lo que se
 * escribe sobre una empresa se escribe en `/datos` con `companiesApi.update`.
 */
export const companyRecordApi = {
  /**
   * El contrato vigente de la empresa.
   *
   * <p><b>Devuelve `null` en un 404, y eso NO es un error.</b> Una empresa recién
   * creada, o una que nunca llegó a firmar, no tiene contrato: es un hecho del
   * negocio y la pantalla lo dice con palabras. Tratarlo como fallo pintaría un
   * banner rojo de «no se pudo cargar» sobre algo que sí se pudo cargar y que
   * resultó estar vacío. Cualquier otro estado —403, 500, un timeout— sí se
   * propaga, porque de esos no se sabe si hay contrato o no.
   *
   * <p><b>Por qué `/subscriptions/current` y no `/platform-subscriptions`.</b> El
   * listado de plataforma es una página sin filtro por empresa (comprobado sobre
   * `api/openapi.json`: solo admite `page` y `pageSize`), así que encontrar el
   * contrato de la empresa 42 obligaría a recorrer el censo entero. `current`
   * responde por la empresa de la cabecera y es una sola petición.
   */
  async findCurrentSubscription(
    companyId: number,
    signal?: AbortSignal,
  ): Promise<SubscriptionResponse | null> {
    try {
      const { data } = await http.get<SubscriptionResponse>('/subscriptions/current', {
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
   * La consulta caliente de permisos y cupos: qué puede usar la clínica ahora
   * mismo, con sus contadores.
   *
   * <p>Es la misma que gobierna la pestaña de cupos (§B8/I4). El resumen la pide
   * porque necesita <b>los contadores reales</b> —cuántos cupos hay y cuáles
   * están desbordados— y no hay forma de saberlo sin ellos; el detalle, eje por
   * eje, se queda en su pestaña.
   */
  async findAccess(companyId: number, signal?: AbortSignal): Promise<CompanyAccessResponse> {
    const { data } = await http.get<CompanyAccessResponse>('/entitlements/access', {
      companyId,
      signal,
    })
    return data
  },
}
