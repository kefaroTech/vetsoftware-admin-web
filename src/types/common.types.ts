export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'
export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED'

export interface SelectOption<T = string | number> {
  label: string
  value: T
}
