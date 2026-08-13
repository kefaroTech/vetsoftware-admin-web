import { createCatalogStore } from '@/stores/createCatalogStore'
import type { Membership } from '../types/memberships.types'

export const useMembershipsStore = createCatalogStore<Membership>('memberships')
