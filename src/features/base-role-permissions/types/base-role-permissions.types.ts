export interface BaseRolePermission {
  id: number
  baseRoleId: number
  basePermissionId: number
  createdDate: string
}

export interface CreateBaseRolePermissionCommand {
  baseRoleId: number
  basePermissionId: number
}

export type UpdateBaseRolePermissionCommand = CreateBaseRolePermissionCommand
