import { http } from '@/services/http/http.client'
import type {
  SpaTypeResponse,
  CreateSpaTypeRequest,
  UpdateSpaTypeRequest,
} from '../types/spa-types.types'

export const spaTypesApi = {
  async listAll(): Promise<SpaTypeResponse[]> {
    const { data } = await http.get<SpaTypeResponse[]>('/spa-types')
    return data
  },
  async findById(id: number): Promise<SpaTypeResponse> {
    const { data } = await http.get<SpaTypeResponse>(`/spa-types/${id}`)
    return data
  },
  async create(payload: CreateSpaTypeRequest): Promise<SpaTypeResponse> {
    const { data } = await http.post<SpaTypeResponse>('/spa-types', payload)
    return data
  },
  async update(id: number, payload: UpdateSpaTypeRequest): Promise<SpaTypeResponse> {
    const { data } = await http.put<SpaTypeResponse>(`/spa-types/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/spa-types/${id}`)
  },
}
