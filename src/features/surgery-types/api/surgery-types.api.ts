import { http } from '@/services/http/http.client'
import type {
  SurgeryTypeResponse,
  CreateSurgeryTypeRequest,
  UpdateSurgeryTypeRequest,
} from '../types/surgery-types.types'

export const surgeryTypesApi = {
  async listAll(): Promise<SurgeryTypeResponse[]> {
    const { data } = await http.get<SurgeryTypeResponse[]>('/surgery-types')
    return data
  },
  async findById(id: number): Promise<SurgeryTypeResponse> {
    const { data } = await http.get<SurgeryTypeResponse>(`/surgery-types/${id}`)
    return data
  },
  async create(payload: CreateSurgeryTypeRequest): Promise<SurgeryTypeResponse> {
    const { data } = await http.post<SurgeryTypeResponse>('/surgery-types', payload)
    return data
  },
  async update(id: number, payload: UpdateSurgeryTypeRequest): Promise<SurgeryTypeResponse> {
    const { data } = await http.put<SurgeryTypeResponse>(`/surgery-types/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/surgery-types/${id}`)
  },
}
