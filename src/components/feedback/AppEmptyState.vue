<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <p class="text-lg font-medium text-gray-700">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-gray-400">{{ description }}</p>
    <slot />
  </div>
</template>
