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
      <v-btn
        variant="outlined"
        size="small"
        :disabled="!hasPrev"
        :prepend-icon="ICONS.CHEVRON_LEFT"
        @click="$emit('prev')"
      >
        Anterior
      </v-btn>
      <v-btn
        variant="outlined"
        size="small"
        :disabled="!hasNext"
        :append-icon="ICONS.CHEVRON_RIGHT"
        @click="$emit('next')"
      >
        Siguiente
      </v-btn>
    </div>
  </div>
</template>
