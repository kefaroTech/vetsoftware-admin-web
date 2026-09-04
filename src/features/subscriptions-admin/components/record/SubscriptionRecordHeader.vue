<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { ROUTE_NAMES } from '@/constants/routes'
import { formatDate } from '@/composables/format'
import SubscriptionStatusBadge from '../SubscriptionStatusBadge.vue'
import { billingCycleLabel } from '../../composables/subscriptionStatusText'
import type { CompanyResponse } from '@/features/companies/types/companies.types'
import type { SubscriptionResponse } from '../../types/subscriptions-admin.types'

/**
 * <b>La identidad de la empresa, permanente y en las seis sub-vistas.</b>
 *
 * <p>No es decoración. Cinco de las seis sub-vistas del expediente llaman a rutas
 * que actúan sobre <i>una</i> empresa y lo hacen mandando la cabecera
 * `X-Company-Id`; esta cabecera es la que decide a quién se le cancela el
 * contrato. La respuesta de diseño de §2 a esa cabecera invisible es esta
 * cabecera visible: mientras el expediente esté abierto, en pantalla pone sobre
 * qué empresa se está actuando, y por eso vive en el armazón —encima del
 * `RouterView`— y no dentro de ninguna sub-vista.
 *
 * <p>El nombre viene de una llamada extra a `GET /companies/{companyId}` porque
 * `SubscriptionResponse` solo trae `companyId` (§1.2, issue B-1). Si esa llamada
 * falla, aquí se ve el hueco declarado —guion y aviso— <b>y el número de
 * empresa, que sí es fiable</b>: es lo que va en la cabecera. Lo que no se hace
 * nunca es pintar un `#42` mudo como única identidad.
 *
 * <p>El `<h1>` es el número del contrato porque es lo que identifica el
 * expediente (§5.7); cada sub-vista abre con su `<h2>`. Lleva `tabindex="-1"`
 * para poder recibir el foco tras una escritura que repinta la cabecera.
 */
const props = defineProps<{
  subscription: SubscriptionResponse
  company: CompanyResponse | null
  companyError: string | null
  companyId: number
}>()

const periodo = computed(() => {
  const desde = formatDate(props.subscription.currentPeriodStart)
  const hasta = formatDate(props.subscription.currentPeriodEnd)
  return `${desde} → ${hasta}`
})
</script>

<template>
  <header class="ds-stack ds-stack--10">
    <RouterLink
      class="ds-btn ds-btn--plain ds-btn--sm volver"
      :to="{ name: ROUTE_NAMES.SUBSCRIPTIONS_ADMIN }"
    >
      <component :is="ICONS.BACK" :size="14" />
      Contratos
    </RouterLink>

    <div class="titular ds-flex-row">
      <h1 id="subscription-record-title" class="ds-display--xs numero" tabindex="-1">
        {{ subscription.subscriptionNumber }}
      </h1>
      <SubscriptionStatusBadge :status="subscription.status" />
      <AppBadge
        :label="subscription.current ? 'Vigente' : 'Histórico'"
        :variant="subscription.current ? 'success' : 'neutral'"
      />
    </div>

    <p class="ds-meta identidad">
      <span class="ds-text-strong">{{ company?.name ?? '—' }}</span>
      <template v-if="company?.identifier"> · NIT {{ company.identifier }}</template>
      ·
      <RouterLink
        :to="{ name: ROUTE_NAMES.COMPANY_DETAIL, params: { id: String(companyId) } }"
        :aria-label="`Empresa ${companyId}`"
      >
        empresa #{{ companyId }}
      </RouterLink>
    </p>

    <p v-if="companyError" class="ds-meta">
      {{ companyError }}. Se opera sobre la empresa #{{ companyId }}, que es la que viaja en la
      petición.
    </p>

    <p class="ds-meta">
      Ciclo {{ billingCycleLabel(subscription.billingCycle).toLowerCase() }} · periodo
      {{ periodo }} · próximo cobro {{ formatDate(subscription.nextBillingDate) }}
    </p>
  </header>
</template>

<style scoped>
.volver {
  align-self: flex-start;
}

/* `.ds-flex-row` ya pone `display/align-items/gap`: aquí solo lo que le falta,
   que es poder partirse en pantalla estrecha sin recortar los distintivos. */
.titular {
  flex-wrap: wrap;
}

.numero {
  margin: 0;
}

.identidad {
  margin: 0;
}
</style>
