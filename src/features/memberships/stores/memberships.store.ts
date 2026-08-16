import { createCatalogStore } from '@/stores/createCatalogStore'
import type { MembershipResponse } from '../types/memberships.types'

export const useMembershipsStore = createCatalogStore<MembershipResponse>('memberships')
