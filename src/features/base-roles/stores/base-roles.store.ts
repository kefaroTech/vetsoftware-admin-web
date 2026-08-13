import { createCatalogStore } from '@/stores/createCatalogStore'
import type { BaseRole } from '../types/base-roles.types'

export const useBaseRolesStore = createCatalogStore<BaseRole>('base-roles')
