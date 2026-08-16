export interface SubmoduleModuleSummary {
  id: number
  name: string
  code: string
}

export interface SubModuleResponse {
  id: number
  name: string
  code: string
  module: SubmoduleModuleSummary
  createdDate: string
}

export interface CreateSubModuleRequest {
  name: string
  code: string
  moduleId: number
}

export type UpdateSubModuleRequest = CreateSubModuleRequest
