export const PERMISSIONS = {
  COMPANY_CREATE: 'company.create',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
