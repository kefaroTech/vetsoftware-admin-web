export interface BasePermissionSubModuleSummary {
  id: number
  name: string
  code: string
}

export interface BasePermission {
  id: number
  name: string
  code: string
  subModule: BasePermissionSubModuleSummary
  createdDate: string
}

export interface CreateBasePermissionCommand {
  name: string
  code: string
  subModuleId: number
}

export type UpdateBasePermissionCommand = CreateBasePermissionCommand
