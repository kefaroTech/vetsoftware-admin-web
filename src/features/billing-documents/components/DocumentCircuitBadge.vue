<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { IssueStatus } from '@/features/billing-operations/types/billing-operations.types'
import { ISSUE_STATUS_PRESENTATION } from '../types/billing-documents.types'

/**
 * <b>El estado del circuito, que es una columna y no una decoración.</b>
 *
 * <p>Los cuatro valores tienen un significado operativo distinto y ese
 * significado es la razón de que el estado esté en pantalla. `AWAITING_EXTERNAL`
 * no es «pendiente» a secas: es <b>dinero devengado que nadie facturó</b>, y es
 * el más fácil de no ver porque no falla nada — el servicio se prestó, el
 * documento se calculó, y ahí se quedó.
 *
 * <p><b>El tono acompaña al rótulo, nunca lo sustituye</b> (WCAG 2.2 §1.4.1):
 * `AppBadge` pinta texto. Con `explain`, además, la frase que dice qué significa —
 * en el detalle, donde hay sitio; en una tabla de veinte filas, no.
 *
 * <p>Cero CSS de color: el tono viaja en la `variant` de `AppBadge`, que ya lo
 * resuelve con las primitivas.
 */
defineProps<{
  status: IssueStatus
  /** Añade la frase que explica qué significa el estado. Para el detalle. */
  explain?: boolean
}>()
</script>

<template>
  <span class="estado">
    <AppBadge
      :variant="ISSUE_STATUS_PRESENTATION[status]?.variant ?? 'neutral'"
      :label="ISSUE_STATUS_PRESENTATION[status]?.label ?? '—'"
    />
    <span v-if="explain" class="ds-meta significado">
      {{ ISSUE_STATUS_PRESENTATION[status]?.meaning ?? '—' }}
    </span>
  </span>
</template>

<style scoped>
.estado {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}

.significado {
  max-width: 46ch;
}
</style>
