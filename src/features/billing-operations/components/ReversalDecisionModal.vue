<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import { ICONS } from '@/constants/icons'
import { parseAmount, parseId, validateAmount, validateId } from '../composables/moneyFields'
import {
  OPPOSITION_GROUNDS,
  OPPOSITION_GROUND_LABEL,
  REVERSAL_OUTCOMES,
  REVERSAL_OUTCOME_LABEL,
  type OppositionGround,
  type OpposeReversalRequest,
  type PaymentReversalRequestResponse,
  type ResolveReversalRequest,
  type ReversalOutcome,
} from '../types/payment-reversals.types'

/**
 * <b>Las dos decisiones del expediente</b>: oponerse y resolver.
 *
 * <p>Van en el mismo componente porque son la misma forma —una <b>lista cerrada</b>
 * más una prueba escrita— y separarlas dejaría dos ficheros con el mismo cuerpo. Lo
 * que cambia es la lista y lo que se pide al lado, y eso es un `v-if` de tres
 * líneas, no un componente.
 *
 * <p><b>Las dos son acciones firmadas de verdad</b>, no un `confirm` disfrazado: el
 * contrato pide en las dos un valor de lista cerrada —el motivo de la oposición, la
 * salida de la solicitud— y en la oposición además una referencia de prueba
 * obligatoria. El modal compartido garantiza que no se emite nada sin motivo.
 *
 * <p><b>«Aceptada en parte» exige decir cuánto</b>, y por eso el importe aparece
 * solo con esa salida. Aceptar en parte sin cifra dejaría un expediente que no
 * cuadra con ningún movimiento de caja, y esa diferencia se descubre en la
 * conciliación del mes siguiente.
 */
const props = defineProps<{
  open: boolean
  action: 'oppose' | 'resolve'
  row: PaymentReversalRequestResponse | null
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  oppose: [payload: OpposeReversalRequest]
  resolve: [payload: ResolveReversalRequest]
}>()

type Field = 'appliedAmount' | 'resultingRefundId'

const ORDER: Field[] = ['appliedAmount', 'resultingRefundId']

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const GROUND_OPTIONS = OPPOSITION_GROUNDS.map((value) => ({
  value: value as string,
  label: OPPOSITION_GROUND_LABEL[value],
}))

const OUTCOME_OPTIONS = REVERSAL_OUTCOMES.map((value) => ({
  value: value as string,
  label: REVERSAL_OUTCOME_LABEL[value],
}))

/** En la oposición la prueba es obligatoria en los tres motivos: la exige el contrato. */
const ALL_GROUNDS = OPPOSITION_GROUNDS.map((value) => value as string)

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)

/** El importe revertido y la devolución que salió. Solo viven en «resolver». */
const form = reactive<Record<Field, string>>({ appliedAmount: '', resultingRefundId: '' })
const touched = reactive<Record<Field, boolean>>({
  appliedAmount: false,
  resultingRefundId: false,
})

/**
 * Las dos salidas que sí movieron dinero. Con cualquiera de ellas el importe pasa a
 * ser obligatorio.
 *
 * <p>La exigencia se comprueba <b>al confirmar</b> y no mientras se escribe, porque
 * el motivo elegido vive dentro del modal compartido y no sale de él hasta el
 * `submit`. El campo, en cambio, está siempre visible en «resolver»: esconderlo
 * hasta saber la salida obligaría a rellenarlo después de haber pulsado, que es
 * peor.
 */
const AMOUNT_REQUIRED_OUTCOMES: string[] = ['ACCEPTED', 'PARTIALLY_ACCEPTED']

/** El error que solo se conoce al confirmar: falta el importe de una salida que sí movió plata. */
const missingAmount = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    for (const field of ORDER) {
      form[field] = ''
      touched[field] = false
    }
    missingAmount.value = ''
  },
)

