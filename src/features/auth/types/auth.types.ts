export interface LoginSystemUserCommand {
  code: string
  password: string
}

export interface LoginEmployeeCommand {
  employeeCode: string
  password: string
}

export type LoginCommand = LoginSystemUserCommand

export interface TokenResponse {
  token: string
  type: string
  refreshToken: string
}

export interface MeResponse {
  id: number
  type: string
  companyId: number | null
  name: string
  employeeCode: string | null
  permissions: string[]
}
