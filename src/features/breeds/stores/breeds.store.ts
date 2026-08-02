import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Breed } from '../types/breeds.types'

export const useBreedsStore = defineStore('breeds', () => {
  const breeds = ref<Breed[]>([])
  const selected = ref<Breed | null>(null)
  const loading = ref(false)

  function setBreeds(data: Breed[]) {
    breeds.value = data
  }
  function setSelected(b: Breed | null) {
    selected.value = b
  }
  function setLoading(value: boolean) {
    loading.value = value
  }

  return { breeds, selected, loading, setBreeds, setSelected, setLoading }
})
