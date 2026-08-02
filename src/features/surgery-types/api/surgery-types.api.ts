import { http } from '@/services/http/http.client'
import type {
  SurgeryType,
  CreateSurgeryTypeCommand,
  UpdateSurgeryTypeCommand,
} from '../types/surgery-types.types'

export const surgeryTypesApi = {
  list: () => http.get<SurgeryType[]>('/surgery-types'),
  getById: (id: number) => http.get<SurgeryType>(`/surgery-types/${id}`),
  create: (payload: CreateSurgeryTypeCommand) => http.post<SurgeryType>('/surgery-types', payload),
  update: (id: number, payload: UpdateSurgeryTypeCommand) =>
    http.put<SurgeryType>(`/surgery-types/${id}`, payload),
  remove: (id: number) => http.delete(`/surgery-types/${id}`),
}
