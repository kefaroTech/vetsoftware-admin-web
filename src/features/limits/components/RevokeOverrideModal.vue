<script setup lang="ts">
import { computed } from 'vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import { formatDate } from '@/composables/format'
import {
  OVERRIDE_NOTE_REQUIRED,
  OVERRIDE_REASON_LABEL,
  OVERRIDE_REASON_OPTIONS,
} from '../composables/limitText'
import type {
  CompanyLimitOverrideResponse,
  LimitOverrideReasonCode,
  RevokeCompanyLimitOverrideRequest,
} from '../types/limits.types'

/**
 * **Revocar una excepción de techo.** Acción que se firma, y destructiva.
 *
 * <p><b>La consecuencia se dice antes de confirmar, no después.</b> Revocar no
 * es «borrar una fila»: el techo vuelve al del contrato o al del plan y, si el
 * consumo actual ya lo supera, la cuenta queda **desbordada y congelada**. Quien
 * firma tiene que saberlo antes, porque el cliente lo va a notar en el minuto
 * siguiente.
 *
 * <p><b>La excepción revocada no desaparece.</b> Queda con quién la retiró, cuándo
 * y por qué: es la prueba de que existió. Por eso el modal habla de «revocar» y
 * no de «eliminar».
 *
 * <p>El motivo vuelve a ser de lista cerrada, y es la MISMA lista que la de la
 * concesión: el contrato usa el mismo enumerado en `reasonCode` y en
 * `revokedReasonCode`, y así el informe cruza concesiones con revocaciones.
 */
const props = defineProps<{
  open: boolean
  /** La excepción viva que se retira. `null` cierra el modal desde el padre. */
  override: CompanyLimitOverrideResponse | null
  /** Cómo se llama el eje, para que la pregunta lleve el sujeto (R04). */
  dimensionName: string
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [limitDimensionId: number, payload: RevokeCompanyLimitOverrideRequest]
}>()

const question = computed(() =>
  props.override === null
    ? ''
    : `¿Revocar la excepción de «${props.dimensionName}» de la empresa #${props.override.companyId}?`,
)

function submit(signature: SignedActionSignature) {
  const override = props.override
  if (override === null) return

  const revokedReasonCode: LimitOverrideReasonCode | undefined = OVERRIDE_REASON_OPTIONS.find(
    (o) => o.value === signature.reason,
  )?.value
  if (revokedReasonCode === undefined) return

  emit('submit', override.limitDimensionId, {
    revokedReasonCode,
    // El contrato exige texto. Con nota, la nota; sin ella, el rótulo del
    // motivo escrito — el mismo motivo, no un dato nuevo.
    revokedReason: signature.note ?? OVERRIDE_REASON_LABEL[revokedReasonCode],
  })
}
</script>

<template>
  <SignedActionModal
    :open="open"
    title="Revocar la excepción de techo"
    :question="question"
    :reasons="OVERRIDE_REASON_OPTIONS"
    :note-required-reasons="OVERRIDE_NOTE_REQUIRED"
    reason-hint="La misma lista cerrada que la concesión, para poder cruzar unas con otras en el informe."
    note-hint="Qué cambió respecto a cuando se concedió. Es lo que alguien leerá dentro de dos años."
    consequence="El techo vuelve al que fijan el contrato o el plan. Si el consumo actual ya lo supera, la cuenta queda desbordada: conserva todo lo suyo y deja de poder crear más."
    confirm-label="Revocar la excepción"
    :saving="saving"
    @close="emit('close')"
    @submit="submit"
  >
    <template #details>
      <dl v-if="override" class="ds-detail-grid">
        <dt class="ds-meta">Techo concedido</dt>
        <dd class="ds-text-strong">{{ override.limitQuantity }}</dd>
        <dt class="ds-meta">Rige desde</dt>
        <dd class="ds-text-strong">{{ formatDate(override.validFrom) }}</dd>
        <dt class="ds-meta">Se concedió por</dt>
        <dd class="ds-text-strong">{{ OVERRIDE_REASON_LABEL[override.reasonCode] }}</dd>
        <dt class="ds-meta">Con la nota</dt>
        <dd class="ds-text-strong">{{ override.reason }}</dd>
      </dl>
    </template>
  </SignedActionModal>
</template>
