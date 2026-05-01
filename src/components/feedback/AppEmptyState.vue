<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <div class="d-flex flex-column align-center justify-center pa-12 text-center">
    <v-icon v-if="icon" :icon="icon" size="48" color="grey-lighten-1" class="mb-3" />
    <p class="text-h6 text-medium-emphasis">{{ title }}</p>
    <p v-if="description" class="text-body-2 text-disabled mt-1">{{ description }}</p>
    <slot />
  </div>
</template>
