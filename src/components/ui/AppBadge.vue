<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'neutral'
  label: string
}>()

const color = computed(() => {
  if (props.variant === 'success') return 'success'
  if (props.variant === 'warning') return 'warning'
  if (props.variant === 'danger') return 'error'
  return 'grey-lighten-1'
})
</script>

<template>
  <v-chip :color="color" size="small" variant="tonal" label>
    {{ label }}
  </v-chip>
</template>
