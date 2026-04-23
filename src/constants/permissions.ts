export const PERMISSIONS = {
  ADMIN_ALL: 'admin.all',
  COMPANY_CREATE: 'company.create',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
