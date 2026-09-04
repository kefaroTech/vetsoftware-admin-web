import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { BillingDocumentResponse } from '@/features/billing-operations/types/billing-operations.types'
import type {
  BillingDocumentApplicationResponse,
  IssueCreditNoteRequest,
} from '../types/billing-documents.types'
import type {
  ApplyBillingDocumentRequest,
  DocumentWithholdingResponse,
  RegisterDocumentWithholdingRequest,
} from '../types/document-money.types'

/**
 * <b>Las cinco escrituras del dinero de un documento</b>, y por qué la empresa
 * viaja de forma distinta en unas y en otras.
 *
 * <p><b>Dos familias, dos formas de nombrar la empresa.</b>
 *
 * <ul>
 *   <li><b>`/billing-document-applications/**` es de tenant</b>:
 *       `BillingDocumentApplicationController` resuelve la empresa con
 *       `authz.currentCompanyId()`, que para el operador de esta consola lee la
 *       cabecera `X-Company-Id`. Por eso `companyId` es un argumento obligatorio y
 *       explícito, igual que en `billing-documents.api.ts`. Una cabecera invisible
 *       que decide sobre la cartera de quién se está escribiendo es el mecanismo
 *       exacto con el que se salda el documento de otra clínica.</li>
 *   <li><b>`/system/**` es de plataforma</b>: la empresa va en la URL —parámetro de
 *       consulta en las retenciones, segmento de ruta en la nota crédito— y no hace
 *       falta cabecera.</li>
 * </ul>
 *
 * <p><b>Lo que NO está aquí, y no por olvido.</b>
 *
 * <ul>
 *   <li><b>No hay «borrar aplicación».</b> El contrato no declara `DELETE` ni `PUT`
 *       sobre `/billing-document-applications/{id}`, y es correcto: deshacer es
 *       contra-aplicar. Que este cliente no tenga `remove` es la forma de que
 *       ninguna pantalla pueda ofrecer una papelera.</li>
 *   <li><b>No hay listado de las retenciones de UN documento.</b>
 *       `GET /system/document-withholdings` filtra por `companyId` y por nada más:
 *       no acepta `billingDocumentId`. Filtrar una página en el cliente diría «esta
 *       es la única retención» sobre un documento que puede tener otra en la página
 *       siguiente, así que no se hace y la pantalla declara el hueco.</li>
 *   <li><b>No hay «anular la nota crédito».</b> Una vez emitida es un documento más,
 *       con su propio circuito.</li>
 * </ul>
 */
const APPLICATIONS = '/billing-document-applications'
const SYSTEM_WITHHOLDINGS = '/system/document-withholdings'
const SYSTEM_COMPANIES = '/system/subscription-billing/companies'

export const documentMoneyApi = {
  /**
   * Registra una aplicación: qué salda este documento y por cuánto.
   *
   * <p>`clientRequestId` va en el cuerpo y lo genera quien abre el formulario. Es
   * lo que impide que un doble clic salde el mismo documento dos veces.
   */
  async apply(
    companyId: number,
    payload: ApplyBillingDocumentRequest,
  ): Promise<BillingDocumentApplicationResponse> {
    const { data } = await http.post<BillingDocumentApplicationResponse>(APPLICATIONS, payload, {
      companyId,
    })
    return data
  },

  /**
   * <b>Contra-aplica</b> una aplicación equivocada: crea la fila que la anula.
   *
   * <p><b>No lleva cuerpo</b> — el contrato no declara ninguno. Eso significa que el
   * motivo de la corrección <b>no se puede guardar</b>, y por eso esta acción no usa
   * el modal de acción firmada: pedir un motivo que el borde descarta haría creer al
   * operador que queda registrado cuando no queda nada. La pantalla lo dice en vez
   * de simularlo.
   *
   * <p>Devuelve la aplicación nueva, la que contra-aplica. La original sigue ahí:
   * después de esto el documento tiene dos filas más, no una menos.
   */
  async reverseApplication(
    companyId: number,
    applicationId: number,
  ): Promise<BillingDocumentApplicationResponse> {
    const { data } = await http.post<BillingDocumentApplicationResponse>(
      `${APPLICATIONS}/${applicationId}/reversal`,
      undefined,
      { companyId },
    )
    return data
  },

  /**
   * Registra una retención practicada por el cliente sobre un documento.
   *
   * <p>La empresa va como parámetro de consulta porque así lo declara el contrato
   * (`POST /system/document-withholdings?companyId=…`), no en la cabecera.
   */
  async registerWithholding(
    companyId: number,
    payload: RegisterDocumentWithholdingRequest,
  ): Promise<DocumentWithholdingResponse> {
    const { data } = await http.post<DocumentWithholdingResponse>(SYSTEM_WITHHOLDINGS, payload, {
      params: { companyId },
    })
    return data
  },

  /**
   * Las retenciones de <b>una empresa</b> — no las de un documento, que el contrato
   * no sabe filtrar. El nombre lo dice para que ninguna pantalla lo confunda.
   */
  async listWithholdingsByCompany(
    companyId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<DocumentWithholdingResponse>> {
    const { data } = await http.get<PageResponse<DocumentWithholdingResponse>>(
      SYSTEM_WITHHOLDINGS,
      { params: { companyId, page, pageSize }, signal },
    )
    return data
  },

  /**
   * <b>Emite la nota crédito</b> que corrige a un documento ya registrado.
   *
   * <p>El cuerpo son los cargos a acreditar y <b>no</b> un importe: el servidor
   * deriva el importe de los cargos elegidos. Por eso ninguna pantalla puede —ni
   * debe— ofrecer un campo de «cuánto acreditar».
   *
   * <p>Devuelve el <b>documento nuevo</b>, no el corregido. Los dos quedan y quedan
   * encadenados: el original no se toca nunca, porque si se tocara, lo que dice
   * Lumbre dejaría de coincidir con lo que tiene la DIAN y no habría forma de
   * saber cuál de los dos miente.
   */
  async issueCreditNote(
    companyId: number,
    documentId: number,
    payload: IssueCreditNoteRequest,
  ): Promise<BillingDocumentResponse> {
    const { data } = await http.post<BillingDocumentResponse>(
      `${SYSTEM_COMPANIES}/${companyId}/documents/${documentId}/credit-note`,
      payload,
    )
    return data
  },
}
