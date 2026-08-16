import { http } from '@/services/http/http.client'
import type {
  ConsultationTypeResponse,
  CreateConsultationTypeRequest,
  UpdateConsultationTypeRequest,
} from '../types/consultation-types.types'

export const consultationTypesApi = {
  async listAll(): Promise<ConsultationTypeResponse[]> {
    const { data } = await http.get<ConsultationTypeResponse[]>('/consultation-types')
    return data
  },
  async findById(id: number): Promise<ConsultationTypeResponse> {
    const { data } = await http.get<ConsultationTypeResponse>(`/consultation-types/${id}`)
    return data
  },
  async create(payload: CreateConsultationTypeRequest): Promise<ConsultationTypeResponse> {
    const { data } = await http.post<ConsultationTypeResponse>('/consultation-types', payload)
    return data
  },
  async update(
    id: number,
    payload: UpdateConsultationTypeRequest,
  ): Promise<ConsultationTypeResponse> {
    const { data } = await http.put<ConsultationTypeResponse>(`/consultation-types/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/consultation-types/${id}`)
  },
}
