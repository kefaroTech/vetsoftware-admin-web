<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import type { ReverseBillingDocumentApplicationRequest } from '../types/document-money.types'

const props = defineProps<{
  open: boolean
  applicationId: number | null
  saving: boolean
  /** La fila que abrió el modal desaparece al contra-aplicar con éxito. */
  returnFocusTo?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [applicationId: number, payload: ReverseBillingDocumentApplicationRequest]
}>()

const fieldId = useId()
const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const reason = ref('')
const touched = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    touched.value = false
  },
)

const error = computed(() => {
  const text = reason.value.trim()
  if (!text) return 'El motivo de la contra-aplicación es obligatorio.'
  return text.length > 255 ? 'El motivo no puede pasar de 255 caracteres.' : ''
})

const summaryItems = computed(() =>
  toSummaryItems({ reason: touched.value ? error.value : '' }, { reason: fieldId }, ['reason']),
)

function submit() {
  touched.value = true
  if (error.value || props.applicationId === null) {
    summary.value?.focus()
    return
  }
  emit('submit', props.applicationId, { reason: reason.value.trim() })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Contra-aplicar la aplicación"
    :subtitle="applicationId !== null ? `Aplicación #${applicationId}` : ''"
    :icon="ICONS.RETRY"
    accent="warn"
    compact
    :width="520"
    :return-focus-to="returnFocusTo"
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <div class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            No se borra nada: se añade una fila que anula a la original y las dos quedan a la vista.
          </span>
        </div>

        <AppInput
          :id="fieldId"
          v-model="reason"
          label="Motivo"
          required
          :maxlength="255"
          hint="Lo que alguien va a preguntar dentro de dos ejercicios: por qué se corrigió."
          :error="touched ? error : ''"
          @blur="touched = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--danger" :disabled="saving" @click="submit">
        {{ saving ? 'Contra-aplicando…' : 'Contra-aplicar' }}
      </button>
    </template>
  </ModalShell>
</template>
