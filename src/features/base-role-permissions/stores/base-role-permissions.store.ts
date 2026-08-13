import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BaseRolePermission } from '../types/base-role-permissions.types'

export const useBaseRolePermissionsStore =
  createCatalogStore<BaseRolePermission>('base-role-permissions')
