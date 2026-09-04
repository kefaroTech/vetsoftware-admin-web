<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import type { AppTableHeader } from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { ICONS } from '@/constants/icons'
import { formatAmount, formatDate } from '@/composables/format'
import {
  DECLINE_KIND_PRESENTATION,
  SOFT_MAX_ATTEMPTS,
  type SystemPaymentAttemptResponse,
} from '../types/payment-attempts.types'
/**
 * <b>Los intentos de cobro, con su familia de rechazo a la vista.</b>
 *
 * <p><b>«Reprogramar» solo existe donde se puede reprogramar.</b> En un rechazo duro
 * el botón <b>no está</b> — no está apagado, no está—: las redes penalizan el
 * reintento sobre un rechazo duro y quien insiste paga por cada intento. Un botón
 * gris invitaría a buscar cómo encenderlo; su ausencia, acompañada del texto que
 * dice qué hacer en su lugar, cierra la pregunta.
 *
 * <p><b>Y no se llama «Reintentar».</b> El contrato no publica ninguna ruta que
 * dispare un cobro: lo que existe es mover la fecha del próximo intento
 * (`PATCH …/schedule`). «Reintentar» prometería una ejecución inmediata que nadie
 * puede cumplir, y quien lo pulse se quedará esperando un cobro que no ocurrió.
 *
 * <p><b>Un error nuestro se ve distinto de un rechazo del cliente.</b> La fila lo
 * dice con texto —«no cuenta contra el cliente»—, no con un tono: es exactamente el
 * dato que evita que alguien arranque cobranza por una credencial mal puesta.
 *
 * <p>El código crudo de la pasarela va en la fila porque es lo que un operador pega
 * en el soporte del proveedor. Sin él, la familia es una clasificación sin prueba.
 */
defineProps<{
  attempts: SystemPaymentAttemptResponse[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
  /** `false` en la lista de solo lectura: la cola de reintentos no reprograma dos veces. */
  showReschedule?: boolean
  busy?: boolean
}>()

defineEmits<{
  retry: []
  'update:page': [page: number]
  reschedule: [attempt: SystemPaymentAttemptResponse]
}>()

const HEADERS: AppTableHeader[] = [
  'Intento',
  'Empresa',
  'Documento',
  { label: 'Importe', align: 'num' },
  'Rechazo',
  'Cuándo',
  'Próximo reintento',
  { label: '', align: 'actions' },
]
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      caption="Intentos de cobro"
      money
      :headers="HEADERS"
      :empty="attempts.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <slot name="empty" />
      </template>

      <tr v-for="attempt in attempts" :key="attempt.id" class="ds-row-hover">
        <td>
          <span class="ds-text-strong">#{{ attempt.id }}</span>
          <span class="ds-meta linea">
            intento {{ attempt.attemptNumber }}
            <template
              v-if="DECLINE_KIND_PRESENTATION[attempt.declineKind]?.consumesCustomerAttempts"
            >
              de {{ SOFT_MAX_ATTEMPTS }}
            </template>
          </span>
        </td>
        <td><CompanyRef :company-id="attempt.companyId" /></td>
        <td>#{{ attempt.billingDocumentId }}</td>
        <td class="ds-num">{{ formatAmount(attempt.requestedAmount) }}</td>

        <td>
          <AppBadge
            :variant="DECLINE_KIND_PRESENTATION[attempt.declineKind].variant"
            :label="DECLINE_KIND_PRESENTATION[attempt.declineKind].label"
          />
          <span class="ds-meta linea">
            {{ DECLINE_KIND_PRESENTATION[attempt.declineKind].meaning }}
          </span>
          <!-- El dato que impide perseguir al cliente por una avería nuestra. -->
          <span
            v-if="!DECLINE_KIND_PRESENTATION[attempt.declineKind].consumesCustomerAttempts"
            class="ds-meta linea"
          >
            No cuenta contra el cliente ni arranca cobranza.
          </span>
          <span v-if="attempt.gatewayDeclineCode" class="ds-meta linea codigo">
            {{ attempt.gateway }} · {{ attempt.gatewayDeclineCode }}
          </span>
          <span v-else class="ds-meta linea codigo">{{ attempt.gateway }}</span>
        </td>

        <td>{{ formatDate(attempt.attemptedAt) }}</td>

        <td>
          <span v-if="attempt.nextAttemptAt">{{ formatDate(attempt.nextAttemptAt) }}</span>
          <!-- Vacío significa cosas distintas según la familia, y se dicen. -->
          <span
            v-else-if="!DECLINE_KIND_PRESENTATION[attempt.declineKind].retryable"
            class="ds-meta"
          >
            No se reintenta
          </span>
          <AppBadge v-else variant="warning" label="Sin programar" />
        </td>

        <td class="ds-col-actions">
          <button
            v-if="showReschedule && DECLINE_KIND_PRESENTATION[attempt.declineKind].retryable"
            type="button"
            class="ds-btn ds-btn--ghost ds-btn--sm"
            :disabled="busy"
            :aria-label="`Reprogramar el reintento del intento #${attempt.id}`"
            @click="$emit('reschedule', attempt)"
          >
            <component :is="ICONS.HISTORY" :size="14" />
            Reprogramar
          </button>
          <span
            v-else-if="showReschedule"
            class="ds-meta"
            :title="DECLINE_KIND_PRESENTATION[attempt.declineKind]?.nextStep"
          >
            Pedir otro medio de pago
          </span>
        </td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="!error && total > 0"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :page-count="pageCount"
      @update:page="$emit('update:page', $event)"
    />
  </div>
</template>

<style scoped>
.linea {
  display: block;
}

.codigo {
  word-break: break-all;
}
</style>
