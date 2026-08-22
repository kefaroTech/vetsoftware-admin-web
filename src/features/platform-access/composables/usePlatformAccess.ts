import { ref } from 'vue'
import { AxiosError } from 'axios'
import { useToast } from '@/composables/useToast'
import { getProblemDetailFieldErrors } from '@/services/http/http.client'
import { platformAccessApi } from '../api/platform-access.api'
import type {
  AccessRequestResponse,
  CreateAccessRequestRequest,
  InvitationResponse,
} from '../types/platform-access.types'

/**
 * Fachada del alta de superadministradores por invitación.
 *
 * **Sin store de Pinia, y a propósito.** La regla del repo obliga a Pinia para
 * el estado GLOBAL o compartido entre pantallas; esto es lo contrario: cada una
 * de las tres vistas vive un flujo de un solo uso, con un token distinto, que
 * nace y muere en la pantalla y no lo lee nadie más. Es el mismo criterio que
 * documenta `companies.store.ts:5-18`. Los `ref()` de aquí son **por
 * instancia**, dentro de la función — no hay ni un singleton a nivel de módulo,
 * que es lo único que la regla prohíbe.
 *
 * Lo que sí concentra este composable es la **traducción del error HTTP a
 * estado de pantalla**, para que las vistas no toquen axios ni decidan por su
 * cuenta qué código significa qué. Esa decisión es de seguridad, no de
 * presentación: un 404 mal clasificado convierte una pantalla en un oráculo.
 */

/** Longitud exacta del código de verificación que exige el backend. */
export const CODE_LENGTH = 6

/**
 * Deja solo dígitos y corta a seis.
 *
 * Cubre `123456`, `123 456`, `123-456` y el pegado con salto de línea del
 * cliente de correo, que es como llega el código de verdad: se copia, no se
 * teclea. **No** intenta extraerlo de una frase («El código es 123456»): esa
 * heurística falla más de lo que acierta, y un `123` de otra parte del texto
 * rompería el valor.
 *
 * Vive aquí, y no dentro de un componente de campo propio, porque un
 * `CodeInput.vue` obligaba a recopiar los cuerpos `.field`/`.label`/`.error`
 * de `AppInput` y empujaba tres grupos duplicados por encima del techo de
 * `css-budget` (FE-08). Es una función pura: se prueba sin montar nada.
 */
export function sanitizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
}

/** El 404 del `POST` de solicitud no es un fallo: el formulario está cerrado. */
export type SubmitRequestResult =
  | { outcome: 'sent' }
  | { outcome: 'closed' }
  | { outcome: 'field-errors'; fieldErrors: Record<string, string> }
  | { outcome: 'error' }

/** `invalid` cubre por igual: token ausente, desconocido, caducado o ya usado. */
export type TokenLoadResult<T> =
  { outcome: 'ok'; data: T } | { outcome: 'invalid' } | { outcome: 'error' }

export type ResolveResult =
  | { outcome: 'ok' }
  | { outcome: 'wrong-code'; remainingAttempts: number | null }
  | { outcome: 'blocked' }
  | { outcome: 'invalid' }
  | { outcome: 'error' }

export type AcceptResult =
  | { outcome: 'ok' }
  | { outcome: 'invalid' }
  | { outcome: 'field-errors'; fieldErrors: Record<string, string> }
  | { outcome: 'error' }

function statusOf(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined
}

/** `404` y `410` son el MISMO estado en pantalla: distinguirlos delata qué tokens existieron. */
function isDeadToken(status: number | undefined): boolean {
  return status === 404 || status === 410
}

/**
 * Intentos que quedan, si el backend los publica. El contrato acordado para
 * `approve`/`reject` es «204 y nada más», así que este dato es OPCIONAL: cuando
 * no viene, el mensaje del campo se queda sin la cuenta atrás en vez de mentir
 * con un número inventado.
 */
