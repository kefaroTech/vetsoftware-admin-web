import { http } from '@/services/http/http.client'
import type { SpaType, CreateSpaTypeCommand, UpdateSpaTypeCommand } from '../types/spa-types.types'

export const spaTypesApi = {
  list: () => http.get<SpaType[]>('/spa-types'),
  getById: (id: number) => http.get<SpaType>(`/spa-types/${id}`),
  create: (payload: CreateSpaTypeCommand) => http.post<SpaType>('/spa-types', payload),
  update: (id: number, payload: UpdateSpaTypeCommand) =>
    http.put<SpaType>(`/spa-types/${id}`, payload),
  remove: (id: number) => http.delete(`/spa-types/${id}`),
}
