/**
 * Tipos del alta de superadministradores por invitación.
 *
 * Escritos a mano —con su documentación de negocio— y ATADOS al contrato en
 * `src/types/api.contract.ts` con `MatchesContract<X, 'X'>`, como el resto de la
 * consola. Estuvieron sin atar mientras el backend construía los endpoints y el
 * contrato no los declaraba; desde que los publica, una deriva del backend en
 * cualquiera de estos cuerpos rompe la compilación aquí en vez de aparecer como
 * `undefined` en el navegador.
 *
 * Los nombres son los del esquema del contrato (`<Recurso>Request` /
 * `<Recurso>Response`) para que la atadura se lea igual en los dos repositorios.
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
