import type { EmployeeStatus } from '@/types/common.types'

export interface EmployeeCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface Employee {
  id: number
  employeeCode: string
  name: string
  email: string
  status: EmployeeStatus
  company: EmployeeCompanySummary
  createdDate: string
  createdBy: number
}

export interface CreateEmployeeCommand {
  employeeCode: string
  password: string
  name: string
  email: string
  status: EmployeeStatus
  companyId: number
  createdBy: number
}

export interface UpdateEmployeeCommand {
  employeeCode: string
  name: string
  email: string
  status: EmployeeStatus
}
