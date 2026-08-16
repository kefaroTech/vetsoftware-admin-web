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

export interface BaseRolePermissionResponse {
  id: number
  baseRole: BaseRoleSummary
  basePermission: BasePermissionSummary
  createdDate: string
}

export interface CreateBaseRolePermissionRequest {
  baseRoleId: number
  basePermissionId: number
}

export type UpdateBaseRolePermissionRequest = CreateBaseRolePermissionRequest
