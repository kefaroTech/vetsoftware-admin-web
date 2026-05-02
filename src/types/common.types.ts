export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'
export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED'

export interface SelectOption<T = string | number> {
  label: string
  value: T
}

export interface IdNameSummary {
  id: number
  name: string
}

export interface IdNameCodeSummary extends IdNameSummary {
  code: string
}
