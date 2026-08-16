import { createCatalogStore } from '@/stores/createCatalogStore'
import type { MembershipSubModuleResponse } from '../types/membership-sub-modules.types'

export const useMembershipSubModulesStore =
  createCatalogStore<MembershipSubModuleResponse>('membership-sub-modules')
