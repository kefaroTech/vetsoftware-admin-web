import { http } from '@/services/http/http.client'
import type { CityResponse, CountryResponse, StateResponse } from '../types/company-locations.types'

export const companyLocationsApi = {
  async listCountries(): Promise<CountryResponse[]> {
    const { data } = await http.get<CountryResponse[]>('/countries')
    return data
  },
  async findStateById(id: number): Promise<StateResponse> {
    const { data } = await http.get<StateResponse>(`/states/${id}`)
    return data
  },
  async listStatesByCountry(countryId: number): Promise<StateResponse[]> {
    const { data } = await http.get<StateResponse[]>(`/countries/${countryId}/states`)
    return data
  },
  async findCityById(id: number): Promise<CityResponse> {
    const { data } = await http.get<CityResponse>(`/cities/${id}`)
    return data
  },
  async listCitiesByState(stateId: number): Promise<CityResponse[]> {
    const { data } = await http.get<CityResponse[]>(`/states/${stateId}/cities`)
    return data
  },
}
