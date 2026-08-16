import { createCatalogStore } from '@/stores/createCatalogStore'
import type { LaboratoryTestTypeResponse } from '../types/laboratory-test-types.types'

export const useLaboratoryTestTypesStore =
  createCatalogStore<LaboratoryTestTypeResponse>('laboratoryTestTypes')
