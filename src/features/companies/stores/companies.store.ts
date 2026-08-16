import { createCatalogStore } from '@/stores/createCatalogStore'
import type { CompanyResponse } from '../types/companies.types'

export const useCompaniesStore = createCatalogStore<CompanyResponse>('companies')
