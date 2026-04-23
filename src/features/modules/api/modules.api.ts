import { http } from '@/services/http/http.client'
import type { AppModule, CreateModuleCommand, UpdateModuleCommand } from '../types/modules.types'

export const modulesApi = {
  list: () => http.get<AppModule[]>('/modules'),
  getById: (id: number) => http.get<AppModule>(`/modules/${id}`),
  create: (payload: CreateModuleCommand) => http.post<AppModule>('/modules', payload),
  update: (id: number, payload: UpdateModuleCommand) =>
    http.put<AppModule>(`/modules/${id}`, payload),
  remove: (id: number) => http.delete(`/modules/${id}`),
}
