<script setup lang="ts">
defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'neutral'
  label: string
}>()

/**
 * El tono `success` NO tiene clase local: su par (`--success-bg`/`--success-fg`)
 * ya está declarado como `.ds-tone--success` en `primitives.css`, y reescribirlo
 * aquí es exactamente lo que rechaza `vetsoftware/no-duplicate-primitive`.
 *
 * Los otros tres SÍ la conservan porque no coinciden con ninguna primitiva:
 * `.ds-tone--danger` usa `--danger-200`/`--danger-700` y este badge usa
 * `--danger-50`, que es un fondo más claro pensado para texto pequeño sobre
 * fila de tabla. Mapear los cuatro a `.ds-tone--*` habría cambiado el color de
 * dos tonos, que es justo lo que esta capa evita.
 */
const TONE_CLASS = {
  success: 'ds-tone--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  neutral: 'badge--neutral',
} as const
</script>

<template>
  <span class="badge" :class="TONE_CLASS[variant ?? 'neutral']">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-9);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  line-height: 1.6;
}

.badge--neutral {
  background: var(--surface-muted);
  color: var(--text-muted);
}

/* DS-01: eran cuatro literales `oklch` fuera de la escala. Los pares
   semánticos ya existen en `tokens.css` y están medidos contra §1.4.3. */
.badge--warning {
  background: var(--warning-bg);
  color: var(--warning-fg);
}

.badge--danger {
  background: var(--danger-50);
  color: var(--danger-700);
}
</style>