function remainingAttemptsOf(error: unknown): number | null {
  if (!(error instanceof AxiosError)) return null
  const body = error.response?.data as { remainingAttempts?: unknown } | undefined
  const value = body?.remainingAttempts
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function usePlatformAccess() {
  const { errorFrom } = useToast()

  /** Petición en vuelo. Por instancia: cada vista monta la suya. */
  const loading = ref(false)

  async function submitRequest(payload: CreateAccessRequestRequest): Promise<SubmitRequestResult> {
    loading.value = true
    try {
      await platformAccessApi.create(payload)
      return { outcome: 'sent' }
    } catch (e) {
      const status = statusOf(e)
      // El 404 aquí es una respuesta ESPERADA, no un fallo: el sistema sí hizo
      // lo que se le pidió. Ni toast, ni banner rojo, ni el `detail` del
      // `ProblemDetail` — que es justo donde el backend podría filtrar por qué
      // está cerrado.
      if (status === 404) return { outcome: 'closed' }
      if (status === 400) {
        const fieldErrors = getProblemDetailFieldErrors(e)
        if (Object.keys(fieldErrors).length > 0) return { outcome: 'field-errors', fieldErrors }
      }
      errorFrom('No se pudo enviar la solicitud', e)
      return { outcome: 'error' }
    } finally {
      loading.value = false
    }
  }

  async function loadAccessRequest(token: string): Promise<TokenLoadResult<AccessRequestResponse>> {
    loading.value = true
    try {
      return { outcome: 'ok', data: await platformAccessApi.validateAccessRequest(token) }
    } catch (e) {
      // Un enlace muerto tiene pantalla propia y no necesita aviso efímero
      // encima: el toast repetiría lo que el `<h1>` ya dice.
      if (isDeadToken(statusOf(e))) return { outcome: 'invalid' }
      errorFrom('No se pudo comprobar el enlace', e)
      return { outcome: 'error' }
    } finally {
      loading.value = false
    }
  }

  async function resolveAccessRequest(
    token: string,
    code: string,
    decision: 'approve' | 'reject',
  ): Promise<ResolveResult> {
    loading.value = true
    try {
      const call = decision === 'approve' ? platformAccessApi.approve : platformAccessApi.reject
      await call({ token, code })
      return { outcome: 'ok' }
    } catch (e) {
      const status = statusOf(e)
      if (isDeadToken(status)) return { outcome: 'invalid' }
      if (status === 429) return { outcome: 'blocked' }
      if (status === 422) {
        const remainingAttempts = remainingAttemptsOf(e)
        // Sin intentos restantes el enlace queda quemado: es el estado de
        // bloqueo, no un reintento más.
        if (remainingAttempts === 0) return { outcome: 'blocked' }
        return { outcome: 'wrong-code', remainingAttempts }
      }
      errorFrom(
        decision === 'approve'
          ? 'No se pudo aprobar el acceso'
          : 'No se pudo rechazar la solicitud',
        e,
      )
      return { outcome: 'error' }
    } finally {
      loading.value = false
    }
  }

  async function loadInvitation(token: string): Promise<TokenLoadResult<InvitationResponse>> {
    loading.value = true
    try {
      return { outcome: 'ok', data: await platformAccessApi.validateInvitation(token) }
    } catch (e) {
      if (isDeadToken(statusOf(e))) return { outcome: 'invalid' }
      errorFrom('No se pudo comprobar la invitación', e)
      return { outcome: 'error' }
    } finally {
      loading.value = false
    }
  }

  async function acceptInvitation(token: string, password: string): Promise<AcceptResult> {
    loading.value = true
    try {
      await platformAccessApi.acceptInvitation({ token, password })
      return { outcome: 'ok' }
    } catch (e) {
      const status = statusOf(e)
      // SOLO el token muerto tira el formulario. Un 500 o una caída de red
      // dejarían al usuario sin la contraseña que acaba de escribir, y esa
      // pérdida es peor que el propio fallo.
      if (isDeadToken(status)) return { outcome: 'invalid' }
      if (status === 400) {
        const fieldErrors = getProblemDetailFieldErrors(e)
        if (Object.keys(fieldErrors).length > 0) return { outcome: 'field-errors', fieldErrors }
      }
      errorFrom('No se pudo crear la contraseña', e)
      return { outcome: 'error' }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    submitRequest,
    loadAccessRequest,
    resolveAccessRequest,
    loadInvitation,
    acceptInvitation,
  }
}
