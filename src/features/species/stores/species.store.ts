import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Specie } from '../types/species.types'

export const useSpeciesStore = defineStore('species', () => {
  const species = ref<Specie[]>([])
  const selected = ref<Specie | null>(null)
  const loading = ref(false)

  function setSpecies(data: Specie[]) { species.value = data }
  function setSelected(s: Specie | null) { selected.value = s }
  function setLoading(value: boolean) { loading.value = value }

  return { species, selected, loading, setSpecies, setSelected, setLoading }
})
