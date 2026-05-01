export interface Permission {
  id: number
  name: string
  code: string
  companyId: number
  subModuleId: number
  createdDate: string
}

export interface CreatePermissionCommand {
  name: string
  code: string
  companyId: number
  subModuleId: number
}

export type UpdatePermissionCommand = CreatePermissionCommand
