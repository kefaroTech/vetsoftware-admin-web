/**
 * Tipos del alta de superadministradores por invitación.
 *
 * Escritos A MANO y NO derivados de `src/types/api.generated.d.ts`: los
 * endpoints todavía no existen en el backend (se están construyendo en
 * paralelo), así que el contrato OpenAPI no los declara y `api:check` no puede
 * atarlos. En cuanto el contrato los publique, estos nombres deben pasar a
 * contrastarse con `MatchesContract<X, 'X'>` como el resto de la consola —hasta
 * entonces, una deriva del backend NO rompe la compilación aquí.
 *
 * Los nombres siguen la convención del repo (`<Recurso>Request` /
 * `<Recurso>Response`) para que el día que se aten al contrato se lean igual en
 * los dos repositorios.
 */

/** `POST /platform/access-request` — cuerpo. */
export interface CreateAccessRequestRequest {
  fullName: string
  email: string
  reason: string
}

/** `GET /platform/access-request/validate?token=` — cuerpo de la respuesta. */
export interface AccessRequestResponse {
  fullName: string
  email: string
  reason: string
  /** ISO-8601. Se formatea en la vista; el backend no manda texto ya formateado. */
  requestedAt: string
}

/**
 * `POST /platform/access-request/approve` y `.../reject` — mismo cuerpo.
 *
 * El código se pide UNA vez y sirve para las dos acciones: no hay un código
 * para aprobar y otro para rechazar.
 */
export interface ResolveAccessRequestRequest {
  token: string
  code: string
}

/** `GET /platform/invitation/validate?token=` — cuerpo de la respuesta. */
export interface InvitationResponse {
  email: string
}

/** `POST /platform/invitation/accept` — cuerpo. */
export interface AcceptInvitationRequest {
  token: string
  password: string
}
