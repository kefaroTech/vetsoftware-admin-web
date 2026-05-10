import { http } from '@/services/http/http.client'
import type {
  ConsultationType,
  CreateConsultationTypeCommand,
  UpdateConsultationTypeCommand,
} from '../types/consultation-types.types'

export const consultationTypesApi = {
  list: () => http.get<ConsultationType[]>('/consultation-types'),
  getById: (id: number) => http.get<ConsultationType>(`/consultation-types/${id}`),
  create: (payload: CreateConsultationTypeCommand) =>
    http.post<ConsultationType>('/consultation-types', payload),
  update: (id: number, payload: UpdateConsultationTypeCommand) =>
    http.put<ConsultationType>(`/consultation-types/${id}`, payload),
  remove: (id: number) => http.delete(`/consultation-types/${id}`),
}
