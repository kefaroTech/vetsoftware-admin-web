import { http } from '@/services/http/http.client'
import type { BreedResponse, CreateBreedRequest, UpdateBreedRequest } from '../types/breeds.types'

export const breedsApi = {
  async listAll(): Promise<BreedResponse[]> {
    const { data } = await http.get<BreedResponse[]>('/breeds')
    return data
  },
  async listBySpecie(specieId: number): Promise<BreedResponse[]> {
    const { data } = await http.get<BreedResponse[]>(`/species/${specieId}/breeds`)
    return data
  },
  async findById(id: number): Promise<BreedResponse> {
    const { data } = await http.get<BreedResponse>(`/breeds/${id}`)
    return data
  },
  async create(payload: CreateBreedRequest): Promise<BreedResponse> {
    const { data } = await http.post<BreedResponse>('/breeds', payload)
    return data
  },
  async update(id: number, payload: UpdateBreedRequest): Promise<BreedResponse> {
    const { data } = await http.put<BreedResponse>(`/breeds/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/breeds/${id}`)
  },
}
