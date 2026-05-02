import axios, { AxiosError } from 'axios'
import { storageService } from '@/services/storage/storage.service'
import type { ProblemDetail } from '@/types/api.types'

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = storageService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetail>) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      storageService.removeToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export function getProblemDetailMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (error instanceof AxiosError) {
    const pd = error.response?.data as ProblemDetail | undefined
    if (pd?.detail) return pd.detail
    if (pd?.title) return pd.title
    if (error.message) return error.message
  }
  return fallback
}
