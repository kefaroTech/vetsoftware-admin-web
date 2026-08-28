<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppEmptyState from '@/components/feedback/AppEmptyState.vue'
import { ICONS } from '@/constants/icons'
import CompanyScopeFilter from '../components/CompanyScopeFilter.vue'
import DeclineKindLegend from '../components/DeclineKindLegend.vue'
import PaymentAttemptsTable from '../components/PaymentAttemptsTable.vue'
import RecordAttemptModal from '../components/RecordAttemptModal.vue'
import RescheduleAttemptModal from '../components/RescheduleAttemptModal.vue'
import { ATTEMPT_DUE_HORIZON_DAYS, usePaymentAttempts } from '../composables/usePaymentAttempts'
import type { SystemPaymentAttemptResponse } from '../types/payment-attempts.types'

/**
 * <b>Intentos de cobro y su reintento.</b>
 *
 * <p>La pantalla está organizada alrededor de la única decisión que importa:
 * <b>qué familia de rechazo es</b>. La leyenda va arriba y no en un desplegable,
 * porque quien no la haya leído reintentará un rechazo duro —y las redes cobran por
 * eso— o arrancará cobranza contra un cliente por una credencial nuestra mal puesta.
 *
 * <p><b>Dos listas y no una.</b> La cola de reintentos programados sale de
 * `/system/payment-attempts/due`, que corta por fecha <b>en el servidor</b>.
 * Filtrar el feed en el cliente diría «no hay nada programado» sobre una página de
 * 20 de 300. El horizonte va escrito —{@code ATTEMPT_DUE_HORIZON_DAYS} días— porque
 * una lista con un corte invisible se lee como «esto es todo».
 *
 * <p><b>Recarga al abrir</b>, regla obligatoria del proyecto.
 */
const {
  feed,
  due,
  savingAttempt,
  savingReschedule,
  companyId,
  applyCompanyFilter,
  reloadAll,
  record,
  reschedule,
} = usePaymentAttempts()

const recording = ref(false)
const rescheduling = ref<SystemPaymentAttemptResponse | null>(null)

const headline = computed(() => {
  const total = feed.total.value
  const base = total === 1 ? '1 intento de cobro' : `${total} intentos de cobro`
  return companyId.value === null ? base : `${base} de la empresa #${companyId.value}`
})

onMounted(() => void reloadAll())
</script>

<template>
  <section class="ds-stack ds-stack--14" aria-labelledby="intentos-titulo">
    <div class="ds-head">
      <div class="ds-stack ds-stack--8">
        <h2 id="intentos-titulo" class="ds-display--sm titular" tabindex="-1">{{ headline }}</h2>
        <p class="ds-sr-only" role="status">{{ feed.loading.value ? '' : headline }}</p>
        <p class="ds-meta">
          Aquí no se cobra: se anota qué contestó la pasarela y cuándo se volverá a intentar.
        </p>
      </div>
      <button type="button" class="ds-btn ds-btn--primary" @click="recording = true">
        <component :is="ICONS.ADD" :size="15" />
        Anotar intento
      </button>
    </div>

    <DeclineKindLegend />

    <!-- La lista de trabajo, antes que el feed: lo que hay que mirar hoy. -->
    <section class="ds-stack ds-stack--10" aria-labelledby="cola-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="cola-titulo" class="ds-title titular">Reintentos programados</h3>
        <p class="ds-meta">
          Los que tienen fecha dentro de los próximos {{ ATTEMPT_DUE_HORIZON_DAYS }} días, o ya
          vencida. El corte lo hace el servidor, así que esto vale sobre el total.
        </p>
      </div>

      <PaymentAttemptsTable
        :attempts="due.items.value"
        :page="due.page.value"
        :page-size="due.pageSize.value"
        :total="due.total.value"
        :page-count="due.pageCount.value"
        :loading="due.loading.value"
        :error="due.error.value"
        :error-trace-id="due.errorTraceId.value"
        show-reschedule
        :busy="savingReschedule"
        @retry="due.reload"
        @update:page="due.goTo"
        @reschedule="rescheduling = $event"
      >
        <template #empty>
          <AppEmptyState
            title="Ningún reintento programado en la ventana"
            :description="`Nada vence en los próximos ${ATTEMPT_DUE_HORIZON_DAYS} días. Es un hecho, no un fallo: los rechazos duros no programan reintento nunca.`"
          />
        </template>
      </PaymentAttemptsTable>
    </section>

    <section class="ds-stack ds-stack--10" aria-labelledby="feed-titulo">
      <div class="ds-stack ds-stack--8">
        <h3 id="feed-titulo" class="ds-title titular">Todos los intentos</h3>
        <p class="ds-meta">El histórico completo, con el código crudo de cada pasarela.</p>
      </div>

      <CompanyScopeFilter
        :company-id="companyId"
        items-label="los intentos"
        @apply="applyCompanyFilter"
      />

      <PaymentAttemptsTable
        :attempts="feed.items.value"
        :page="feed.page.value"
        :page-size="feed.pageSize.value"
        :total="feed.total.value"
        :page-count="feed.pageCount.value"
        :loading="feed.loading.value"
        :error="feed.error.value"
        :error-trace-id="feed.errorTraceId.value"
        @retry="feed.reload"
        @update:page="feed.goTo"
      >
        <template #empty>
          <AppEmptyState
            v-if="companyId !== null"
            :title="`Ningún intento de la empresa #${companyId}`"
            description="El filtro lo aplica el servidor, así que esto vale para todas las páginas."
            :icon="ICONS.SEARCH"
          >
            <button type="button" class="ds-btn ds-btn--ghost" @click="applyCompanyFilter(null)">
              <component :is="ICONS.CLOSE" :size="15" />
              Quitar el filtro
            </button>
          </AppEmptyState>

          <AppEmptyState
            v-else
            title="Todavía no se ha intentado ningún cobro"
            description="Los intentos aparecen aquí en cuanto la pasarela reporta uno o alguien lo anota."
          />
        </template>
      </PaymentAttemptsTable>
    </section>

    <RecordAttemptModal
      :open="recording"
      :saving="savingAttempt"
      :default-company-id="companyId"
      @close="recording = false"
      @submit="
        async (empresa, payload) => {
          if (await record(empresa, payload)) recording = false
        }
      "
    />

    <RescheduleAttemptModal
      :open="rescheduling !== null"
      :attempt="rescheduling"
      :saving="savingReschedule"
      @close="rescheduling = null"
      @submit="
        async (nextAttemptAt) => {
          if (rescheduling && (await reschedule(rescheduling, nextAttemptAt))) rescheduling = null
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
