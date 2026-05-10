export interface ConsultationType {
  id: number
  name: string
  description: string
  createdDate: string
}

export interface CreateConsultationTypeCommand {
  name: string
  description: string
}

export type UpdateConsultationTypeCommand = CreateConsultationTypeCommand
