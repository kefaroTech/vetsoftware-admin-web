import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BaseRolePermissionResponse } from '../types/base-role-permissions.types'

export const useBaseRolePermissionsStore =
  createCatalogStore<BaseRolePermissionResponse>('base-role-permissions')
