import type { EmployeeStatus } from '@/types/common.types'

export interface Employee {
  id: number
  employeeCode: string
  name: string
  email: string
  status: EmployeeStatus
  companyId: number
  createdDate: string
}

export interface CreateEmployeeCommand {
  employeeCode: string
  name: string
  email: string
  password: string
  companyId: number
}

export interface UpdateEmployeeCommand {
  name: string
  email: string
  status: EmployeeStatus
}
