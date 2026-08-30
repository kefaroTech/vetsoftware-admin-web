import { http } from '@/services/http/http.client'
import type {
  ProposalSuppressionResponse,
  SuppressProposalDataRequest,
} from '../types/proposal-suppression.types'

/**
 * El único cliente de la supresión a petición del titular.
 *
 * <p><b>`POST` y no `DELETE`, y la ruta en plural.</b> Las dos cosas son del
 * backend y ninguna se puede «arreglar» desde aquí
 * (`AiProposalRetentionController.java:24-30`): el correo tiene que viajar en el
 * cuerpo —un `DELETE` con cuerpo no lo respetan ni los proxies ni todos los
 * clientes— y el singular `/assistant/proposal` es el path exacto que
 * `LoginRateLimitFilter` casa con `equals` para el cupo del endpoint de pago.
 *
 * <p><b>El correo NUNCA en la URL ni en la query.</b> Es la razón de ser del
 * cuerpo: `RequestLoggingContextFilter` mete el URI de toda petición en el
 * contexto de log, así que un correo en la ruta acabaría copiado en CloudWatch y
 * en Loki con 31 días de retención — justo el dato que este endpoint existe para
 * borrar, en un sitio del que no se borra.
 *
 * <p>Devuelve el cuerpo, no el `AxiosResponse`. Sin `skipGlobalLoader`: esta
 * llamada la dispara un botón y su espera se ve.
 */
const SUPPRESS = '/assistant/proposals/suppress'

export const proposalSuppressionApi = {
  /**
   * Suprime lo asociado a un correo. **No es una consulta previa**: no hay forma
   * de preguntar «¿qué hay de esta dirección?» sin borrarlo. El contrato no
   * expone ninguna lectura, y por eso la pantalla confirma antes de llamar.
   */
  async suppress(payload: SuppressProposalDataRequest): Promise<ProposalSuppressionResponse> {
    const { data } = await http.post<ProposalSuppressionResponse>(SUPPRESS, payload)
    return data
  },
}
