import { http } from '@/services/http/http.client'
import type { LoginCommand, TokenResponse } from '../types/auth.types'

export const authApi = {
  login: (payload: LoginCommand) => http.post<TokenResponse>('/auth/login/system', payload),
}
