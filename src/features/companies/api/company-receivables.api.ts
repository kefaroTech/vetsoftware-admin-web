import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type { DunningEventResponse } from '@/features/subscriptions-admin/types/dunning-record.types'

/**
 * La lectura de <b>cartera</b> del expediente de empresa (§I6).
 *
 * <p><b>Es `/system/dunning-events`, no `/dunning-events`, y la diferencia
 * importa.</b> El endpoint del tenant lista por <i>contrato</i>
 * (`?subscriptionId=`) y lo consume `subscriptions-admin/api/dunning-record.api.ts`
 * desde el expediente de un contrato. El de plataforma lista por <i>empresa</i>
 * (`?companyId=`), que es la pregunta de esta pestaña: una empresa puede haber
 * tenido más de un contrato a lo largo del tiempo, y su cartera es la de todos
 * ellos. Preguntar por el contrato vigente dejaría fuera la mora del anterior,
 * que es justo la que explica por qué esta cuenta llegó a solo lectura.
 *
 * <p><b>Este endpoint NO lleva la cabecera `X-Company-Id`.</b> Cuelga de
 * `/system/**` y la empresa viaja como parámetro de consulta, así que no se pasa
 * la opción `companyId` de axios: mandar una cabecera que el controlador no lee
 * es sembrar el día en que alguien la lea y decida sobre la empresa equivocada.
 * Es la misma nota de `trials.api.ts` y `company-limits.api.ts`, y es lo
 * contrario de lo que hacen `company-fiscal.api.ts` y `company-cession.api.ts`
 * —cuyos endpoints sí resuelven la empresa por cabecera—: conviene no copiar el
 * patrón equivocado.
 *
 * <p><b>Los tipos no se redeclaran.</b> `DunningEventResponse` ya está escrito y
 * atado al contrato; una interfaz homónima aquí dejaría una de las dos copias sin
 * atar, que es el fallo TR-01 que la atadura existe para impedir.
 *
 * <p><b>No hay escritura.</b> Anotar un hito de cobranza se hace desde el
 * expediente del contrato, donde está el `subscriptionId` que el cuerpo exige;
 * esta pestaña solo lee. Ofrecer aquí un botón de anotar obligaría a elegir
 * contrato en un desplegable, y anotar la mora en el contrato que no era es peor
 * que no anotarla.
 */
export const companyReceivablesApi = {
  /**
   * Los hitos de cobranza de <b>todos</b> los contratos de la empresa.
   *
   * <p>Vienen ordenados `occurredAt` ascendente por el servidor, y de eso depende
   * la lectura de la evidencia: lo primero que llega es el principio de la
   * historia, así que si el paso a solo lectura está entre lo cargado, todo lo
   * anterior también lo está y el recuento de avisos previos es exacto. Ver
   * `dunningEvidence` en `subscriptions-admin/composables/dunningRecordText.ts`.
   *
   * <p>`page` es el índice desde 0 del backend.
   */
  async listByCompany(
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<DunningEventResponse>> {
    const { data } = await http.get<PageResponse<DunningEventResponse>>('/system/dunning-events', {
      params: { companyId, page, pageSize },
      signal,
    })
    return data
  },
}
