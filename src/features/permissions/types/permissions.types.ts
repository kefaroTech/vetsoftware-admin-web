export interface PermissionCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface PermissionSubModuleSummary {
  id: number
  name: string
  code: string
}

export interface Permission {
  id: number
  name: string
  code: string
  company: PermissionCompanySummary
  subModule: PermissionSubModuleSummary
  createdDate: string
}

export interface CreatePermissionCommand {
  name: string
  code: string
  companyId: number
  subModuleId: number
}

export type UpdatePermissionCommand = CreatePermissionCommand
