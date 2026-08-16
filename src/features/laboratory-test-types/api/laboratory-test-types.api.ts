import { http } from '@/services/http/http.client'
import type {
  LaboratoryTestTypeResponse,
  CreateLaboratoryTestTypeRequest,
  UpdateLaboratoryTestTypeRequest,
} from '../types/laboratory-test-types.types'

export const laboratoryTestTypesApi = {
  async listAll(): Promise<LaboratoryTestTypeResponse[]> {
    const { data } = await http.get<LaboratoryTestTypeResponse[]>('/laboratory-test-types')
    return data
  },
  async findById(id: number): Promise<LaboratoryTestTypeResponse> {
    const { data } = await http.get<LaboratoryTestTypeResponse>(`/laboratory-test-types/${id}`)
    return data
  },
  async create(payload: CreateLaboratoryTestTypeRequest): Promise<LaboratoryTestTypeResponse> {
    const { data } = await http.post<LaboratoryTestTypeResponse>('/laboratory-test-types', payload)
    return data
  },
  async update(
    id: number,
    payload: UpdateLaboratoryTestTypeRequest,
  ): Promise<LaboratoryTestTypeResponse> {
    const { data } = await http.put<LaboratoryTestTypeResponse>(
      `/laboratory-test-types/${id}`,
      payload,
    )
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/laboratory-test-types/${id}`)
  },
}
