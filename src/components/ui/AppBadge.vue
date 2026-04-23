<script setup lang="ts">
defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'neutral'
  label: string
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variant === 'success'
        ? 'bg-green-100 text-green-800'
        : variant === 'warning'
          ? 'bg-yellow-100 text-yellow-800'
          : variant === 'danger'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800',
    ]"
  >
    {{ label }}
  </span>
</template>
