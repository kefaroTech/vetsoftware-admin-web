import { http } from '@/services/http/http.client'
import type {
  VaccinationTypeResponse,
  CreateVaccinationTypeRequest,
  UpdateVaccinationTypeRequest,
} from '../types/vaccination-types.types'

export const vaccinationTypesApi = {
  async listAll(): Promise<VaccinationTypeResponse[]> {
    const { data } = await http.get<VaccinationTypeResponse[]>('/vaccination-types')
    return data
  },
  async findById(id: number): Promise<VaccinationTypeResponse> {
    const { data } = await http.get<VaccinationTypeResponse>(`/vaccination-types/${id}`)
    return data
  },
  async create(payload: CreateVaccinationTypeRequest): Promise<VaccinationTypeResponse> {
    const { data } = await http.post<VaccinationTypeResponse>('/vaccination-types', payload)
    return data
  },
  async update(
    id: number,
    payload: UpdateVaccinationTypeRequest,
  ): Promise<VaccinationTypeResponse> {
    const { data } = await http.put<VaccinationTypeResponse>(`/vaccination-types/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/vaccination-types/${id}`)
  },
}
