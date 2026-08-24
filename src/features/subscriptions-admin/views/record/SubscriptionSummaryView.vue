<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { useSubscriptionRecord } from '../../composables/useSubscriptionRecord'
import { BILLING_CYCLE_LABEL } from '../../composables/subscriptionStatusText'
import SubscriptionStatusBadge from '../../components/SubscriptionStatusBadge.vue'
import StatusTransitionModal from '../../components/record/StatusTransitionModal.vue'
import CancelSubscriptionModal from '../../components/record/CancelSubscriptionModal.vue'
import type {
  CancelSubscriptionRequest,
  SubscriptionStatusTransition,
} from '../../types/subscription-record.types'

/**
 * `/resumen` — el estado de la cuenta y <b>el único sitio del expediente con
 * acciones sobre el contrato</b> (§4.4.2). Las acciones sobre las líneas viven en
 * «Lo contratado», que es donde se ve su efecto.
 *
 * <p><b>Los datos se pintan como hechos, no como campos.</b> Van en un
 * `&lt;dl&gt;` sobre `.ds-detail-grid` y no en `&lt;input disabled&gt;`: un input
 * gris dice «editable, pero ahora no», y aquí no hay ninguna operación de edición
 * que exista. Es la misma decisión de §3.2 que ya aplicaron `QuoteDocument` y
 * `ExternalInvoiceRecord`, y por eso estas tres pantallas se leen igual.
 *
 * <p><b>No hay un desplegable con los seis estados.</b> Hay transiciones con
 * nombre —y solo las que tienen sentido desde el estado actual—, cada una con su
 * consecuencia escrita y un motivo obligatorio. Desde `CANCELLED` o `EXPIRED` no
 * se ofrece ninguna, y no se pinta un botón gris: se dice por qué no hay.
 *
 * <p><b>La cancelación separa las dos fechas</b> y no cambia el estado: el
 * contrato sigue vigente hasta la fecha efectiva, que es el periodo ya pagado.
 */
const {
  subscription,
  companyName,
  saving,
  supportText,
  transitions,
  canCancel,
  applyTransition,
  requestCancellation,
} = useSubscriptionRecord()

const activeTransition = ref<SubscriptionStatusTransition | null>(null)
const cancelOpen = ref(false)

const cancelPending = computed(
  () => !!subscription.value?.cancelRequestedAt || !!subscription.value?.cancelEffectiveDate,
)

/**
 * Tras una escritura el chasis se repinta con el estado nuevo. El foco va al
 * titular del expediente —que lleva `tabindex="-1"`— y no se queda en un botón
 * que puede haber desaparecido del árbol: es el mismo mecanismo de
 * `ErrorSummary` y de `QuoteDetailView`.
 */
async function focusRecordTitle() {
  await nextTick()
  document.getElementById('subscription-record-title')?.focus()
}

async function onTransitionSubmit(reason: string) {
  const transition = activeTransition.value
  if (!transition) return
  if (await applyTransition(transition, reason)) {
    activeTransition.value = null
    await focusRecordTitle()
  }
}

async function onCancelSubmit(payload: CancelSubscriptionRequest) {
  if (await requestCancellation(payload)) {
    cancelOpen.value = false
    await focusRecordTitle()
  }
}
</script>

