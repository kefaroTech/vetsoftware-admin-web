export interface CountryResponse {
  id: number
  name: string
  createdDate: string
  enabled: boolean
}

export interface CountrySummary {
  id: number
  name: string
}

export interface StateResponse {
  id: number
  name: string
  country: CountrySummary
  daneCode: string | null
  createdDate: string
  enabled: boolean
}

export interface StateSummary {
  id: number
  name: string
}

export interface CityResponse {
  id: number
  name: string
  state: StateSummary
  daneCode: string | null
  createdDate: string
  enabled: boolean
}

export interface CompanyLocationContext {
  countryId: number
  stateId: number
  cityId: number
}
