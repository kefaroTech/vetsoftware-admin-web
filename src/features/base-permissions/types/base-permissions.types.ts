export interface BasePermissionSubModuleSummary {
  id: number
  name: string
  code: string
}

export interface BasePermissionResponse {
  id: number
  name: string
  code: string
  subModule: BasePermissionSubModuleSummary
  createdDate: string
}

export interface CreateBasePermissionRequest {
  name: string
  code: string
  subModuleId: number
}

export type UpdateBasePermissionRequest = CreateBasePermissionRequest
