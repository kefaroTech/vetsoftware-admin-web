import { http } from '@/services/http/http.client'
import type {
  ModuleResponse,
  CreateModuleRequest,
  UpdateModuleRequest,
} from '../types/modules.types'

export const modulesApi = {
  async listAll(): Promise<ModuleResponse[]> {
    const { data } = await http.get<ModuleResponse[]>('/modules')
    return data
  },
  async findById(id: number): Promise<ModuleResponse> {
    const { data } = await http.get<ModuleResponse>(`/modules/${id}`)
    return data
  },
  async create(payload: CreateModuleRequest): Promise<ModuleResponse> {
    const { data } = await http.post<ModuleResponse>('/modules', payload)
    return data
  },
  async update(id: number, payload: UpdateModuleRequest): Promise<ModuleResponse> {
    const { data } = await http.put<ModuleResponse>(`/modules/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/modules/${id}`)
  },
}
