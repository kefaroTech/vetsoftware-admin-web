<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatDate } from '@/composables/format'
import { formatPaymentAmount } from '../composables/billingFormat'
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
 * la empresa equivocada. Su sitio es el expediente del contrato, donde la
 * empresa está a la vista en todo momento.
 *
 * <p>«Sin conciliar» lleva su rótulo textual además del tono (§5.2): es lo que
 * hay que revisar cada mes y no puede depender de distinguir un color.
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

/** `gateway` y `gatewayReference` son únicos JUNTOS: es lo que evita el pago duplicado. */
function gatewayText(payment: SubscriptionPaymentResponse): string {
  if (!payment.gateway && !payment.gatewayReference) return '—'
  return [payment.gateway, payment.gatewayReference].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      :headers="[
        'Pago',
        'Empresa',
        'Recibido',
        'Importe',
        'Método',
        'Estado',
        'Conciliación',
        'Pasarela',
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
        <td class="ds-num">{{ formatPaymentAmount(payment.amount, payment.currency) }}</td>
        <td>{{ PAYMENT_METHOD_LABEL[payment.paymentMethod] }}</td>
        <td>
          <AppBadge
            :variant="PAYMENT_STATUS_VARIANT[payment.status]"
            :label="PAYMENT_STATUS_LABEL[payment.status]"
          />
        </td>
        <td>
          <span v-if="payment.reconciledAt">{{ formatDate(payment.reconciledAt) }}</span>
          <AppBadge v-else variant="warning" label="Sin conciliar" />
        </td>
        <td class="pasarela">{{ gatewayText(payment) }}</td>
      </tr>
    </AppTable>

    <AppPagination
      v-if="!loading && !error && total > 0"
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
</style>
