import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BaseRoleResponse } from '../types/base-roles.types'

export const useBaseRolesStore = createCatalogStore<BaseRoleResponse>('base-roles')
