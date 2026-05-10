export interface DiagnosticImagingTypeCompanySummary {
  id: number
  name: string
}

export interface DiagnosticImagingType {
  id: number
  name: string
  description: string
  company: DiagnosticImagingTypeCompanySummary | null
  general: boolean
  createdDate: string
}

export interface CreateDiagnosticImagingTypeCommand {
  name: string
  description: string
  companyId: number | null
  general: boolean
}

export type UpdateDiagnosticImagingTypeCommand = CreateDiagnosticImagingTypeCommand
