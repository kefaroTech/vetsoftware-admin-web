import { http } from '@/services/http/http.client'
import type { Specie, CreateSpecieCommand, UpdateSpecieCommand } from '../types/species.types'

export const speciesApi = {
  list: () => http.get<Specie[]>('/species'),
  getById: (id: number) => http.get<Specie>(`/species/${id}`),
  create: (payload: CreateSpecieCommand) => http.post<Specie>('/species', payload),
  update: (id: number, payload: UpdateSpecieCommand) => http.put<Specie>(`/species/${id}`, payload),
  remove: (id: number) => http.delete(`/species/${id}`),
}
