import { http } from '@/services/http/http.client'
import type {
  AcceptInvitationRequest,
  AccessRequestResponse,
  CreateAccessRequestRequest,
  InvitationResponse,
  ResolveAccessRequestRequest,
} from '../types/platform-access.types'

/**
 * Las seis llamadas del alta de superadministradores por invitación.
 *
 * Módulo único —no uno por pantalla— porque las tres vistas son tres pasos de
 * un mismo flujo y comparten el mismo recurso del backend.
 *
 * Como el resto de clientes de la consola, cada método devuelve **el cuerpo, no
 * el `AxiosResponse`**: ningún consumidor desestructura `{ data }`. Los tres
 * `POST` responden sin cuerpo (202/204), así que devuelven `void` — hacerlos
 * devolver `unknown` invitaría a leer un cuerpo que no existe.
 *
 * Los dos `GET` de validación de token llevan `skipGlobalLoader: true`: son la
 * carga inicial de la pantalla y el destino de la espera es la tarjeta, no la
 * página. El velo global sobre una tarjeta vacía es ruido. Los `POST` NO lo
 * llevan: son mutaciones y bloquear la pantalla mientras vuelan es correcto —
 * además impide el doble envío.
 */
export const platformAccessApi = {
  /** `202` sin cuerpo. Un `404` significa que el formulario está CERRADO. */
  async create(payload: CreateAccessRequestRequest): Promise<void> {
    await http.post('/platform/access-request', payload)
  },

  async validateAccessRequest(token: string): Promise<AccessRequestResponse> {
    const { data } = await http.get<AccessRequestResponse>('/platform/access-request/validate', {
      params: { token },
      skipGlobalLoader: true,
    })
    return data
  },

  async approve(payload: ResolveAccessRequestRequest): Promise<void> {
    await http.post('/platform/access-request/approve', payload)
  },

  async reject(payload: ResolveAccessRequestRequest): Promise<void> {
    await http.post('/platform/access-request/reject', payload)
  },

  async validateInvitation(token: string): Promise<InvitationResponse> {
    const { data } = await http.get<InvitationResponse>('/platform/invitation/validate', {
      params: { token },
      skipGlobalLoader: true,
    })
    return data
  },

  async acceptInvitation(payload: AcceptInvitationRequest): Promise<void> {
    await http.post('/platform/invitation/accept', payload)
  },
}
