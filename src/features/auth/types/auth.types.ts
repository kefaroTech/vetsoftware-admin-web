export interface LoginCommand {
  code: string
  password: string
}

export interface TokenResponse {
  token: string
}
