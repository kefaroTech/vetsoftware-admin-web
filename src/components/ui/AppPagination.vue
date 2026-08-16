<script setup lang="ts">
import { ICONS } from '@/constants/icons'

defineProps<{
  page: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}>()

defineEmits<{
  prev: []
  next: []
}>()
</script>

<template>
  <div class="d-flex align-center justify-space-between py-3">
    <span class="text-body-2 text-medium-emphasis">
      Página {{ page + 1 }} de {{ totalPages }}
    </span>
    <div class="d-flex ga-2">
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :disabled="!hasPrev"
        @click="$emit('prev')"
      >
        <component :is="ICONS.CHEVRON_LEFT" :size="14" />
        Anterior
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--sm"
        :disabled="!hasNext"
        @click="$emit('next')"
      >
        Siguiente
        <component :is="ICONS.CHEVRON_RIGHT" :size="14" />
      </button>
    </div>
  </div>
</template>
