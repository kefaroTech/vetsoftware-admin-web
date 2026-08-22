import type { MembershipStatus } from '@/types/common.types'

/**
 * Etiqueta visible de cada estado, en un solo sitio.
 *
 * Estaba escrita dos veces —en `MembershipStatusBadge.vue` y en el desplegable
 * de `MembershipForm.vue`— y la búsqueda del listado necesitaba una tercera:
 * el usuario busca «Activa», que es lo que ve en la tabla, no `ACTIVE`, que es
 * lo que viaja por el cable. Con tres copias, renombrar un estado deja la
 * pantalla diciendo una cosa y el buscador entendiendo otra.
 */
export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  DEPRECATED: 'Deprecada',
}

export interface MembershipResponse {
  id: number
  name: string
  status: MembershipStatus
  /**
   * La membresía que el backend asigna a toda empresa que se registra sola.
   *
   * <p>`JpaDefaultMembershipProvider` la resuelve con `findFirstByMandatoryTrue()` y
   * `RegisterUserService` lanza `IllegalStateException` si no encuentra ninguna. El
   * contrato la declara desde siempre y este repositorio no la declaraba, así que la
   * ficha no podía enseñar cuál es el plan por defecto.
   */
  mandatory: boolean
  createdDate: string
}

export interface CreateMembershipRequest {
  name: string
  status: MembershipStatus
  /**
   * Hay que declararlo aunque el contrato lo marque opcional: en el `record` de Java es un
   * `boolean` primitivo, así que un cuerpo sin este campo no significa «déjalo como está»,
   * significa `false`. Omitirlo hacía que cada guardado desde esta consola desmarcara la
   * membresía por defecto y dejara el auto-registro público sin plan que asignar.
   */
  mandatory: boolean
}

export type UpdateMembershipRequest = CreateMembershipRequest
