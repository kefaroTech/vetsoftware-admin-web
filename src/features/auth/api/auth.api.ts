import { http } from '@/services/http/http.client'
import type {
  AuthSubjectType,
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
  // El refresh token va en una cookie HttpOnly, pero el backend emite una cookie
  // POR TIPO de sujeto porque los dos fronts comparten la misma API: sin el
  // `type` en el cuerpo no sabe cuál de las dos leer.
  async refresh(type: AuthSubjectType): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/refresh', { type })
    return data
  },
  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },
}
