import { http } from '@/services/http/http.client'
import type { Company, CreateCompanyCommand, UpdateCompanyCommand } from '../types/companies.types'

export const companiesApi = {
  list: () => http.get<Company[]>('/companies'),
  getById: (id: number) => http.get<Company>(`/companies/${id}`),
  create: (payload: CreateCompanyCommand) => http.post<Company>('/companies', payload),
  update: (id: number, payload: UpdateCompanyCommand) =>
    http.put<Company>(`/companies/${id}`, payload),
  remove: (id: number) => http.delete(`/companies/${id}`),
}
