<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  block?: boolean
}>()

/** Las tres variantes de esta consola, en primitivas del sistema de diseño. */
const clases = computed(() => [
  'ds-btn',
  props.variant === 'danger'
    ? 'ds-btn--danger-solid'
    : props.variant === 'secondary'
      ? 'ds-btn--ghost'
      : 'ds-btn--primary',
  props.block ? 'ds-flex-fill' : '',
])
</script>

<template>
  <button :type="type ?? 'button'" :class="clases" :disabled="disabled">
    <slot />
  </button>
</template>
