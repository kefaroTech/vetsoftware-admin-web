import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCompanyLocationsStore } from '../stores/company-locations.store'
import { useToast } from '@/composables/useToast'

export function useCompanyLocations() {
  const store = useCompanyLocationsStore()
  const { countries, states, cities, loadingCountries, loadingStates, loadingCities, error } =
    storeToRefs(store)
  const { errorFrom } = useToast()

  const countryOptions = computed(() =>
    countries.value.map((country) => ({ value: country.id, label: country.name })),
  )
  const stateOptions = computed(() =>
    states.value.map((state) => ({ value: state.id, label: state.name })),
  )
  const cityOptions = computed(() =>
    cities.value.map((city) => ({ value: city.id, label: city.name })),
  )

  async function run<T>(title: string, fallback: string, action: () => Promise<T>) {
    try {
      store.setError(null)
      return await action()
    } catch (cause) {
      store.setError(fallback)
      errorFrom(title, cause, fallback)
      throw cause
    }
  }

  return {
    countryOptions,
    stateOptions,
    cityOptions,
    loadingCountries,
    loadingStates,
    loadingCities,
    error,
    loadCountries: () =>
      run('Error al cargar los países', 'No se pudieron cargar los países.', store.loadCountries),
    loadStates: (countryId: number) =>
      run('Error al cargar los departamentos', 'No se pudieron cargar los departamentos.', () =>
        store.loadStates(countryId),
      ),
    loadCities: (stateId: number) =>
      run('Error al cargar las ciudades', 'No se pudieron cargar las ciudades.', () =>
        store.loadCities(stateId),
      ),
    resolveCity: (cityId: number) =>
      run('Error al cargar la ubicación', 'No se pudo cargar la ubicación de la empresa.', () =>
        store.resolveCity(cityId),
      ),
    clearStatesAndCities: store.clearStatesAndCities,
    clearCities: store.clearCities,
  }
}
