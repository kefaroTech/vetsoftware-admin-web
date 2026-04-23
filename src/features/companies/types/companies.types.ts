export interface Company {
  id: number
  name: string
  identifier: string
  address: string
  contactNumber: string
  createdDate: string
}

export interface CreateCompanyCommand {
  name: string
  identifier: string
  address: string
  contactNumber: string
}

export type UpdateCompanyCommand = CreateCompanyCommand
