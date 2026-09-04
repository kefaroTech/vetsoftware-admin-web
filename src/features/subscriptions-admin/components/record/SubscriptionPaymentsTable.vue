<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  type SubscriptionPaymentResponse,
} from '@/features/billing-operations/types/billing-operations.types'
import { formatDateTime } from '../../composables/subscriptionHistoryText'
import { countsAsCollected } from '../../composables/subscriptionMoneyText'
import { formatMoney } from '@/composables/format'
/**
 * <b>Cobrado</b>: entró la plata. Una fila por pago registrado.
 *
 * <p><b>Solo los confirmados cuentan como cobro</b>, y la tabla no deja que eso
 * dependa de leerse el badge: la columna «¿Cuenta como cobro?» lo dice con la
 * palabra «Sí» o «No» en cada fila. Los cuatro estados del contrato son
 * `PENDING`, `CONFIRMED`, `FAILED` y `REFUNDED`, y tres de ellos no son plata que
 * se quedó; sumar un pago pendiente al total es exactamente cómo una cuenta
 * morosa se ve al día en pantalla mientras el banco no ha abonado nada.
 *
 * <p><b>Un pago no es de una factura ni de un contrato.</b> Esta lista es de la
 * <b>empresa</b>, no de este contrato, y no es una carencia del endpoint sino el
 * modelo: un cliente puede pagar tres cuentas de cobro de un giro o abonar la
 * mitad de una. La vista lo dice con esas palabras encima de la tabla en vez de
 * dejar creer que son «los pagos de este contrato».
 *
 * <p><b>Aquí sí hay divisa.</b> `SubscriptionPaymentResponse.currency` existe —a
 * diferencia del documento y del cargo—, así que los pagos son lo único de esta
 * pantalla que se pinta con su moneda, y con `formatMoney`, que formatea con la
 * divisa que el propio pago declara en vez de rotular «$» sobre un importe en
 * otra divisa.
 *
 * <p><b>Ni un control de edición.</b> `PATCH …/status` y `PATCH …/reconciliation`
 * existen en el contrato y <b>no</b> se ofrecen aquí: son otra operación, y esta
 * pantalla registra el hecho de que entró la plata. Un lápiz atenuado o un
 * «Editar» deshabilitado prometerían algo que este bloque no hace (§3.2).
 */
defineProps<{
  rows: SubscriptionPaymentResponse[]
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <AppTable
    caption="Pagos del contrato"
    :headers="[
      'Recibido',
      { label: 'Importe', align: 'num' },
      'Medio',
      'Referencia',
      'Estado',
      '¿Cuenta como cobro?',
    ]"
    :empty="rows.length === 0"
    :loading="loading"
    :error="error"
    :trace-id="errorTraceId"
    @retry="$emit('retry')"
  >
    <template #empty>
      <p>
        Esta empresa no tiene ningún pago registrado. Que no haya pagos no significa que no se le
        haya facturado: emitir el documento y recibir la plata son dos cosas distintas.
      </p>
    </template>

    <tr v-for="payment in rows" :key="payment.id" class="ds-row-hover">
      <td>
        {{ formatDateTime(payment.receivedAt) }}
        <span class="ds-meta bloque">Registrado el {{ formatDateTime(payment.createdDate) }}</span>
      </td>

      <td class="ds-num">{{ formatMoney(payment.amount, payment.currency) }}</td>

      <td>{{ PAYMENT_METHOD_LABEL[payment.paymentMethod] }}</td>

      <td>
        <span v-if="payment.gateway || payment.gatewayReference">
          {{ payment.gateway ?? '—' }} · {{ payment.gatewayReference ?? '—' }}
        </span>
        <span v-else class="ds-meta">Sin referencia de pasarela</span>
        <span class="ds-meta bloque">
          {{
            payment.reconciledAt
              ? `Conciliado el ${formatDateTime(payment.reconciledAt)}`
              : 'Sin conciliar'
          }}
        </span>
      </td>

      <td>
        <AppBadge
          :variant="PAYMENT_STATUS_VARIANT[payment.status]"
          :label="PAYMENT_STATUS_LABEL[payment.status]"
        />
      </td>

      <!-- La respuesta en una palabra, no deducida del badge de al lado. Es la
           única columna que dice si esa fila es dinero que se quedó. -->
      <td>
        <span class="ds-text-strong">{{ countsAsCollected(payment) ? 'Sí' : 'No' }}</span>
        <span v-if="!countsAsCollected(payment)" class="ds-meta bloque">
          Solo los pagos confirmados cuentan.
        </span>
      </td>
    </tr>
  </AppTable>
</template>

<style scoped>
.bloque {
  display: block;
}
</style>
