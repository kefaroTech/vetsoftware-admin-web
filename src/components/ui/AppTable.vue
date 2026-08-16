<script setup lang="ts">
defineProps<{
  headers: string[]
  empty?: boolean
}>()
</script>

<template>
  <div class="ds-card ds-card--flat tabla-caja">
    <table class="tabla">
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="empty">
          <td :colspan="headers.length" class="ds-empty ds-empty--tight">Sin resultados</td>
        </tr>
        <slot v-else />
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* La caja recorta las esquinas de la tabla, que no las hereda del borde. */
.tabla-caja {
  padding: 0;
  overflow: hidden;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.tabla th {
  padding: var(--space-12) var(--space-16);
  text-align: left;
  color: var(--text-muted);
  font-weight: var(--weight-medium);
  border-bottom: 1px solid var(--border);
}

.tabla :deep(td) {
  padding: var(--space-12) var(--space-16);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.tabla :deep(tr:last-child td) {
  border-bottom: none;
}

.tabla :deep(tbody tr:hover) {
  background: var(--surface-muted);
}
</style>
