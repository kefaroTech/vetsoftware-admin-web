export interface BasePermission {
  id: number
  name: string
  code: string
  subModuleId: number
  createdDate: string
}

export interface CreateBasePermissionCommand {
  name: string
  code: string
  subModuleId: number
}

export type UpdateBasePermissionCommand = CreateBasePermissionCommand
