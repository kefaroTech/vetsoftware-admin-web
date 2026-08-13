/**
 * Quien esta autenticado. TR-01: aqui era `string` y en el front operativo una union cerrada,
 * porque el backend lo publicaba como texto libre. Ahora es un enum del contrato y los dos lo
 * declaran igual.
 */
export type AuthSubjectType = 'EMPLOYEE' | 'SYSTEM_USER'

export interface LoginSystemUserCommand {
  code: string
  password: string
}

export interface LoginEmployeeCommand {
  employeeCode: string
  password: string
}

export type LoginCommand = LoginSystemUserCommand

/**
 * El backend ya no entrega el refresh token en el cuerpo: lo emite en una cookie
 * `HttpOnly`. El campo sigue apareciendo en el JSON con valor `null` y se omite
 * aquí a propósito, para que ningún código nuevo intente leerlo.
 */
export interface TokenResponse {
  token: string
  type: AuthSubjectType
}

export interface MeResponse {
  id: number
  type: AuthSubjectType
  companyId: number | null
  name: string
  employeeCode: string | null
  permissions: string[]
  /**
   * TR-01: el backend los devuelve siempre y este repositorio no los declaraba, asi que el
   * front operativo y este describian el mismo /auth/me de forma distinta. Para un usuario de
   * plataforma `branchIds` llega vacio, que es informacion, no ausencia.
   */
  mustChangePassword: boolean
  branchIds: number[]
}
