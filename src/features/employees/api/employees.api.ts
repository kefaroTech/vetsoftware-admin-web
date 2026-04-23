import { http } from '@/services/http/http.client'
import type { Employee, CreateEmployeeCommand, UpdateEmployeeCommand } from '../types/employees.types'

export const employeesApi = {
  list: () => http.get<Employee[]>('/employees'),
  getById: (id: number) => http.get<Employee>(`/employees/${id}`),
  create: (payload: CreateEmployeeCommand) => http.post<Employee>('/employees', payload),
  update: (id: number, payload: UpdateEmployeeCommand) =>
    http.put<Employee>(`/employees/${id}`, payload),
  remove: (id: number) => http.delete(`/employees/${id}`),
}
