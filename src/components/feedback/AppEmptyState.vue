<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{
  title: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <div class="d-flex flex-column align-center justify-center pa-12 text-center">
    <component :is="icon" v-if="icon" :size="48" class="mb-3 empty-icon" />
    <p class="text-h6 text-medium-emphasis">{{ title }}</p>
    <p v-if="description" class="text-body-2 text-disabled mt-1">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-icon {
  color: var(--warm-400);
}
</style>
