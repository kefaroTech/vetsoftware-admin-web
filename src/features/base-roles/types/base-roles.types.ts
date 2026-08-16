export interface BaseRoleResponse {
  id: number
  name: string
  code: string
  mandatory: boolean
  createdDate: string
}

export interface CreateBaseRoleRequest {
  name: string
  code: string
  mandatory: boolean
}

export type UpdateBaseRoleRequest = CreateBaseRoleRequest