const errors = computed<Record<Field, string>>(() => ({
  appliedAmount: form.appliedAmount.trim()
    ? validateAmount(form.appliedAmount, 'El importe revertido')
    : missingAmount.value,
  resultingRefundId: validateId(form.resultingRefundId, 'La devolución resultante', false),
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

const title = computed(() =>
  props.action === 'oppose' ? 'Oponerse a la reversión' : 'Resolver la solicitud de reversión',
)

const question = computed(() => {
  const id = props.row ? `#${props.row.id}` : ''
  return props.action === 'oppose'
    ? `¿Oponerse a la solicitud ${id}?`
    : `¿Cerrar la solicitud ${id}?`
})

const consequence = computed(() =>
  props.action === 'oppose'
    ? 'La oposición queda con su motivo tasado y la referencia de su prueba. No cierra el expediente: el plazo sigue corriendo hasta que se resuelva.'
    : 'Cierra el expediente. Todas sus fases quedan a la vista: no se borra ninguna, y una solicitud cerrada no se reabre desde aquí.',
)

function onSigned(signature: SignedActionSignature) {
  if (props.action === 'oppose') {
    emit('oppose', {
      ground: signature.reason as OppositionGround,
      oppositionEvidenceRef: signature.note ?? '',
    })
    return
  }

  missingAmount.value =
    AMOUNT_REQUIRED_OUTCOMES.includes(signature.reason) && !form.appliedAmount.trim()
      ? 'Di cuánto se revirtió: sin la cifra, el expediente no cuadra con ningún movimiento de caja.'
      : ''

  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }
  emit('resolve', {
    outcome: signature.reason as ReversalOutcome,
    appliedAmount: parseAmount(form.appliedAmount),
    resultingRefundId: parseId(form.resultingRefundId),
  })
}
</script>

<template>
  <SignedActionModal
    :open="open"
    :title="title"
    :question="question"
    :consequence="consequence"
    :reasons="action === 'oppose' ? GROUND_OPTIONS : OUTCOME_OPTIONS"
    :reason-label="action === 'oppose' ? 'Motivo de la oposición' : 'Salida de la solicitud'"
    reason-hint="Lista cerrada: es lo que después se puede contar y lo que el regulador pregunta."
    :note-required-reasons="action === 'oppose' ? ALL_GROUNDS : []"
    :note-label="
      action === 'oppose' ? 'Referencia de la prueba de la oposición' : 'Nota del cierre'
    "
    :note-hint="
      action === 'oppose'
        ? 'Obligatoria: sin prueba, la oposición no se sostiene.'
        : 'Opcional: lo que el código de salida no cuenta.'
    "
    :max-note-length="255"
    :confirm-label="action === 'oppose' ? 'Registrar la oposición' : 'Cerrar la solicitud'"
    :confirm-tone="action === 'oppose' ? 'danger' : 'primary'"
    :saving="saving"
    :width="600"
    :icon="action === 'oppose' ? ICONS.WARNING : ICONS.CHECKED"
    @close="emit('close')"
    @submit="onSigned"
  >
    <template #details>
      <div v-if="action === 'resolve'" class="ds-stack ds-stack--16">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <!-- Visible siempre en «resolver» y obligatorio solo en las dos salidas que
             sí movieron plata. Esconderlo hasta saber la salida obligaría a
             rellenarlo después de haber pulsado confirmar. -->
        <AppInput
          :id="ids.appliedAmount"
          v-model="form.appliedAmount"
          label="Importe revertido"
          inputmode="decimal"
          hint="Obligatorio si la salida es «Aceptada» o «Aceptada en parte». En un rechazo o una retirada no se revirtió nada: déjalo vacío."
          :error="err('appliedAmount')"
          @blur="touched.appliedAmount = true"
        />

        <AppInput
          :id="ids.resultingRefundId"
          v-model="form.resultingRefundId"
          label="Devolución resultante"
          inputmode="numeric"
          hint="Opcional: la devolución de dinero que salió de aceptar esta reversión."
          :error="err('resultingRefundId')"
          @blur="touched.resultingRefundId = true"
        />
      </div>
    </template>
  </SignedActionModal>
</template>
