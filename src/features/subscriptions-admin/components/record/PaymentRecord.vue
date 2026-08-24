<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { formatPaymentAmount } from '@/features/billing-operations/composables/billingFormat'
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  type SubscriptionPaymentResponse,
} from '@/features/billing-operations/types/billing-operations.types'
import { formatDateTime } from '../../composables/subscriptionHistoryText'
import { countsAsCollected } from '../../composables/subscriptionMoneyText'

/**
 * El pago <b>ya registrado</b>: un hecho, no un formulario (§3.2).
 *
 * <p>Este componente es la otra rama del `v-if` del modal, y por eso existe. En
 * cuanto el servidor devuelve el pago, el modal se vuelve a pintar con otra forma:
 * otro titular, sello de documento, los datos en un `<dl>` y <b>ninguna acción de
 * escritura</b>. Un botón que se pusiera gris diría «ahora no te dejan»; el cambio
 * de forma dice «esto ya es un hecho, y no se edita».
 *
 * <p><b>Ni un `<input disabled>` con el importe.</b> Los hechos van en un `<dl>`
 * sobre `ds-detail-grid`. Un campo deshabilitado con el valor dentro promete una
 * edición que no existe en el contrato: sobre un pago no hay `PUT`, y corregirlo
 * es otra operación con su propio estado.
 *
 * <p><b>El estado que se pinta es el del servidor</b>, no el que propuso el
 * formulario, y va acompañado de la respuesta a la única pregunta que importa:
 * si cuenta como cobro. Un pago recién registrado nace `PENDING` y <b>no</b> lo
 * hace.
 *
 * <p>El titular lleva `tabindex="-1"` porque el modal le manda el foco al cambiar
 * de rama: sin eso, quien navega con teclado se queda con el foco en un botón que
 * acaba de desaparecer del árbol (A11Y-08). Mismo mecanismo que
 * `ExternalInvoiceRecord` (W1-E).
 */
defineProps<{ payment: SubscriptionPaymentResponse }>()
</script>

<template>
  <article class="ds-card ds-stack ds-stack--14">
    <header class="ds-stack ds-stack--8">
      <p class="ds-kicker">Pago registrado</p>
      <h3 id="payment-record-title" class="ds-title" tabindex="-1">
        {{ formatPaymentAmount(payment.amount, payment.currency) }}
      </h3>
      <p class="ds-meta">Pago #{{ payment.id }} · empresa #{{ payment.companyId }}</p>
      <div>
        <span class="ds-pill ds-tone--neutral">
          <component :is="ICONS.LOCK" :size="13" />
          Documento · no se corrige, se registra otro hecho
        </span>
      </div>
    </header>

    <dl class="ds-detail-grid">
      <div>
        <dt class="ds-label">Recibido el</dt>
        <dd class="valor">{{ formatDateTime(payment.receivedAt) }}</dd>
      </div>
      <div>
        <dt class="ds-label">Medio de pago</dt>
        <dd class="valor">{{ PAYMENT_METHOD_LABEL[payment.paymentMethod] }}</dd>
      </div>
      <div>
        <dt class="ds-label">Pasarela y referencia</dt>
        <dd class="valor">{{ payment.gateway ?? '—' }} · {{ payment.gatewayReference ?? '—' }}</dd>
      </div>
      <div>
        <dt class="ds-label">Estado</dt>
        <dd class="valor">
          <AppBadge
            :variant="PAYMENT_STATUS_VARIANT[payment.status]"
            :label="PAYMENT_STATUS_LABEL[payment.status]"
          />
        </dd>
      </div>
      <div>
        <dt class="ds-label">¿Cuenta como cobro?</dt>
        <dd class="valor">
          {{ countsAsCollected(payment) ? 'Sí, el pago está confirmado.' : 'Todavía no.' }}
        </dd>
      </div>
      <div>
        <dt class="ds-label">Conciliación</dt>
        <dd class="valor">
          {{
            payment.reconciledAt ? formatDateTime(payment.reconciledAt) : 'Sin conciliar todavía.'
          }}
        </dd>
      </div>
    </dl>

    <p v-if="!countsAsCollected(payment)" class="ds-dialog-body">
      Queda anotado que entró la plata. Hasta que el pago se confirme no se descuenta de lo que la
      empresa debe, y la confirmación se hace desde la pantalla de cobranza.
    </p>
  </article>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}
</style>
