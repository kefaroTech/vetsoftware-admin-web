import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BasePermission } from '../types/base-permissions.types'

export const useBasePermissionsStore = createCatalogStore<BasePermission>('base-permissions')
