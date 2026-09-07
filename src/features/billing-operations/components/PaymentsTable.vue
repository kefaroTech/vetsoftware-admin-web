<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatDate, formatMoney } from '@/composables/format'
import { BILLING_ROUTE_NAMES } from '@/router/routes/billing-operations.routes'
import { agingText, agingTitle, daysSince, isPendingStale } from '../composables/billingFormat'
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  type SubscriptionPaymentResponse,
} from '../types/billing-operations.types'
/**
 * **Cobrar**: la plata que entró. Es el tercero de los tres verbos y no se
 * confunde con los otros dos — un pago no es un documento facturado ni un cargo
 * devengado.
 *
 * <p><b>De solo consulta, y no por falta de tiempo.</b> Registrar un pago
 * (`POST /subscription-payments`), conciliarlo (`PATCH …/reconciliation`) y
 * cambiarle el estado (`PATCH …/status`) resuelven la empresa con
 * `Authz.currentCompanyId()`, que para un usuario de sistema exige la cabecera
 * `X-Company-Id`. Ofrecer aquí esos botones obligaría a que la empresa fuera
 * implícita, que es exactamente el mecanismo con el que se le aplica un cobro a
 * La empresa equivocada. Su sitio es el expediente del contrato, donde la
 * empresa está a la vista en todo momento.
 *
 * <p>«Sin conciliar» lleva su rótulo textual además del tono (§5.2): es lo que
 * hay que revisar cada mes y no puede depender de distinguir un color.
 *
 * <p><b>Una reserva no es un dato incompleto.</b> Cuando Wompi todavía no
 * confirmó la referencia, el pago nace `PENDING` sin `gatewayReference`
 * (`reservation === true`). La columna «Pasarela» lo dice con un guion y un
 * `title`, en vez de dejar «WOMPI» sin número — que un operador nuevo puede leer
 * como un error de captura.
 */
defineProps<{
  payments: SubscriptionPaymentResponse[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; 'update:page': [page: number] }>()

const RESERVATION_TITLE = 'Reservado; Wompi todavía no confirmó la referencia.'

/** `gateway` y `gatewayReference` son únicos JUNTOS: es lo que evita el pago duplicado. */
function gatewayText(payment: SubscriptionPaymentResponse): string {
  if (!payment.gateway && !payment.gatewayReference) return '—'
  return [payment.gateway, payment.gatewayReference].filter(Boolean).join(' · ')
}

/** Solo tiene sentido para `PENDING`: un pago cerrado no está «envejeciendo». */
function agingCell(payment: SubscriptionPaymentResponse): string {
  if (payment.status !== 'PENDING') return '—'
  return agingText(daysSince(payment.receivedAt))
}
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      caption="Pagos"
      :headers="[
        'Pago',
        'Empresa',
        'Recibido',
        'Antigüedad',
        { label: 'Importe', align: 'num' },
        { label: 'Comisión', align: 'num' },
        { label: 'Neto', align: 'num' },
        'Método',
        'Estado',
        'Conciliación',
        'Pasarela',
        'Referencia interna',
      ]"
      :empty="payments.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <slot name="empty" />
      </template>

      <tr v-for="payment in payments" :key="payment.id" class="ds-row-hover">
        <td class="ds-text-strong">#{{ payment.id }}</td>
        <td><CompanyRef :company-id="payment.companyId" /></td>
        <td>{{ formatDate(payment.receivedAt) }}</td>
        <td :title="agingTitle(payment.receivedAt)">
          <AppBadge
            v-if="isPendingStale(payment.status, payment.receivedAt)"
            variant="warning"
            :label="agingCell(payment)"
          />
          <span v-else>{{ agingCell(payment) }}</span>
        </td>
        <td class="ds-num">{{ formatMoney(payment.amount, payment.currency) }}</td>
        <td class="ds-num">
          {{ payment.feeAmount !== null ? formatMoney(payment.feeAmount, payment.currency) : '—' }}
        </td>
        <td class="ds-num">
          {{ payment.netAmount !== null ? formatMoney(payment.netAmount, payment.currency) : '—' }}
        </td>
        <td>{{ PAYMENT_METHOD_LABEL[payment.paymentMethod] }}</td>
        <td>
          <div class="ds-stack ds-stack--4">
            <AppBadge
              :variant="PAYMENT_STATUS_VARIANT[payment.status]"
              :label="PAYMENT_STATUS_LABEL[payment.status]"
            />
            <AppBadge
              v-if="payment.reservation"
              variant="neutral"
              label="Reserva en espera de confirmación"
            />
          </div>
        </td>
        <td>
          <span v-if="payment.reconciledAt">{{ formatDate(payment.reconciledAt) }}</span>
          <AppBadge v-else variant="warning" label="Sin conciliar" />
        </td>
        <td class="pasarela">
          <span v-if="payment.reservation" :title="RESERVATION_TITLE">—</span>
          <span v-else>{{ gatewayText(payment) }}</span>
          <RouterLink
            v-if="payment.gatewayReference"
            :to="{
              name: BILLING_ROUTE_NAMES.WOMPI_EVENTS,
              query: { reference: payment.gatewayReference },
            }"
            class="ds-meta enlace-eventos"
          >
            Ver eventos
          </RouterLink>
        </td>
        <td class="referencia-interna">{{ payment.clientRequestId ?? '—' }}</td>
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
.pasarela {
  word-break: break-all;
}

.referencia-interna {
  word-break: break-all;
}

.enlace-eventos {
  display: block;
}
</style>
