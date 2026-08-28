<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import { toInstant, toLocalInstant, validateInstant } from '../composables/moneyFields'
import {
  DECLINE_KIND_PRESENTATION,
  SOFT_MAX_ATTEMPTS,
  SOFT_WINDOW_DAYS,
  type SystemPaymentAttemptResponse,
} from '../types/payment-attempts.types'

/**
 * <b>Mover la fecha del próximo reintento.</b>
 *
 * <p><b>No se llama «Reintentar» porque no reintenta nada.</b> El contrato no
 * publica ninguna ruta que dispare un cobro: `PATCH …/schedule` solo cambia cuándo
 * lo intentará el proceso de la pasarela. Rotularlo «Reintentar ahora» dejaría al
 * operador esperando un cobro que no ocurrió y volviendo a pulsar.
 *
 * <p><b>Este modal no se abre nunca sobre un rechazo duro</b> — la tabla no ofrece
 * el botón y el composable se niega igualmente—, pero si llegara, lo dice y no deja
 * guardar: una regla que solo vive en la vista es una regla que se abrirá el día que
 * alguien añada otra vista.
 *
 * <p>El contador de la ventana va escrito, con su cifra: {@code SOFT_MAX_ATTEMPTS}
 * intentos en {@code SOFT_WINDOW_DAYS} días. Un techo que no se ve es un techo que
 * nadie puede discutir con el proveedor.
 */
const props = defineProps<{
  open: boolean
  attempt: SystemPaymentAttemptResponse | null
  saving: boolean
}>()

const emit = defineEmits<{ close: []; submit: [nextAttemptAt: string] }>()

const fieldId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const value = ref('')
const touched = ref(false)

/** Cada apertura propone lo que ya estaba programado: no obliga a reescribirlo. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    value.value = toLocalInstant(props.attempt?.nextAttemptAt)
    touched.value = false
  },
)

const retryable = computed(() =>
  props.attempt ? DECLINE_KIND_PRESENTATION[props.attempt.declineKind].retryable : false,
)

const error = computed(() =>
  retryable.value ? validateInstant(value.value, 'La fecha del próximo reintento', true) : '',
)

const summaryItems = computed(() =>
  toSummaryItems({ next: touched.value ? error.value : '' }, { next: fieldId }, ['next']),
)

const subtitle = computed(() =>
  props.attempt
    ? `Intento #${props.attempt.id} · empresa #${props.attempt.companyId} · documento #${props.attempt.billingDocumentId}`
    : '',
)

function submit() {
  if (!retryable.value) return
  touched.value = true
  if (error.value) {
    summary.value?.focus()
    return
  }
  emit('submit', toInstant(value.value))
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Reprogramar el próximo reintento"
    :subtitle="subtitle"
    :icon="ICONS.HISTORY"
    compact
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <div class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Esto <strong>no cobra ahora</strong>: solo cambia cuándo lo intentará la pasarela. El
            techo es de {{ SOFT_MAX_ATTEMPTS }} intentos en {{ SOFT_WINDOW_DAYS }} días.
          </span>
        </div>

        <p v-if="attempt" class="ds-meta nota">
          Van {{ attempt.attemptNumber }} de {{ SOFT_MAX_ATTEMPTS }}. Último intento:
          {{ formatDate(attempt.attemptedAt) }}.
        </p>

        <div v-if="attempt && !retryable" class="ds-banner ds-banner--warning" role="alert">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            {{ DECLINE_KIND_PRESENTATION[attempt.declineKind].label }}:
            <strong>no se reintenta</strong>.
            {{ DECLINE_KIND_PRESENTATION[attempt.declineKind].nextStep }}
          </span>
        </div>

        <AppInput
          v-else
          :id="fieldId"
          v-model="value"
          label="Próximo reintento"
          required
          type="datetime-local"
          hint="Tiene que estar en el futuro."
          :error="touched ? error : ''"
          @blur="touched = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        v-if="retryable"
        type="button"
        class="ds-btn ds-btn--primary"
        :disabled="saving"
        @click="submit"
      >
        {{ saving ? 'Reprogramando…' : 'Reprogramar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.nota {
  margin: 0;
}
</style>
