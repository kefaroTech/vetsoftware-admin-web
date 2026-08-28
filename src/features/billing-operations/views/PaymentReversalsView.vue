<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import AcknowledgeReversalModal from '../components/AcknowledgeReversalModal.vue'
import OpenReversalModal from '../components/OpenReversalModal.vue'
import PaymentReversalsTable from '../components/PaymentReversalsTable.vue'
import ReversalDecisionModal from '../components/ReversalDecisionModal.vue'
import { REVERSAL_HORIZON_DAYS, usePaymentReversals } from '../composables/usePaymentReversals'
import {
  REVERSAL_URGENT_DAYS,
  type PaymentReversalRequestResponse,
} from '../types/payment-reversals.types'

/**
 * <b>Reversiones de pago</b> — la figura del Estatuto del Consumidor.
 *
 * <p><b>Lo que ordena esta pantalla es el reloj.</b> Una reversión no contestada a
 * tiempo se pierde por silencio, así que la cola de vencimientos va arriba y sale de
 * `/system/payment-reversal-requests/expiring`, que corta por fecha <b>en el
 * servidor</b>. Filtrar el feed en el cliente diría «no vence nada» sobre una página
 * de 20 de 300.
 *
 * <p><b>Nada se borra.</b> Abrir, acusar, oponerse y resolver son cuatro fases del
 * mismo expediente y las cuatro quedan. El día que el caso llegue al regulador lo
 * que importa es la secuencia entera, no el estado final — por eso esta pantalla no
 * tiene ni una papelera.
 *
 * <p><b>Recarga al abrir</b>, regla obligatoria del proyecto.
 */
const {
  feed,
  expiring,
  savingOpen,
  savingAcknowledge,
  savingOppose,
  savingResolve,
  reloadAll,
  open: openRequest,
  acknowledge,
  oppose,
  resolve,
} = usePaymentReversals()

const opening = ref(false)
const acknowledging = ref<PaymentReversalRequestResponse | null>(null)
const deciding = ref<PaymentReversalRequestResponse | null>(null)
const decision = ref<'oppose' | 'resolve'>('oppose')

const busy = computed(() => savingAcknowledge.value || savingOppose.value || savingResolve.value)

const headline = computed(() => {
  const total = feed.total.value
  return total === 1 ? '1 solicitud de reversión' : `${total} solicitudes de reversión`
})

function decide(row: PaymentReversalRequestResponse, action: 'oppose' | 'resolve') {
  decision.value = action
  deciding.value = row
}

onMounted(() => void reloadAll())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="reversiones-titulo">
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="reversiones-titulo" class="ds-display--sm titular" tabindex="-1">
          {{ headline }}
        </h2>
        <p class="ds-sr-only" role="status">{{ feed.loading.value ? '' : headline }}</p>
        <p class="ds-meta">
          Cinco causales tasadas y tres fechas distintas. El reloj del consumidor arranca cuando
          <strong>él</strong> tuvo conocimiento, no cuando llegó la queja.
        </p>
      </div>
      <button type="button" class="ds-btn ds-btn--primary" @click="opening = true">
        <component :is="ICONS.ADD" :size="15" />
        Abrir solicitud
      </button>
    </div>

    <section class="ds-stack ds-stack--10" aria-labelledby="vencen-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="vencen-titulo" class="ds-title titular">Las que vencen pronto</h3>
        <p class="ds-meta">
          Plazo dentro de los próximos {{ REVERSAL_HORIZON_DAYS }} días, o ya vencido. A menos de
          {{ REVERSAL_URGENT_DAYS }} días ya no da tiempo a reunir la prueba de una oposición: el
          corte se ve escrito para que se pueda discutir.
        </p>
      </div>

      <PaymentReversalsTable
        :rows="expiring.items.value"
        :page="expiring.page.value"
        :page-size="expiring.pageSize.value"
        :total="expiring.total.value"
        :page-count="expiring.pageCount.value"
        :loading="expiring.loading.value"
        :error="expiring.error.value"
        :error-trace-id="expiring.errorTraceId.value"
        :busy="busy"
        @retry="expiring.reload"
        @update:page="expiring.goTo"
        @acknowledge="acknowledging = $event"
        @oppose="decide($event, 'oppose')"
        @resolve="decide($event, 'resolve')"
      >
        <template #empty>
          <AppEmptyState
            title="Ninguna solicitud vence en la ventana"
            :description="`Nada llega a su plazo en los próximos ${REVERSAL_HORIZON_DAYS} días. El corte lo hace el servidor, así que esto vale sobre el total.`"
          />
        </template>
      </PaymentReversalsTable>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="expedientes-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="expedientes-titulo" class="ds-title titular">Todos los expedientes</h3>
        <p class="ds-meta">
          Abiertos y cerrados. Una solicitud resuelta conserva todas sus fases: no se borra ninguna.
        </p>
      </div>

      <PaymentReversalsTable
        :rows="feed.items.value"
        :page="feed.page.value"
        :page-size="feed.pageSize.value"
        :total="feed.total.value"
        :page-count="feed.pageCount.value"
        :loading="feed.loading.value"
        :error="feed.error.value"
        :error-trace-id="feed.errorTraceId.value"
        :busy="busy"
        @retry="feed.reload"
        @update:page="feed.goTo"
        @acknowledge="acknowledging = $event"
        @oppose="decide($event, 'oppose')"
        @resolve="decide($event, 'resolve')"
      >
        <template #empty>
          <AppEmptyState
            title="Ningún cliente ha pedido revertir un pago"
            description="Es un hecho, no un fallo: la reversión es excepcional y su ausencia es lo normal."
          />
        </template>
      </PaymentReversalsTable>
    </section>

    <OpenReversalModal
      :open="opening"
      :saving="savingOpen"
      @close="opening = false"
      @submit="
        async (empresa, payload) => {
          if (await openRequest(empresa, payload)) opening = false
        }
      "
    />

    <AcknowledgeReversalModal
      :open="acknowledging !== null"
      :row="acknowledging"
      :saving="savingAcknowledge"
      @close="acknowledging = null"
      @submit="
        async (acknowledgementRef) => {
          if (acknowledging && (await acknowledge(acknowledging, { acknowledgementRef })))
            acknowledging = null
        }
      "
    />

    <ReversalDecisionModal
      :open="deciding !== null"
      :action="decision"
      :row="deciding"
      :saving="decision === 'oppose' ? savingOppose : savingResolve"
      @close="deciding = null"
      @oppose="
        async (payload) => {
          if (deciding && (await oppose(deciding, payload))) deciding = null
        }
      "
      @resolve="
        async (payload) => {
          if (deciding && (await resolve(deciding, payload))) deciding = null
        }
      "
    />
  </section>
</template>

<style scoped>
.titular {
  margin: 0;
}
</style>
