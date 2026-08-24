import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  BillingDocumentResponse,
  SubscriptionPaymentResponse,
} from '@/features/billing-operations/types/billing-operations.types'
import type {
  RegisterSubscriptionPaymentRequest,
  SubscriptionChargeResponse,
  SubscriptionChargeStatus,
} from '../types/subscription-money.types'

/**
 * Los cuatro endpoints de `/dinero` (§3.5 y §4.4.2, tarea W2-E): tres lecturas,
 * una por verbo, y el alta del pago.
 *
 * <p><b>Las cuatro son rutas de tenant y ninguna acepta la empresa como
 * argumento.</b> `SubscriptionBillingController` y `SubscriptionPaymentController`
 * la resuelven con `Authz.currentCompanyId()`, que para el operador de esta
 * consola lee la cabecera `X-Company-Id` (§1.1). Por eso `companyId` es un
 * parámetro <b>obligatorio y explícito</b> de los cuatro métodos, igual que en
 * `entitlements.api.ts` y en `subscription-record.api.ts`: no hay interceptor que
 * lo adivine de un store, porque una cabecera invisible que cambia de qué empresa
 * se está leyendo el dinero —o a cuál se le está abonando un pago— es el
 * mecanismo exacto con el que se cobra a la empresa equivocada.
 *
 * <p><b>Dos huecos del contrato que este cliente no puede tapar</b>, y que por eso
 * viajan como limitación hasta la pantalla en vez de disimularse aquí:
 *
 * <ul>
 *   <li>`GET /subscription-billing/documents` <b>no filtra por contrato</b>: no
 *       acepta `subscriptionId`. Devuelve los documentos de la <i>empresa</i>, y
 *       una empresa puede tener varios contratos. Filtrar la página en el cliente
 *       sería mentir sobre el total, así que el filtro existe pero la pantalla
 *       dice sobre qué está filtrando.</li>
 *   <li>`GET /subscription-billing/charges` <b>no filtra por documento</b>: acepta
 *       `subscriptionId` y `status`, y nada más. Recorrer la cadena «documento →
 *       sus cargos» obliga a cruzar en el cliente sobre lo que ya se cargó.</li>
 * </ul>
 *
 * <p>No hay `create`, `update` ni `remove` de cargos ni de documentos, y no es un
 * olvido: <b>desde esta consola no se emite ni se corrige nada de eso</b> (esas
 * escrituras viven en `/system/**`, con la empresa en la URL). Aquí solo se agrega
 * un hecho nuevo —el pago— y nunca se edita uno anterior (§3.2).
 */
export const subscriptionMoneyApi = {
  /**
   * <b>Devengado</b>: los cargos de este contrato. El servicio se prestó.
   *
   * <p>`status` es opcional; sin él vienen los tres estados. `page` es el índice
   * desde 0 del backend — la conversión desde la página 1-based que ve el
   * operador vive en el composable, no aquí.
   */
  async listCharges(
    companyId: number,
    subscriptionId: number,
    status: SubscriptionChargeStatus | null,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<SubscriptionChargeResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionChargeResponse>>(
      '/subscription-billing/charges',
      {
        companyId,
        params: { subscriptionId, ...(status ? { status } : {}), page, pageSize },
        signal,
      },
    )
    return data
  },

  /**
   * <b>Facturado</b>: los documentos de cobro de la <b>empresa</b>.
   *
   * <p>El nombre del método lo dice —`listByCompany`, no `listBySubscription`—
   * porque es lo que el endpoint hace de verdad. Llamarlo `listAll` habría
   * escondido en el vocabulario del cliente justo el hecho que la pantalla tiene
   * que declarar.
   */
  async listDocumentsByCompany(
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<BillingDocumentResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentResponse>>(
      '/subscription-billing/documents',
      { companyId, params: { page, pageSize }, signal },
    )
    return data
  },

  /**
   * <b>Cobrado</b>: los pagos de la <b>empresa</b>.
   *
   * <p>Tampoco se filtran por contrato, y aquí no es una carencia sino el modelo:
   * un pago <b>no</b> pertenece a una factura ni a un contrato. Se registra que
   * entró plata de esa empresa; a qué documentos se aplica es otra cosa. La
   * pantalla lo dice con esas palabras en vez de dejar creer que la lista es «los
   * pagos de este contrato».
   */
  async listPaymentsByCompany(
    companyId: number,
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<SubscriptionPaymentResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionPaymentResponse>>(
      '/subscription-payments',
      { companyId, params: { page, pageSize }, signal },
    )
    return data
  },

  /**
   * Registra que entró la plata. Devuelve el pago tal como quedó en el servidor
   * —con su `id`, su `status` y su `createdDate`—, que es lo que la pantalla pinta
   * después como hecho consumado y ya no como formulario.
   *
   * <p>El `clientRequestId` del cuerpo lo genera el formulario una vez al abrirse.
   * Este cliente no lo toca: si lo generara aquí, cada envío traería uno nuevo y
   * la idempotencia dejaría de proteger contra el doble clic, que es literalmente
   * lo único de lo que protege.
   */
  async registerPayment(
    companyId: number,
    payload: RegisterSubscriptionPaymentRequest,
  ): Promise<SubscriptionPaymentResponse> {
    const { data } = await http.post<SubscriptionPaymentResponse>(
      '/subscription-payments',
      payload,
      { companyId },
    )
    return data
  },
}
