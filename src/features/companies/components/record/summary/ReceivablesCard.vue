<script setup lang="ts">
import { computed } from 'vue'
import { graceDaysLeft } from '@/features/subscriptions-admin/composables/subscriptionStatusText'
import { formatDate } from '@/composables/format'
import { companyRecordTabTarget } from '@/router/routes/companies.routes'
import type { SubscriptionResponse } from '@/features/subscriptions-admin/types/subscriptions-admin.types'
import SummaryCard from '../SummaryCard.vue'
import CardState from './CardState.vue'
import { RECEIVABLES_AMOUNT_GAP } from '../../../composables/companySummaryText'

/**
 * <b>Cartera</b> — la tercera tarjeta de §I2, y la que mejor enseña la diferencia
 * entre un hueco y un cero.
 *
 * <p>El <b>reloj</b> de la mora es real y sale del contrato: `pastDueSince` dice
 * desde cuándo debe y `graceDays` cuántos días de cortesía tiene pactados. El
 * <b>importe</b> no existe: `/system/subscription-billing/documents/overdue` es la
 * lista de trabajo del cierre de mes, no un saldo por empresa, y ninguna otra
 * respuesta del contrato lo da.
 *
 * <p>Así que la tarjeta dice el reloj y <b>no</b> dice el importe. Un «0 vencido»
 * puesto por defecto se leería como «esta clínica no debe nada», que es lo
 * contrario de lo que ocurre justo cuando esta tarjeta importa.
 *
 * <p>`graceDaysLeft` se reutiliza del expediente del contrato y no se recalcula
 * aquí: devuelve `null` si falta alguno de los dos datos —no se inventa un
 * número— y `0` si ya se agotaron, porque decir «le quedan −3 días» es peor que
 * decir que se acabaron.
 */
const props = defineProps<{
  subscription: SubscriptionResponse | null
  hasNoContract: boolean
  loading: boolean
  error: string | null
  companyId: number
}>()

const to = computed(() => companyRecordTabTarget('cartera', props.companyId))

const diasDeCortesia = computed(() =>
  props.subscription ? graceDaysLeft(props.subscription) : null,
)

/** La frase de los días restantes, con la concordancia hecha y sin negativos. */
const cortesia = computed(() => {
  const left = diasDeCortesia.value
  if (left == null) return null
  if (left === 0) return 'Se agotaron los días de cortesía.'
  return `Le queda${left === 1 ? '' : 'n'} ${left} día${left === 1 ? '' : 's'} de cortesía.`
})
</script>

<template>
  <SummaryCard title="Cartera" :to="to" :link-label="to ? 'Ver la cartera' : undefined">
    <CardState :loading="loading" :error="error">
      <p v-if="hasNoContract" class="parrafo">
        Sin contrato no hay mora que contar en esta tarjeta.
      </p>

      <template v-else-if="subscription">
        <template v-if="subscription.pastDueSince">
          <p class="ds-text-strong parrafo">
            Debe desde el {{ formatDate(subscription.pastDueSince) }}
          </p>
          <p v-if="cortesia" class="ds-meta parrafo">{{ cortesia }}</p>
        </template>
        <p v-else class="parrafo">El contrato no registra mora.</p>

        <p class="ds-meta parrafo">{{ RECEIVABLES_AMOUNT_GAP }}</p>
      </template>
    </CardState>
  </SummaryCard>
</template>

<style scoped>
.parrafo {
  margin: 0;
}
</style>
