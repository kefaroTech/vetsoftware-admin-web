<script lang="ts">
import type { OverLimitState } from '../composables/overLimitAccounts'

/**
 * El rótulo del veredicto. **`OVER` no se llama «error»** y no lleva la palabra
 * «fallo» por ninguna parte: una clínica con 400 mascotas y un techo de 100 es
 * un cliente desbordado y congelado, que es un estado pactado del producto.
 */
export const OVER_LIMIT_LABEL: Record<OverLimitState, string> = {
  OVER: 'Desbordada',
  EXHAUSTED: 'Cupo agotado',
  NEAR: 'Cerca del techo',
  CLEAR: 'Con holgura',
  UNCAPPED: 'Sin techo',
}

/** Qué implica, y qué se puede hacer. Es lo que la fila tiene que responder. */
export const OVER_LIMIT_MEANING: Record<OverLimitState, string> = {
  OVER: 'Tiene más de lo que su techo permite. Conserva todo lo suyo y no puede crear más.',
  EXHAUSTED: 'Justo en el techo. Lo siguiente que intente crear se rechaza.',
  NEAR: 'Se acerca al techo. Todavía puede crear, pero conviene avisar antes del portazo.',
  CLEAR: 'Lejos del techo. No pide nada.',
  UNCAPPED: 'No hay techo declarado para este eje, así que no hay nada que superar.',
}

export function overLimitTone(state: OverLimitState): 'success' | 'warning' | 'danger' | 'neutral' {
  if (state === 'OVER' || state === 'EXHAUSTED') return 'danger'
  if (state === 'NEAR') return 'warning'
  return 'neutral'
}
</script>

<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatDateTime } from '@/features/quotes/composables/quoteDateTime'
import { limitSourceLabel } from '../composables/limitText'
import type { OverLimitRow } from '../composables/overLimitAccounts'

/**
 * **Quién está por encima de su techo, y quién cerca.**
 *
 * <p><b>Cada fila es un «último estado conocido», no una medición en vivo</b>, y
 * por eso todas llevan su fecha. El contrato no expone el consumo actual por eje:
 * lo único que trae consumo y techo juntos es la bitácora, donde cada hecho los
 * congela en su instante. Presentar esto como el estado de ahora sería inventar
 * una precisión que no existe.
 *
 * <p><b>Un eje sobre el que no ha pasado nada no aparece.</b> No se pinta «0 de
 * 50» sobre algo que nadie ha contado (R14).
 */
defineProps<{
  rows: OverLimitRow[]
  dimensionName: (id: number) => string
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <AppTable
    :headers="[
      'Empresa',
      'Eje',
      'Estado',
      { label: 'Consumo', align: 'num' },
      { label: 'Techo', align: 'num' },
      'Origen del techo',
      'Se supo',
    ]"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <slot name="empty" />
    </template>

    <tr v-for="row in rows" :key="row.limitDimensionId" class="ds-row-hover">
      <td><CompanyRef :company-id="row.companyId" /></td>
      <td class="ds-text-strong">{{ dimensionName(row.limitDimensionId) }}</td>
      <td>
        <AppBadge :variant="overLimitTone(row.state)" :label="OVER_LIMIT_LABEL[row.state]" />
        <p class="linea ds-meta">{{ OVER_LIMIT_MEANING[row.state] }}</p>
      </td>
      <td class="ds-num">{{ row.usedQuantity }}</td>
      <td class="ds-num">
        <!-- Un techo ausente NO es un techo de cero. -->
        <template v-if="row.limitQuantity === null">Sin techo</template>
        <template v-else>{{ row.limitQuantity }}</template>
      </td>
      <td class="ds-meta">{{ limitSourceLabel(row.limitSource) }}</td>
      <td class="ds-meta">{{ formatDateTime(row.occurredAt) }}</td>
    </tr>
  </AppTable>
</template>

<style scoped>
.linea {
  margin: 0;
}
</style>
