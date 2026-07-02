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
  refresh: (refreshToken: string) =>
    http.post<TokenResponse>('/auth/refresh', { refreshToken }),
  logout: () => http.post('/auth/logout'),
}
