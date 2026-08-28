<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import { formatDate } from '@/composables/format'
import type { PaymentReversalRequestResponse } from '../types/payment-reversals.types'

/**
 * <b>Dejar constancia de que se acusó recibo de la reclamación.</b>
 *
 * <p>Es la fase más barata del expediente y la que más se olvida: acusar recibo es
 * lo que demuestra, si el caso llega al regulador, que la queja no se quedó en un
 * cajón. El contrato pide una sola cosa —la referencia del acuse— y por eso este
 * modal <b>no</b> es una acción firmada: no hay motivo de lista cerrada que elegir,
 * y añadir uno pediría un dato que el borde descarta.
 *
 * <p>Acusar no es contestar y no es oponerse. La pantalla lo dice para que nadie
 * cierre el expediente creyendo que ya respondió.
 */
const props = defineProps<{
  open: boolean
  row: PaymentReversalRequestResponse | null
  saving: boolean
}>()

const emit = defineEmits<{ close: []; submit: [acknowledgementRef: string] }>()

const fieldId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const value = ref('')
const touched = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    value.value = ''
    touched.value = false
  },
)

const error = computed(() => {
  const text = value.value.trim()
  if (!text) return 'La referencia del acuse es obligatoria.'
  return text.length > 255 ? 'La referencia no puede pasar de 255 caracteres.' : ''
})

const summaryItems = computed(() =>
  toSummaryItems({ ref: touched.value ? error.value : '' }, { ref: fieldId }, ['ref']),
)

const subtitle = computed(() =>
  props.row
    ? `Solicitud #${props.row.id} · queja recibida el ${formatDate(props.row.claimReceivedAt)}`
    : '',
)

function submit() {
  touched.value = true
  if (error.value) {
    summary.value?.focus()
    return
  }
  emit('submit', value.value.trim())
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Registrar el acuse de recibo"
    :subtitle="subtitle"
    :icon="ICONS.CHECK"
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
            Acusar recibo <strong>no es contestar ni oponerse</strong>: solo deja constancia de que
            la reclamación llegó y cuándo. El plazo para contestar sigue corriendo.
          </span>
        </div>

        <AppInput
          :id="fieldId"
          v-model="value"
          label="Referencia del acuse"
          required
          :maxlength="255"
          hint="El radicado, el correo o el expediente donde consta que se acusó."
          :error="touched ? error : ''"
          @blur="touched = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Registrando…' : 'Registrar el acuse' }}
      </button>
    </template>
  </ModalShell>
</template>
