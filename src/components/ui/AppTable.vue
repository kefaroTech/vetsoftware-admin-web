<script setup lang="ts">
defineProps<{
  headers: string[]
  empty?: boolean
}>()
</script>

<template>
  <div class="ds-card ds-card--flat tabla-caja">
    <div class="ds-table-scroll tabla-scroll">
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
  </div>
</template>

<style scoped>
/* La caja ya NO recorta: un `overflow:hidden` aquí dejaba las últimas columnas
   inalcanzables cuando la tabla es más ancha que el contenedor (WCAG 1.4.10
   Reflow). Quien recorta ahora es el envoltorio `.ds-table-scroll`, que además
   deja desplazarla en horizontal. */
.tabla-caja {
  padding: 0;
}

/* `.ds-table-scroll` aporta el `overflow-x:auto`; eso ya establece un contexto
   de recorte, así que basta con heredar el radio de la caja para conservar las
   esquinas redondeadas que antes recortaba el `overflow:hidden`. */
.tabla-scroll {
  border-radius: inherit;
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
