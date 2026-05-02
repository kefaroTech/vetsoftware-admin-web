import { http } from '@/services/http/http.client'
import type {
  LoginEmployeeCommand,
  LoginSystemUserCommand,
  TokenResponse,
} from '../types/auth.types'

export const authApi = {
  login: (payload: LoginSystemUserCommand) =>
    http.post<TokenResponse>('/auth/login/system', payload),
  loginEmployee: (payload: LoginEmployeeCommand) =>
    http.post<TokenResponse>('/auth/login/employee', payload),
}
