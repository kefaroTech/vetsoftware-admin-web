import { http } from '@/services/http/http.client'
import type {
  SubModuleResponse,
  CreateSubModuleRequest,
  UpdateSubModuleRequest,
} from '../types/submodules.types'

export const submodulesApi = {
  async listAll(): Promise<SubModuleResponse[]> {
    const { data } = await http.get<SubModuleResponse[]>('/sub-modules')
    return data
  },
  async findById(id: number): Promise<SubModuleResponse> {
    const { data } = await http.get<SubModuleResponse>(`/sub-modules/${id}`)
    return data
  },
  async create(payload: CreateSubModuleRequest): Promise<SubModuleResponse> {
    const { data } = await http.post<SubModuleResponse>('/sub-modules', payload)
    return data
  },
  async update(id: number, payload: UpdateSubModuleRequest): Promise<SubModuleResponse> {
    const { data } = await http.put<SubModuleResponse>(`/sub-modules/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/sub-modules/${id}`)
  },
}
