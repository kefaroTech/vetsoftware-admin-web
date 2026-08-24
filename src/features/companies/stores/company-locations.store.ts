import { defineStore } from 'pinia'
import { ref } from 'vue'
import { companyLocationsApi } from '../api/company-locations.api'
import type {
  CityResponse,
  CompanyLocationContext,
  CountryResponse,
  StateResponse,
} from '../types/company-locations.types'

export const useCompanyLocationsStore = defineStore('company-locations', () => {
  const countries = ref<CountryResponse[]>([])
  const states = ref<StateResponse[]>([])
  const cities = ref<CityResponse[]>([])
  const loadingCountries = ref(false)
  const loadingStates = ref(false)
  const loadingCities = ref(false)
  const error = ref<string | null>(null)

  let countriesInFlight: Promise<CountryResponse[]> | null = null
  const statesCache = new Map<number, StateResponse[]>()
  const citiesCache = new Map<number, CityResponse[]>()
  const statesInFlight = new Map<number, Promise<StateResponse[]>>()
  const citiesInFlight = new Map<number, Promise<CityResponse[]>>()

  async function loadCountries() {
    if (countries.value.length > 0) return countries.value
    countriesInFlight ??= companyLocationsApi.listCountries()
    loadingCountries.value = true
    error.value = null
    try {
      countries.value = await countriesInFlight
      return countries.value
    } finally {
      countriesInFlight = null
      loadingCountries.value = false
    }
  }

  async function loadStates(countryId: number) {
    const cached = statesCache.get(countryId)
    if (cached) {
      states.value = cached
      return cached
    }
    let request = statesInFlight.get(countryId)
    if (!request) {
      request = companyLocationsApi.listStatesByCountry(countryId)
      statesInFlight.set(countryId, request)
    }
    loadingStates.value = true
    error.value = null
    try {
      const rows = await request
      statesCache.set(countryId, rows)
      states.value = rows
      return rows
    } finally {
      statesInFlight.delete(countryId)
      loadingStates.value = false
    }
  }

  async function loadCities(stateId: number) {
    const cached = citiesCache.get(stateId)
    if (cached) {
      cities.value = cached
      return cached
    }
    let request = citiesInFlight.get(stateId)
    if (!request) {
      request = companyLocationsApi.listCitiesByState(stateId)
      citiesInFlight.set(stateId, request)
    }
    loadingCities.value = true
    error.value = null
    try {
      const rows = await request
      citiesCache.set(stateId, rows)
      cities.value = rows
      return rows
    } finally {
      citiesInFlight.delete(stateId)
      loadingCities.value = false
    }
  }

  async function resolveCity(cityId: number): Promise<CompanyLocationContext> {
    const city = await companyLocationsApi.findCityById(cityId)
    const state = await companyLocationsApi.findStateById(city.state.id)
    await Promise.all([loadCountries(), loadStates(state.country.id), loadCities(state.id)])
    return { countryId: state.country.id, stateId: state.id, cityId: city.id }
  }

  function clearStatesAndCities() {
    states.value = []
    cities.value = []
  }

  function clearCities() {
    cities.value = []
  }

  function setError(message: string | null) {
    error.value = message
  }

  return {
    countries,
    states,
    cities,
    loadingCountries,
    loadingStates,
    loadingCities,
    error,
    loadCountries,
    loadStates,
    loadCities,
    resolveCity,
    clearStatesAndCities,
    clearCities,
    setError,
  }
})
