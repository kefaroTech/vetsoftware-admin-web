export interface ModuleResponse {
  id: number
  name: string
  code: string
  createdDate: string
}

export interface CreateModuleRequest {
  name: string
  code: string
}

export type UpdateModuleRequest = CreateModuleRequest
