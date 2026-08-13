import { createCatalogStore } from '@/stores/createCatalogStore'
import type { Company } from '../types/companies.types'

export const useCompaniesStore = createCatalogStore<Company>('companies')
