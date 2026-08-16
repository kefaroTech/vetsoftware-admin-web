import { http } from '@/services/http/http.client'
import type {
  LoginEmployeeRequest,
  LoginSystemUserRequest,
  MeResponse,
  TokenResponse,
} from '../types/auth.types'

export const authApi = {
  async login(payload: LoginSystemUserRequest): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/login/system', payload)
    return data
  },
  async loginEmployee(payload: LoginEmployeeRequest): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/login/employee', payload)
    return data
  },
  async me(): Promise<MeResponse> {
    const { data } = await http.get<MeResponse>('/auth/me')
    return data
  },
  // Sin cuerpo: el refresh token va en la cookie HttpOnly que adjunta el navegador.
  async refresh(): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/refresh')
    return data
  },
  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },
}
