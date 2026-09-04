<script setup lang="ts">
import { computed } from 'vue'
import SubscriptionStatusBadge from '@/features/subscriptions-admin/components/SubscriptionStatusBadge.vue'
import { billingCycleLabel } from '@/features/subscriptions-admin/composables/subscriptionStatusText'
import { SUBSCRIPTION_RECORD_ROUTE_NAMES } from '@/router/routes/subscriptions-admin.routes'
import { formatDate } from '@/composables/format'
import type { SubscriptionResponse } from '@/features/subscriptions-admin/types/subscriptions-admin.types'
import SummaryCard from '../SummaryCard.vue'
import CardState from './CardState.vue'
import { NO_CONTRACT_TEXT } from '../../../composables/companySummaryText'

/**
 * <b>Contrato</b> — la primera de las seis tarjetas de §I2.
 *
 * <p>Es la única que no tiene ningún hueco: los cinco datos que pinta
 * —número, estado, ciclo, periodo vigente y próximo cobro— salen enteros de
 * `GET /subscriptions/current`. Por eso es también la que lleva la salida más
 * usada del resumen: el expediente del contrato, que ya existe.
 *
 * <p><b>«No hay contrato» no es un error.</b> Una empresa recién creada no tiene
 * ninguno y el servidor responde 404; el cliente de API lo traduce a `null` y
 * aquí se dice con palabras. Pintar un banner rojo sobre un hecho normal del
 * negocio manda a soporte a investigar una avería que no existe.
 */
const props = defineProps<{
  subscription: SubscriptionResponse | null
  hasNoContract: boolean
  loading: boolean
  error: string | null
  companyId: number
}>()

const to = computed(() =>
  props.subscription
    ? {
        name: SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD,
        params: { companyId: String(props.companyId), id: String(props.subscription.id) },
      }
    : null,
)

/**
 * El periodo vigente sale nulable del contrato, así que se pinta la línea solo
 * si están las dos fechas: «01/09 → —» no informa de nada.
 */
const periodo = computed(() => {
  const s = props.subscription
  if (!s?.currentPeriodStart || !s.currentPeriodEnd) return null
  return `${formatDate(s.currentPeriodStart)} → ${formatDate(s.currentPeriodEnd)}`
})
</script>

<template>
  <SummaryCard title="Contrato" :to="to" :link-label="to ? 'Ver el contrato' : undefined">
    <CardState :loading="loading" :error="error">
      <p v-if="hasNoContract" class="parrafo">{{ NO_CONTRACT_TEXT }}</p>

      <template v-else-if="subscription">
        <p class="ds-flex-row titular">
          <span class="ds-text-strong">{{ subscription.subscriptionNumber }}</span>
          <SubscriptionStatusBadge :status="subscription.status" />
        </p>
        <p class="ds-meta parrafo">
          {{ subscription.current ? 'Vigente' : 'Histórico' }} ·
          {{ billingCycleLabel(subscription.billingCycle).toLowerCase() }}
        </p>
        <p v-if="periodo" class="ds-meta parrafo">Periodo {{ periodo }}</p>
        <p v-if="subscription.nextBillingDate" class="ds-meta parrafo">
          Próximo cobro el {{ formatDate(subscription.nextBillingDate) }}
        </p>
      </template>
    </CardState>
  </SummaryCard>
</template>

<style scoped>
.parrafo {
  margin: 0;
}

/* `.ds-flex-row` pone `display/align-items/gap`; aquí solo lo que le falta:
   que el distintivo baje de línea en vez de recortar el número del contrato. */
.titular {
  margin: 0;
  flex-wrap: wrap;
}
</style>
