export interface BaseRoleSummary {
  id: number
  name: string
  code: string
}

export interface BasePermissionSummary {
  id: number
  name: string
  code: string
}

export interface BaseRolePermission {
  id: number
  baseRole: BaseRoleSummary
  basePermission: BasePermissionSummary
  createdDate: string
}

export interface CreateBaseRolePermissionCommand {
  baseRoleId: number
  basePermissionId: number
}

export type UpdateBaseRolePermissionCommand = CreateBaseRolePermissionCommand
