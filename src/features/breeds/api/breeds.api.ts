import { http } from '@/services/http/http.client'
import type { Breed, CreateBreedCommand, UpdateBreedCommand } from '../types/breeds.types'

export const breedsApi = {
  list: () => http.get<Breed[]>('/breeds'),
  listBySpecie: (specieId: number) => http.get<Breed[]>(`/species/${specieId}/breeds`),
  getById: (id: number) => http.get<Breed>(`/breeds/${id}`),
  create: (payload: CreateBreedCommand) => http.post<Breed>('/breeds', payload),
  update: (id: number, payload: UpdateBreedCommand) => http.put<Breed>(`/breeds/${id}`, payload),
  remove: (id: number) => http.delete(`/breeds/${id}`),
}
