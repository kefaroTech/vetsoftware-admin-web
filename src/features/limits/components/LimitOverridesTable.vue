<script setup lang="ts">
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { formatDateTime } from '@/features/quotes/composables/quoteDateTime'
import { OVERRIDE_REASON_LABEL } from '../composables/limitText'
import type { CompanyLimitOverrideResponse } from '../types/limits.types'

/**
 * Las excepciones de techo de una empresa: **las vivas y las retiradas, en la
 * misma tabla**.
 *
 * <p><b>Las revocadas no se esconden.</b> Son la prueba de que se concedió algo y
 * de que se retiró, con quién, cuándo y por qué. Ocultarlas dejaría el
 * expediente afirmando que nunca hubo excepción, que es justo lo contrario de
 * para lo que se firma una.
 *
 * <p><b>«Sin fecha de fin» no es «caducada».</b> `validTo` llega vacío en la
 * inmensa mayoría de las excepciones porque el alta no admite fecha de fin: la
 * excepción vive hasta que alguien la revoca. Pintar un guion ahí dejaría creer
 * que expiró sola.
 */
defineProps<{
  overrides: CompanyLimitOverrideResponse[]
  /** Traduce el identificador de eje a su nombre. Lo pone la vista, que tiene el catálogo. */
  dimensionName: (id: number) => string
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; revoke: [override: CompanyLimitOverrideResponse] }>()
</script>

<template>
  <AppTable
    :headers="[
      'Eje',
      { label: 'Techo', align: 'num' },
      'Rige desde',
      'Hasta',
      'Motivo',
      'Estado',
      'Acciones',
    ]"
    :empty="overrides.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <slot name="empty" />
    </template>

    <tr v-for="override in overrides" :key="override.id" class="ds-row-hover">
      <td class="ds-text-strong">{{ dimensionName(override.limitDimensionId) }}</td>
      <td class="ds-num">{{ override.limitQuantity }}</td>
      <td class="ds-meta">{{ formatDate(override.validFrom) }}</td>
      <td class="ds-meta">
        <template v-if="override.validTo">{{ formatDate(override.validTo) }}</template>
        <template v-else>Sin fecha de fin</template>
      </td>
      <td>
        <p class="motivo ds-text-strong">{{ OVERRIDE_REASON_LABEL[override.reasonCode] }}</p>
        <p class="motivo ds-meta">{{ override.reason }}</p>
      </td>
      <td>
        <AppBadge
          :variant="override.alive ? 'success' : 'neutral'"
          :label="override.alive ? 'Viva' : 'Revocada'"
        />
        <!-- La revocación se cuenta entera: sin el motivo y la fecha, «revocada»
             no prueba nada. -->
        <p v-if="!override.alive" class="motivo ds-meta">
          {{ formatDateTime(override.revokedAt) }} ·
          {{
            override.revokedReasonCode
              ? OVERRIDE_REASON_LABEL[override.revokedReasonCode]
              : 'Sin motivo registrado'
          }}
          <template v-if="override.revokedReason"> · {{ override.revokedReason }}</template>
        </p>
      </td>
      <td>
        <div class="ds-actions ds-actions--start">
          <button
            v-if="override.alive"
            type="button"
            class="ds-btn ds-btn--danger ds-btn--sm"
            :aria-label="`Revocar la excepción de ${dimensionName(override.limitDimensionId)}`"
            @click="$emit('revoke', override)"
          >
            <component :is="ICONS.CLOSE" :size="14" />
            Revocar
          </button>
          <!-- Sin acción sobre una revocada: no hay nada que deshacer, y un
               botón apagado no explicaría por qué. -->
          <span v-else class="ds-meta">Nada que hacer</span>
        </div>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
.motivo {
  margin: 0;
}
</style>
