<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { formatDateTime } from '@/features/subscriptions-admin/composables/entitlementText'
import {
  LIMIT_EVENT_TYPE_LABEL,
  LIMIT_EVENT_VARIANT,
  LIMIT_SOURCE_LABEL,
  limitEventActor,
  signedDelta,
} from '../composables/companyLimitsText'
import type { CompanyLimitEventResponse } from '../types/company-limits.types'

/**
 * <b>La bitácora de cupo</b>: qué le pasó a esta empresa cada vez que se acercó o
 * topó con un techo.
 *
 * <p><b>Las dos cifras son las de entonces, y la cabecera lo dice.</b>
 * `usedQuantity` y `limitQuantity` son el consumo y el techo <i>en el momento del
 * hecho</i>, no los de hoy. Leerlas como el estado actual es cómo una bitácora se
 * convierte en un panel roto: la fila de marzo diría que hoy hay 40 usuarios.
 *
 * <p>⚠️ El eje se identifica por su número cuando no se conoce su nombre.
 * `CompanyLimitEventResponse` trae `limitDimensionId` y nada más —ni código ni
 * rótulo—, y los nombres solo se conocen de los ejes que la empresa tiene con
 * contador vivo. Un hecho de un eje que ya no tiene contador se pinta como «Eje
 * #7»: un número opaco es peor que un nombre, y mucho mejor que un nombre
 * equivocado.
 */
defineProps<{
  rows: CompanyLimitEventResponse[]
  /** Rótulo por `limitDimensionId`, de los ejes cuyo nombre se conoce. */
  dimensionTitles: Record<number, string>
  /** Cuántos días cubre la ventana consultada. Va en el estado vacío. */
  windowDays: number
  loading?: boolean
  error?: string | null
  errorTraceId?: string | null
}>()

defineEmits<{ retry: [] }>()

const HEADERS = ['Cuándo', 'Qué pasó', 'Eje', 'Cifras de entonces', 'Movimiento', 'Quién', 'Motivo']
</script>

<template>
  <AppTable
    caption="Hechos de cupo de la empresa"
    :headers="HEADERS"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <AppEmptyState
        title="No hay hechos de cupo en la ventana consultada"
        :description="`En los últimos ${windowDays} días esta empresa no recibió avisos, ni portazos, ni correcciones. Es una respuesta, no un fallo: hay clínicas que nunca se acercan a su techo.`"
      />
    </template>

    <tr v-for="event in rows" :key="event.id" class="ds-row-hover">
      <td class="nowrap">{{ formatDateTime(event.occurredAt) }}</td>
      <td>
        <AppBadge
          :variant="LIMIT_EVENT_VARIANT[event.eventType]"
          :label="LIMIT_EVENT_TYPE_LABEL[event.eventType]"
        />
      </td>
      <td>{{ dimensionTitles[event.limitDimensionId] ?? `Eje #${event.limitDimensionId}` }}</td>
      <td class="num">
        {{ event.usedQuantity }} de {{ event.limitQuantity }}
        <span class="ds-meta origen">{{ LIMIT_SOURCE_LABEL[event.limitSource] }}</span>
      </td>
      <td class="num">{{ signedDelta(event.requestedDelta) }}</td>
      <td>{{ limitEventActor(event) }}</td>
      <td>
        <template v-if="event.reasonCode || event.reason">
          <span v-if="event.reasonCode" class="ds-text-strong">{{ event.reasonCode }}</span>
          <span v-if="event.reason" class="ds-meta origen">{{ event.reason }}</span>
        </template>
        <span v-else class="ds-meta">Sin motivo: no lo pidió nadie, lo dejó el sistema</span>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
.num {
  font-variant-numeric: tabular-nums;
}

/* La fecha y hora no se parte en dos líneas: una bitácora se recorre por la
   columna de la izquierda y un salto ahí desalinea la lectura. */
.nowrap {
  white-space: nowrap;
}

/* El matiz va bajo el dato, no a su lado: en una tabla de siete columnas no hay
   ancho para ponerlo en línea sin empujar las demás. */
.origen {
  display: block;
}
</style>
