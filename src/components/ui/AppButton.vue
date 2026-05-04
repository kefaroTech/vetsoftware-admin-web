<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  block?: boolean
}>()

const color = computed(() => {
  if (props.variant === 'danger') return 'error'
  if (props.variant === 'secondary') return undefined
  return 'primary'
})

const btnVariant = computed(() => (props.variant === 'secondary' ? 'outlined' : 'elevated'))
</script>

<template>
  <v-btn
    :type="type ?? 'button'"
    :color="color"
    :variant="btnVariant"
    :disabled="disabled"
    :block="block"
  >
    <slot />
  </v-btn>
</template>
