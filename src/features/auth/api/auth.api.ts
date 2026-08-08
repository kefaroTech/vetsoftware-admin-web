import { http } from '@/services/http/http.client'
import type {
  LoginEmployeeCommand,
  LoginSystemUserCommand,
  MeResponse,
  TokenResponse,
} from '../types/auth.types'

export const authApi = {
  login: (payload: LoginSystemUserCommand) =>
    http.post<TokenResponse>('/auth/login/system', payload),
  loginEmployee: (payload: LoginEmployeeCommand) =>
    http.post<TokenResponse>('/auth/login/employee', payload),
  me: () => http.get<MeResponse>('/auth/me'),
  // Sin cuerpo: el refresh token va en la cookie HttpOnly que adjunta el navegador.
  refresh: () => http.post<TokenResponse>('/auth/refresh'),
  logout: () => http.post('/auth/logout'),
}
