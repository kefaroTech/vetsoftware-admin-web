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
}
