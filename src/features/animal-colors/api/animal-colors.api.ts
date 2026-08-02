import { http } from '@/services/http/http.client'
import type {
  AnimalColor,
  CreateAnimalColorCommand,
  UpdateAnimalColorCommand,
} from '../types/animal-colors.types'

export const animalColorsApi = {
  list: () => http.get<AnimalColor[]>('/animal-colors'),
  getById: (id: number) => http.get<AnimalColor>(`/animal-colors/${id}`),
  create: (payload: CreateAnimalColorCommand) => http.post<AnimalColor>('/animal-colors', payload),
  update: (id: number, payload: UpdateAnimalColorCommand) =>
    http.put<AnimalColor>(`/animal-colors/${id}`, payload),
  remove: (id: number) => http.delete(`/animal-colors/${id}`),
}
