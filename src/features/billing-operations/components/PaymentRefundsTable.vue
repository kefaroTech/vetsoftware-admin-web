<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppTable from '@/components/ui/AppTable.vue'
import CompanyRef from '@/components/ui/CompanyRef.vue'
import { formatDate } from '@/composables/format'
import { formatDocumentAmount } from '../composables/billingFormat'
import {
  REFUND_METHOD_LABEL,
  REFUND_REASON_LABEL,
  type SystemPaymentRefundResponse,
} from '../types/payment-refunds.types'

/**
 * <b>Las devoluciones registradas.</b> Cada fila es una salida de caja con su
 * motivo escrito y su firma.
 *
 * <p><b>La fila es `SystemPaymentRefundResponse`, la respuesta de plataforma.</b>
 * El contrato publica dos esquemas a propósito: el del tenant no lleva
 * `authorizedBySystemUserId` —el id del operador interno no se le enseña al
 * cliente— y el de plataforma sí, como campo obligatorio. Esta es la consola de
 * superadministrador y lee `/system/payment-refunds`, así que «Autorizó» sale del
 * dato que el servidor ya manda.
 *
 * <p>⚠️ <b>«Autorizó» pinta un identificador, no un nombre.</b> El contrato no
 * publica ningún dato legible de la persona junto a la devolución, así que la
 * columna enseña el número del operador: sirve para auditar quién firmó, no para
 * reconocerlo de un vistazo. El texto accesible lo dice entero para que un lector
 * de pantalla no anuncie «almohadilla siete».
 *
 * <p><b>Ni un botón de eliminar, en ninguna fila.</b> El contrato no publica `PUT`
 * ni `DELETE` sobre una devolución, y es coherente con lo que es: la plata ya salió.
 * Corregir una devolución equivocada es registrar el movimiento contrario.
 *
 * <p><b>«Saldo a favor» lleva su rótulo aparte y no se confunde con los otros
 * tres.</b> En esa fila <b>no salió plata</b>: se abrió un lote que caduca. Pintarla
 * igual que una transferencia haría creer que el cliente ya tiene su dinero.
 *
 * <p>Los importes no llevan símbolo de moneda porque `SystemPaymentRefundResponse`
 * no declara `currency` — igual que el documento de cobro. Inventar «$» en una
 * pantalla de caja es peor que no ponerlo.
 */
defineProps<{
  refunds: SystemPaymentRefundResponse[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  loading: boolean
  error: string | null
  errorTraceId: string | null
}>()

defineEmits<{ retry: []; 'update:page': [page: number] }>()

const HEADERS = [
  'Devolución',
  'Empresa',
  'Pago',
  'Importe',
  'Medio',
  'Girada',
  'Motivo',
  'Autorizó',
]
</script>

<template>
  <div class="ds-stack ds-stack--10">
    <AppTable
      :headers="HEADERS"
      :empty="refunds.length === 0"
      :loading="loading"
      :error="error"
      :trace-id="errorTraceId"
      @retry="$emit('retry')"
    >
      <template #empty>
        <slot name="empty" />
      </template>

      <tr v-for="refund in refunds" :key="refund.id" class="ds-row-hover">
        <td class="ds-text-strong">#{{ refund.id }}</td>
        <td><CompanyRef :company-id="refund.companyId" /></td>
        <td>#{{ refund.paymentId }}</td>
        <td class="ds-num">{{ formatDocumentAmount(refund.amount) }}</td>
        <td>
          <AppBadge
            v-if="refund.method === 'CUSTOMER_CREDIT'"
            variant="warning"
            label="Saldo a favor: no salió plata"
          />
          <span v-else>{{ REFUND_METHOD_LABEL[refund.method] }}</span>
        </td>
        <td>
          {{ formatDate(refund.refundedAt) }}
          <span class="ds-meta linea">valor {{ formatDate(refund.valueDate) }}</span>
        </td>
        <td>
          <span class="ds-text-strong">{{ REFUND_REASON_LABEL[refund.reasonCode] }}</span>
          <span class="ds-meta linea">{{ refund.reason }}</span>
        </td>
        <!--
          Quién firmó la salida de caja. Es el identificador del operador de
          plataforma —lo único que el contrato publica de él— y no su nombre: ver
          `payment-refunds.types.ts`. El texto oculto lo deletrea para el lector de
          pantalla; el visible se queda en `#N` como las demás referencias de la
          tabla.
        -->
        <td>
          <span class="ds-sr-only">
            Operador de plataforma {{ refund.authorizedBySystemUserId }}
          </span>
          <span aria-hidden="true">#{{ refund.authorizedBySystemUserId }}</span>
        </td>
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
.linea {
  display: block;
}
</style>
