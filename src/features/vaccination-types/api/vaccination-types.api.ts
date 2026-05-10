import { http } from '@/services/http/http.client'
import type {
  VaccinationType,
  CreateVaccinationTypeCommand,
  UpdateVaccinationTypeCommand,
} from '../types/vaccination-types.types'

export const vaccinationTypesApi = {
  list: () => http.get<VaccinationType[]>('/vaccination-types'),
  getById: (id: number) => http.get<VaccinationType>(`/vaccination-types/${id}`),
  create: (payload: CreateVaccinationTypeCommand) =>
    http.post<VaccinationType>('/vaccination-types', payload),
  update: (id: number, payload: UpdateVaccinationTypeCommand) =>
    http.put<VaccinationType>(`/vaccination-types/${id}`, payload),
  remove: (id: number) => http.delete(`/vaccination-types/${id}`),
}
