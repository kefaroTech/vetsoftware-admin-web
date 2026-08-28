<script setup lang="ts">
import { computed } from 'vue'
import { subscriptionRecordTabs } from '@/router/routes/subscriptions-admin.routes'
import type { SubscriptionResponse } from '@/features/subscriptions-admin/types/subscriptions-admin.types'
import SummaryCard from '../SummaryCard.vue'
import CardState from './CardState.vue'
import { accessSummaryText } from '../../../composables/companySummaryText'

/**
 * <b>Acceso</b> — la sexta tarjeta de §I2. También real: los submódulos
 * habilitados salen de `GET /entitlements/access`.
 *
 * <p><b>Las concesiones a mano se cuentan aparte.</b> `MANUAL_GRANT` es lo único
 * de esa tabla que no se deriva del contrato: una persona lo puso, el recálculo lo
 * preserva a propósito, y es lo que responde «¿por qué esta clínica ve
 * facturación si no la paga?» sin abrir el contrato. Mezclarlo en el total lo
 * haría invisible, que es exactamente lo contrario de para lo que existe.
 *
 * <p><b>La salida se busca, no se escribe.</b> El detalle vive en la sub-vista
 * «Acceso» del expediente del contrato, que es de otro lote: se localiza su
 * pestaña por segmento entre las registradas y, si no está, la tarjeta se queda
 * sin enlace en vez de dejar una ruta rota. Es el mismo criterio con el que el
 * banner de una cuenta vencida busca la pestaña «Dinero».
 */
const props = defineProps<{
  entitlementCount: number
  manualGrantCount: number
  subscription: SubscriptionResponse | null
  loading: boolean
  error: string | null
  companyId: number
}>()

const resumen = computed(() => accessSummaryText(props.entitlementCount, props.manualGrantCount))

const to = computed(() => {
  const tab = subscriptionRecordTabs.find((t) => t.segment === 'acceso')
  if (!tab || !props.subscription) return null
  return {
    name: tab.routeName,
    params: { companyId: String(props.companyId), id: String(props.subscription.id) },
  }
})
</script>

<template>
  <SummaryCard title="Acceso" :to="to" :link-label="to ? 'Ver qué puede usar' : undefined">
    <CardState :loading="loading" :error="error">
      <p class="ds-text-strong parrafo">{{ resumen }}</p>
      <p v-if="manualGrantCount > 0" class="ds-meta parrafo">
        Una concesión a mano no la repone ni la retira un recálculo: se conserva hasta que alguien
        la quite.
      </p>
    </CardState>
  </SummaryCard>
</template>

<style scoped>
.parrafo {
  margin: 0;
}
</style>
