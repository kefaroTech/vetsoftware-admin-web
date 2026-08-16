import { http } from '@/services/http/http.client'
import type {
  CompanyResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../types/companies.types'

export const companiesApi = {
  async listAll(): Promise<CompanyResponse[]> {
    const { data } = await http.get<CompanyResponse[]>('/companies')
    return data
  },
  async findById(id: number): Promise<CompanyResponse> {
    const { data } = await http.get<CompanyResponse>(`/companies/${id}`)
    return data
  },
  async create(payload: CreateCompanyRequest): Promise<CompanyResponse> {
    const { data } = await http.post<CompanyResponse>('/companies', payload)
    return data
  },
  async update(id: number, payload: UpdateCompanyRequest): Promise<CompanyResponse> {
    const { data } = await http.put<CompanyResponse>(`/companies/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/companies/${id}`)
  },
}
