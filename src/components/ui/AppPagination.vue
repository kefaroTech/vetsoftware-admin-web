<script setup lang="ts">
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
  <div class="flex items-center justify-between py-3">
    <span class="text-sm text-gray-500">Página {{ page + 1 }} de {{ totalPages }}</span>
    <div class="flex gap-2">
      <button
        :disabled="!hasPrev"
        class="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
        @click="$emit('prev')"
      >
        ← Anterior
      </button>
      <button
        :disabled="!hasNext"
        class="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
        @click="$emit('next')"
      >
        Siguiente →
      </button>
    </div>
  </div>
</template>
