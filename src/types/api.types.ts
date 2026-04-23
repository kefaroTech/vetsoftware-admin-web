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

export interface ApiError {
  message: string
  status: number
  timestamp: string
}
