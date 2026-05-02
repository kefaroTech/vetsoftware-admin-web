export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

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
