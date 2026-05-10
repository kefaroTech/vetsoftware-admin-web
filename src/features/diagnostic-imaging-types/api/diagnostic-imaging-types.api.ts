import { http } from '@/services/http/http.client'
import type {
  DiagnosticImagingType,
  CreateDiagnosticImagingTypeCommand,
  UpdateDiagnosticImagingTypeCommand,
} from '../types/diagnostic-imaging-types.types'

export const diagnosticImagingTypesApi = {
  list: () => http.get<DiagnosticImagingType[]>('/diagnostic-imaging-types'),
  getById: (id: number) => http.get<DiagnosticImagingType>(`/diagnostic-imaging-types/${id}`),
  create: (payload: CreateDiagnosticImagingTypeCommand) =>
    http.post<DiagnosticImagingType>('/diagnostic-imaging-types', payload),
  update: (id: number, payload: UpdateDiagnosticImagingTypeCommand) =>
    http.put<DiagnosticImagingType>(`/diagnostic-imaging-types/${id}`, payload),
  remove: (id: number) => http.delete(`/diagnostic-imaging-types/${id}`),
}
