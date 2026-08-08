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
  type: string
}

export interface MeResponse {
  id: number
  type: string
  companyId: number | null
  name: string
  employeeCode: string | null
  permissions: string[]
}
