import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AnimalColor } from '../types/animal-colors.types'

export const useAnimalColorsStore = defineStore('animal-colors', () => {
  const colors = ref<AnimalColor[]>([])
  const selected = ref<AnimalColor | null>(null)
  const loading = ref(false)

  function setColors(data: AnimalColor[]) {
    colors.value = data
  }
  function setSelected(c: AnimalColor | null) {
    selected.value = c
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { colors, selected, loading, setColors, setSelected, setLoading }
})
