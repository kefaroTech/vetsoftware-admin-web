<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import PlatformSetupChecklist from '@/components/feedback/PlatformSetupChecklist.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useSubscriptionsAdmin } from '../composables/useSubscriptionsAdmin'
import { billingCycleLabel } from '../composables/subscriptionStatusText'
import SubscriptionStatusBadge from '../components/SubscriptionStatusBadge.vue'
import SubscriptionOverlapsPanel from '../components/SubscriptionOverlapsPanel.vue'
import { SUBSCRIPTION_RECORD_ROUTE_NAMES } from '@/router/routes/subscriptions-admin.routes'
import type { SubscriptionResponse } from '../types/subscriptions-admin.types'

const {
  subscriptions,
  page,
  pageSize,
  total,
  pageCount,
  overlaps,
  loading,
  loadingSubscriptions,
  loadingOverlaps,
  subscriptionsError,
  subscriptionsErrorTraceId,
  overlapsError,
  overlapsErrorTraceId,
  loadSubscriptions,
  loadOverlaps,
  refreshAll,
} = useSubscriptionsAdmin()

const router = useRouter()

/**
 * W2-A · la fila lleva al expediente del contrato.
 *
 * <p>La empresa viaja en la ruta y no solo el contrato: las diez rutas de
 * `/subscriptions/**` resuelven la empresa con la cabecera `X-Company-Id`, que
 * hay que poder mandar en la primera petición del expediente. Desde aquí se sabe
 * —`subscription.companyId` viene en la fila—, y así el enlace que soporte pega
 * en un ticket sigue funcionando al abrirlo en frío. El porqué completo está en
 * `src/router/routes/subscriptions-admin.routes.ts`.
 */
function recordRoute(subscription: SubscriptionResponse) {
  return {
    name: SUBSCRIPTION_RECORD_ROUTE_NAMES.RECORD,
    params: { companyId: String(subscription.companyId), id: String(subscription.id) },
  }
}

function openRecord(subscription: SubscriptionResponse) {
  void router.push(recordRoute(subscription))
}

onMounted(refreshAll)
</script>

<template>
  <AppLayout>
    <div class="ds-stack ds-stack--18">
      <div class="ds-head">
        <div>
          <h1 class="ds-title">Suscripciones</h1>
          <p class="ds-subtitle">Contratos de todas las empresas de la plataforma.</p>
        </div>
        <button type="button" class="ds-btn ds-btn--ghost" :disabled="loading" @click="refreshAll">
          <component :is="ICONS.RETRY" :size="15" />
          Actualizar
        </button>
      </div>

      <section class="ds-stack ds-stack--10" aria-labelledby="subscriptions-title">
        <div class="ds-block-head">
          <div class="ds-stack ds-stack--8">
            <h2 id="subscriptions-title" class="ds-title">Contratos</h2>
            <p class="ds-meta">{{ total }} contratos registrados</p>
          </div>
        </div>

        <AppTable
          caption="Contratos"
          :headers="[
            'Contrato',
            'Empresa',
            'Estado',
            'Vigencia',
            'Ciclo',
            'Periodo actual',
            'Próximo cobro',
            'Renovación',
          ]"
          :empty="subscriptions.length === 0"
          :loading="loadingSubscriptions"
          :error="subscriptionsError"
          :trace-id="subscriptionsErrorTraceId"
          @retry="loadSubscriptions(page)"
        >
          <template #empty>
            <!--
              §3.7 · Sin contratos y sin filtro, la causa más probable no es que
              nadie haya contratado: es que el alta de empresas está fallando
              porque el catálogo no está sembrado. La forma compacta lo dice en
              una línea y enlaza a donde se arregla; si no falta ningún paso, no
              se pinta y queda el vacío honesto de abajo.
            -->
            <PlatformSetupChecklist variant="compact" purpose="contratar" />
            <AppEmptyState
              title="Aún no hay contratos"
              description="Cada empresa nueva aparecerá aquí cuando tenga su suscripción inicial."
            />
          </template>

          <!--
            La fila entera navega, y además la primera celda es un `RouterLink`
            real: una fila clicable sin un enlace dentro no es alcanzable por
            teclado. El enlace detiene la propagación para no navegar dos veces.
          -->
          <tr
            v-for="subscription in subscriptions"
            :key="subscription.id"
            class="ds-row-clickable"
            @click="openRecord(subscription)"
          >
            <td>
              <RouterLink class="ds-text-strong" :to="recordRoute(subscription)" @click.stop>
                {{ subscription.subscriptionNumber }}
              </RouterLink>
              <span class="ds-meta"> · #{{ subscription.id }}</span>
            </td>
            <td class="ds-text-strong">#{{ subscription.companyId }}</td>
            <td><SubscriptionStatusBadge :status="subscription.status" /></td>
            <td>
              <AppBadge
                :label="subscription.current ? 'Vigente' : 'Histórico'"
                :variant="subscription.current ? 'success' : 'neutral'"
              />
            </td>
            <td>{{ billingCycleLabel(subscription.billingCycle) }}</td>
            <td>
              {{ formatDate(subscription.currentPeriodStart) }} →
              {{ formatDate(subscription.currentPeriodEnd) }}
            </td>
            <td>
              {{ formatDate(subscription.nextBillingDate) }}
              <span v-if="subscription.pastDueSince" class="ds-meta">
                · vencido desde {{ subscription.pastDueSince }}
              </span>
            </td>
            <td>{{ subscription.autoRenew ? 'Automática' : 'Manual' }}</td>
          </tr>
        </AppTable>

        <AppPagination
          v-if="!subscriptionsError && total > 0"
          :page="page"
          :page-size="pageSize"
          :total="total"
          :page-count="pageCount"
          @update:page="loadSubscriptions"
        />
      </section>

      <SubscriptionOverlapsPanel
        :items="overlaps"
        :loading="loadingOverlaps"
        :error="overlapsError"
        :trace-id="overlapsErrorTraceId"
        @retry="loadOverlaps"
      />
    </div>
  </AppLayout>
</template>