<template>
  <section v-if="subscription" class="ds-stack ds-stack--18" aria-labelledby="record-summary-title">
    <div class="ds-card ds-stack ds-stack--14">
      <div class="ds-block-head">
        <h2 id="record-summary-title" class="ds-title">Resumen</h2>
        <SubscriptionStatusBadge :status="subscription.status" />
      </div>

      <!-- La frase de apoyo del estado (§3.4.1): el rótulo dice qué es y esto
           dice qué significa para la empresa. Ningún estado de esta consola se
           comunica solo con un color. -->
      <p class="ds-dialog-body">{{ supportText }}</p>

      <dl class="ds-detail-grid">
        <div>
          <dt class="ds-label">Contrato</dt>
          <dd class="valor">{{ subscription.subscriptionNumber }}</dd>
        </div>
        <div>
          <dt class="ds-label">Empresa</dt>
          <dd class="valor">{{ companyName }}</dd>
        </div>
        <div>
          <dt class="ds-label">Ciclo de facturación</dt>
          <dd class="valor">{{ BILLING_CYCLE_LABEL[subscription.billingCycle] }}</dd>
        </div>
        <div>
          <dt class="ds-label">Vigencia</dt>
          <dd class="valor">
            <AppBadge
              :label="subscription.current ? 'Vigente' : 'Histórico'"
              :variant="subscription.current ? 'success' : 'neutral'"
            />
          </dd>
        </div>
        <div>
          <dt class="ds-label">Inicio</dt>
          <dd class="valor">{{ formatDate(subscription.startDate) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Fin de la prueba</dt>
          <dd class="valor">{{ formatDate(subscription.trialEndDate) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Periodo actual</dt>
          <dd class="valor">
            {{ formatDate(subscription.currentPeriodStart) }} →
            {{ formatDate(subscription.currentPeriodEnd) }}
          </dd>
        </div>
        <div>
          <dt class="ds-label">Próximo cobro</dt>
          <dd class="valor">{{ formatDate(subscription.nextBillingDate) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Renovación</dt>
          <dd class="valor">{{ subscription.autoRenew ? 'Automática' : 'Manual' }}</dd>
        </div>
        <div>
          <dt class="ds-label">Días de cortesía</dt>
          <dd class="valor">{{ subscription.graceDays }}</dd>
        </div>
        <div>
          <dt class="ds-label">Permanencia</dt>
          <dd class="valor">{{ formatDate(subscription.commitmentEndDate) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Tarifa aplicada</dt>
          <dd class="valor">#{{ subscription.priceListId }}</dd>
        </div>
      </dl>
    </div>

    <!-- La baja pedida y todavía no efectiva. Se pinta como hecho del expediente
         y no como un aviso pasajero: hasta la fecha efectiva la empresa sigue
         trabajando con normalidad, y quien mire esta pantalla tiene que verlo. -->
    <div v-if="cancelPending" class="ds-card ds-stack ds-stack--10">
      <h2 class="ds-title">Cancelación registrada</h2>
      <dl class="ds-detail-grid">
        <div>
          <dt class="ds-label">Se solicitó</dt>
          <dd class="valor">{{ formatDate(subscription.cancelRequestedAt) }}</dd>
        </div>
        <div>
          <dt class="ds-label">Surte efecto</dt>
          <dd class="valor">{{ formatDate(subscription.cancelEffectiveDate) }}</dd>
        </div>
        <div class="ds-grid-span">
          <dt class="ds-label">Motivo</dt>
          <dd class="valor">{{ subscription.cancelReason ?? '—' }}</dd>
        </div>
      </dl>
      <p class="ds-meta">
        El contrato sigue vigente hasta la fecha efectiva: es el periodo que la empresa ya pagó.
      </p>
      <p v-if="subscription.commitmentEndDate" class="ds-meta">
        Permanencia hasta el {{ formatDate(subscription.commitmentEndDate) }}.
      </p>
    </div>

    <div class="ds-card ds-stack ds-stack--10">
      <h2 class="ds-title">Acciones sobre el contrato</h2>

      <p v-if="transitions.length === 0 && !canCancel" class="ds-meta">
        Un contrato terminado no cambia de estado ni se reabre: si la empresa vuelve, se firma uno
        nuevo desde su cotización.
      </p>

      <div v-else class="ds-actions acciones">
        <button
          v-for="transition in transitions"
          :key="transition.to"
          type="button"
          class="ds-btn"
          :class="transition.primary ? 'ds-btn--primary' : 'ds-btn--ghost'"
          :disabled="saving"
          @click="activeTransition = transition"
        >
          {{ transition.label }}
        </button>
        <button
          v-if="canCancel"
          type="button"
          class="ds-btn ds-btn--ghost"
          :disabled="saving"
          @click="cancelOpen = true"
        >
          <component :is="ICONS.WARNING" :size="15" />
          Cancelar contrato
        </button>
      </div>
    </div>

    <StatusTransitionModal
      v-if="activeTransition"
      :open="!!activeTransition"
      :transition="activeTransition"
      :subscription="subscription"
      :company-name="companyName"
      :saving="saving"
      @close="activeTransition = null"
      @submit="onTransitionSubmit"
    />

    <CancelSubscriptionModal
      :open="cancelOpen"
      :subscription="subscription"
      :company-name="companyName"
      :saving="saving"
      @close="cancelOpen = false"
      @submit="onCancelSubmit"
    />
  </section>
</template>

<style scoped>
.valor {
  margin: var(--space-4) 0 0;
}

/* `.ds-actions` alinea a la derecha; en este bloque las acciones son la tarea de
   la tarjeta, no el pie de un formulario, así que empiezan por la izquierda. */
.acciones {
  flex-wrap: wrap;
  justify-content: flex-start;
}
</style>
