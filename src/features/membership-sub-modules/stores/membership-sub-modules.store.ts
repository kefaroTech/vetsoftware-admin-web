import { createCatalogStore } from '@/stores/createCatalogStore'
import type { MembershipSubModule } from '../types/membership-sub-modules.types'

export const useMembershipSubModulesStore =
  createCatalogStore<MembershipSubModule>('membership-sub-modules')
