import { http } from '@/services/http/http.client'
import type {
  DiagnosticImagingTypeResponse,
  CreateDiagnosticImagingTypeRequest,
  UpdateDiagnosticImagingTypeRequest,
} from '../types/diagnostic-imaging-types.types'

export const diagnosticImagingTypesApi = {
  async listAll(): Promise<DiagnosticImagingTypeResponse[]> {
    const { data } = await http.get<DiagnosticImagingTypeResponse[]>('/diagnostic-imaging-types')
    return data
  },
  async findById(id: number): Promise<DiagnosticImagingTypeResponse> {
    const { data } = await http.get<DiagnosticImagingTypeResponse>(
      `/diagnostic-imaging-types/${id}`,
    )
    return data
  },
  async create(
    payload: CreateDiagnosticImagingTypeRequest,
  ): Promise<DiagnosticImagingTypeResponse> {
    const { data } = await http.post<DiagnosticImagingTypeResponse>(
      '/diagnostic-imaging-types',
      payload,
    )
    return data
  },
  async update(
    id: number,
    payload: UpdateDiagnosticImagingTypeRequest,
  ): Promise<DiagnosticImagingTypeResponse> {
    const { data } = await http.put<DiagnosticImagingTypeResponse>(
      `/diagnostic-imaging-types/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/diagnostic-imaging-types/${id}`)
  },
}
