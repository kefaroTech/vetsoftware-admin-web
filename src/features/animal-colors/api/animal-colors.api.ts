import { http } from '@/services/http/http.client'
import type {
  AnimalColorResponse,
  CreateAnimalColorRequest,
  UpdateAnimalColorRequest,
} from '../types/animal-colors.types'

export const animalColorsApi = {
  async listAll(): Promise<AnimalColorResponse[]> {
    const { data } = await http.get<AnimalColorResponse[]>('/animal-colors')
    return data
  },
  async listBySpecie(specieId: number): Promise<AnimalColorResponse[]> {
    const { data } = await http.get<AnimalColorResponse[]>(`/species/${specieId}/animal-colors`)
    return data
  },
  async findById(id: number): Promise<AnimalColorResponse> {
    const { data } = await http.get<AnimalColorResponse>(`/animal-colors/${id}`)
    return data
  },
  async create(payload: CreateAnimalColorRequest): Promise<AnimalColorResponse> {
    const { data } = await http.post<AnimalColorResponse>('/animal-colors', payload)
    return data
  },
  async update(id: number, payload: UpdateAnimalColorRequest): Promise<AnimalColorResponse> {
    const { data } = await http.put<AnimalColorResponse>(`/animal-colors/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/animal-colors/${id}`)
  },
}
