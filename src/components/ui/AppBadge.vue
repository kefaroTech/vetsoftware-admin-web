<script setup lang="ts">
defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'neutral'
  label: string
}>()
</script>

<template>
  <span class="badge" :class="`badge--${variant ?? 'neutral'}`">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-9);
  border-radius: 6px;
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  line-height: 1.6;
}

.badge--neutral {
  background: var(--surface-muted);
  color: var(--text-muted);
}
.badge--success {
  background: oklch(95% 0.05 145deg);
  color: oklch(42% 0.14 145deg);
}
.badge--warning {
  background: oklch(96% 0.06 75deg);
  color: oklch(45% 0.13 75deg);
}
.badge--danger {
  background: var(--danger-50);
  color: var(--danger-700);
}
</style>
