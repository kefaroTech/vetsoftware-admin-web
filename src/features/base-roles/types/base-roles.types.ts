export interface BaseRole {
  id: number
  name: string
  code: string
  mandatory: boolean
  createdDate: string
}

export interface CreateBaseRoleCommand {
  name: string
  code: string
  mandatory: boolean
}

export type UpdateBaseRoleCommand = CreateBaseRoleCommand
