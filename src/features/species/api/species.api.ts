import { http } from '@/services/http/http.client'
import type {
  SpecieResponse,
  CreateSpecieRequest,
  UpdateSpecieRequest,
} from '../types/species.types'

export const speciesApi = {
  async listAll(): Promise<SpecieResponse[]> {
    const { data } = await http.get<SpecieResponse[]>('/species')
    return data
  },
  async findById(id: number): Promise<SpecieResponse> {
    const { data } = await http.get<SpecieResponse>(`/species/${id}`)
    return data
  },
  async create(payload: CreateSpecieRequest): Promise<SpecieResponse> {
    const { data } = await http.post<SpecieResponse>('/species', payload)
    return data
  },
  async update(id: number, payload: UpdateSpecieRequest): Promise<SpecieResponse> {
    const { data } = await http.put<SpecieResponse>(`/species/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/species/${id}`)
  },
}
