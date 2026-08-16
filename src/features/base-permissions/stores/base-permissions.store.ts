import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BasePermissionResponse } from '../types/base-permissions.types'

export const useBasePermissionsStore =
  createCatalogStore<BasePermissionResponse>('base-permissions')
