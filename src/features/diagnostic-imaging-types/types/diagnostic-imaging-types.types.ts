export interface DiagnosticImagingTypeCompanySummary {
  id: number
  name: string
}

export interface DiagnosticImagingTypeResponse {
  id: number
  name: string
  description: string
  company: DiagnosticImagingTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateDiagnosticImagingTypeRequest {
  name: string
  description: string
  general: boolean
}

export type UpdateDiagnosticImagingTypeRequest = CreateDiagnosticImagingTypeRequest
