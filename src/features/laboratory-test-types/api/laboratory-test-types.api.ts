import { http } from '@/services/http/http.client'
import type {
  LaboratoryTestType,
  CreateLaboratoryTestTypeCommand,
  UpdateLaboratoryTestTypeCommand,
} from '../types/laboratory-test-types.types'

export const laboratoryTestTypesApi = {
  list: () => http.get<LaboratoryTestType[]>('/laboratory-test-types'),
  getById: (id: number) => http.get<LaboratoryTestType>(`/laboratory-test-types/${id}`),
  create: (payload: CreateLaboratoryTestTypeCommand) =>
    http.post<LaboratoryTestType>('/laboratory-test-types', payload),
  update: (id: number, payload: UpdateLaboratoryTestTypeCommand) =>
    http.put<LaboratoryTestType>(`/laboratory-test-types/${id}`, payload),
  remove: (id: number) => http.delete(`/laboratory-test-types/${id}`),
}
