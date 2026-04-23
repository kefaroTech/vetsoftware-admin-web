import { ref, computed } from 'vue'

export function usePagination(defaultPageSize = 10) {
  const page = ref(0)
  const size = ref(defaultPageSize)
  const totalElements = ref(0)

  const totalPages = computed(() => Math.ceil(totalElements.value / size.value))
  const hasPrev = computed(() => page.value > 0)
  const hasNext = computed(() => page.value < totalPages.value - 1)

  function goTo(p: number) {
    page.value = p
  }
  function next() {
    if (hasNext.value) page.value++
  }
  function prev() {
    if (hasPrev.value) page.value--
  }
  function reset() {
    page.value = 0
  }

  return { page, size, totalElements, totalPages, hasPrev, hasNext, goTo, next, prev, reset }
}
