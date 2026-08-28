import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'
import type { BillingDocumentApplicationResponse } from '../types/billing-documents.types'

/**
 * Lo que hace falta para <b>abrir un documento de cobro</b>, y de dónde sale.
 *
 * <p><b>Las tres rutas de aquí son de tenant y ninguna acepta la empresa como
 * argumento.</b> `SubscriptionBillingController` y
 * `BillingDocumentApplicationController` la resuelven con
 * `authz.currentCompanyId()`, que para el operador de esta consola lee la
 * cabecera `X-Company-Id`. Sus casos de uso están abiertos a plataforma
 * —`@PreAuthorize("hasRole('SYSTEM') or …")`—, así que la consola sí puede
 * leerlas; lo que no puede es omitir la empresa.
 *
 * <p>Por eso `companyId` es un parámetro <b>obligatorio y explícito</b> de los
 * cuatro métodos, igual que en `subscription-money.api.ts`: no hay interceptor
 * que lo adivine de un store. Una cabecera invisible que cambia de qué empresa se
 * está leyendo el dinero es el mecanismo exacto con el que se mira la cartera de
 * la empresa equivocada. La empresa la trae siempre la fila de la que se vino
 * (`BillingDocumentResponse.companyId`) o la propia URL de la pantalla.
 *
 * <p><b>Lo que NO está aquí, y no por olvido.</b>
 *
 * <ul>
 *   <li><b>No hay listado de documentos por estado para toda la plataforma.</b>
 *       `/system/subscription-billing/documents/**` solo publica
 *       `awaiting-external` y `overdue`; `DRAFT`, `EXTERNAL_REGISTERED` y
 *       `VOIDED` no tienen barrido. Los dos que sí existen ya los sirve
 *       `billingOperationsApi` y esta feature los consume de allí en vez de
 *       declararlos otra vez.</li>
 *   <li><b>No hay listado de los cargos de un documento.</b>
 *       `GET /subscription-billing/charges` filtra por `subscriptionId` y por
 *       `status`, y por nada más. Los renglones se cruzan en el cliente sobre los
 *       cargos del contrato, con la comprobación aritmética que eso obliga a
 *       hacer — ver `useDocumentCharges`.</li>
 *   <li><b>No hay historia de estados del documento.</b> El contrato no declara
 *       ninguna ruta sobre `billing_document_status_history`.</li>
 *   <li><b>No hay «editar».</b> Ni aquí ni en el servidor: un documento no se
 *       corrige, se emite una nota crédito encadenada. Que este cliente no tenga
 *       `update` es la forma de que la pantalla no pueda ofrecerlo.</li>
 * </ul>
 */
const DOCUMENTS = '/subscription-billing/documents'
const APPLICATIONS = '/billing-document-applications'
const SYSTEM_COMPANY_DOCUMENTS = '/system/subscription-billing/companies'

export const billingDocumentsApi = {
  /**
   * Un documento de cobro, con su desglose fiscal.
   *
   * <p>La empresa viaja en la cabecera y el identificador en la ruta: los dos
   * salen de la URL de la pantalla, que es de dos parámetros justo para que la
   * empresa nunca sea implícita.
   */
  async findById(
    companyId: number,
    id: number,
    signal?: AbortSignal,
  ): Promise<BillingDocumentResponse> {
    const { data } = await http.get<BillingDocumentResponse>(`${DOCUMENTS}/${id}`, {
      companyId,
      signal,
    })
    return data
  },

  /**
   * Los documentos de <b>una empresa</b>, todos sus estados.
   *
   * <p>El nombre dice lo que el endpoint hace: `listByCompany`, no `listAll`. No
   * acepta filtro por estado ni por contrato, así que quien lo pinte tiene que
   * decir sobre qué está listando en vez de dejar creer que está filtrado.
   */
  async listByCompany(
    companyId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BillingDocumentResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentResponse>>(DOCUMENTS, {
      companyId,
      params: { page, pageSize },
      signal,
    })
    return data
  },

  /**
   * <b>Qué salda este documento</b>, en orden de aplicación.
   *
   * <p>`targetDocumentId` es obligatorio en el servidor: no existe la variante
   * «todas las aplicaciones». Es lo correcto — un listado que no nombra la
   * empresa devolvería filas de todas.
   */
  async listApplications(
    companyId: number,
    targetDocumentId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<BillingDocumentApplicationResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentApplicationResponse>>(
      APPLICATIONS,
      {
        companyId,
        params: { targetDocumentId, page, pageSize },
        signal,
      },
    )
    return data
  },

  /**
   * `DRAFT → AWAITING_EXTERNAL`: el documento entra en la cola de emisión.
   *
   * <p>Es la única transición del circuito que esta pantalla puede provocar hoy y
   * <b>no lleva cuerpo</b>: el contrato no declara ninguno. Por eso no se le pone
   * un modal de firma con motivo — pedir un motivo que el borde descarta haría
   * creer al operador que queda registrado cuando no queda nada.
   *
   * <p>Aquí la empresa va en la <b>URL</b>, no en la cabecera: es una escritura de
   * `/system/**` y su controlador la toma del `@PathVariable`.
   */
  async submitForExternalIssue(companyId: number, id: number): Promise<BillingDocumentResponse> {
    const { data } = await http.post<BillingDocumentResponse>(
      `${SYSTEM_COMPANY_DOCUMENTS}/${companyId}/documents/${id}/await-external`,
    )
    return data
  },
}
