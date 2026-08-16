export interface ProblemDetailFieldError {
  field: string
  message: string
}

export interface ProblemDetail {
  type?: string
  title: string
  status: number
  detail: string
  instance?: string
  code: string
  traceId?: string
  errors?: ProblemDetailFieldError[]
}
