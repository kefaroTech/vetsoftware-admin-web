import { createCatalogStore } from '@/stores/createCatalogStore'
import type { LaboratoryTestType } from '../types/laboratory-test-types.types'

export const useLaboratoryTestTypesStore =
  createCatalogStore<LaboratoryTestType>('laboratoryTestTypes')
