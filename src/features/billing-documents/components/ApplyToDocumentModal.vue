<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  newRequestId,
  parseAmount,
  parseId,
  validateAmount,
  validateId,
} from '@/features/billing-operations/composables/moneyFields'
import {
  APPLICATION_SOURCE_PRESENTATION,
  type ApplicationSourceKind,
} from '../types/billing-documents.types'
import {
  APPLICATION_SOURCE_FORM,
  type ApplyBillingDocumentRequest,
} from '../types/document-money.types'
import { formatAmount } from '@/composables/format'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'
/**
 * <b>Registrar a mano qué salda este documento.</b>
 *
 * <p>Es la fila «correcta» de la secuencia que exige el modelo: una aplicación
 * equivocada no se borra —se contra-aplica— y después se registra la buena. Las
 * tres quedan visibles.
 *
 * <p><b>Los seis orígenes no son intercambiables, y el formulario lo dice.</b> Tres
 * de ellos tienen un camino mejor que este y el aviso lo nombra al elegirlos: una
 * retención registrada por aquí guarda el importe y <b>nada más</b> —ni el tipo, ni
 * la base, ni la tarifa, ni el municipio, ni el año gravable—, que son justo los
 * datos que hacen falta el día que la contadora del cliente pide el certificado.
 * Ofrecer el camino largo sin decir que hay uno corto es cómo se llena la base de
 * retenciones inservibles.
 *
 * <p><b>La referencia depende del origen.</b> Solo `PAYMENT` admite un pago y solo
 * `CREDIT_NOTE` admite un documento de origen; los otros cuatro no traen ninguna
 * referencia en el contrato. El campo aparece o desaparece en vez de quedarse
 * apagado: un campo gris invita a preguntarse qué hay que hacer para encenderlo.
 *
 * <p><b>El importe va en positivo.</b> El signo lo da el tipo del documento y el
 * sentido de la fila, nunca un menos tecleado aquí.
 *
 * <p><b>`clientRequestId` se genera al abrir</b>, no al enviar: es la llave de
 * idempotencia y tiene que ser la misma en el reintento del mismo envío. Una llave
 * nueva por clic dejaría que un doble clic saldara el documento dos veces.
 */
const props = defineProps<{
  open: boolean
  documentId: number
  documentNumber: string | null
  balanceAmount: number
  saving: boolean
  returnFocusTo?: string
}>()

const emit = defineEmits<{ close: []; submit: [payload: ApplyBillingDocumentRequest] }>()

type Field = 'sourceKind' | 'appliedAmount' | 'paymentId' | 'sourceDocumentId'

const ORDER: Field[] = ['sourceKind', 'appliedAmount', 'paymentId', 'sourceDocumentId']

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const SOURCE_OPTIONS: { value: string; label: string }[] = (
  Object.keys(APPLICATION_SOURCE_PRESENTATION) as ApplicationSourceKind[]
).map((value) => ({ value, label: APPLICATION_SOURCE_PRESENTATION[value].label }))

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const requestId = ref(newRequestId())

const form = reactive<Record<Field, string>>({
  sourceKind: '',
  appliedAmount: '',
  paymentId: '',
  sourceDocumentId: '',
})

const touched = reactive<Record<Field, boolean>>({
  sourceKind: false,
  appliedAmount: false,
  paymentId: false,
  sourceDocumentId: false,
})

/** Cada apertura empieza en blanco y con llave nueva: es otro movimiento de dinero. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    for (const field of ORDER) {
      form[field] = ''
      touched[field] = false
    }
    requestId.value = newRequestId()
  },
)

const kind = computed(() => (form.sourceKind ? (form.sourceKind as ApplicationSourceKind) : null))

const shape = computed(() => (kind.value ? APPLICATION_SOURCE_FORM[kind.value] : null))

const errors = computed<Record<Field, string>>(() => ({
  sourceKind: form.sourceKind ? '' : 'Debes seleccionar el origen de la aplicación.',
  appliedAmount: validateAmount(form.appliedAmount, 'El importe aplicado'),
  paymentId:
    shape.value?.reference === 'PAYMENT'
      ? validateId(form.paymentId, 'El pago que salda este documento')
      : '',
  sourceDocumentId:
    shape.value?.reference === 'DOCUMENT'
      ? validateId(form.sourceDocumentId, 'El documento que salda a este')
      : '',
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

/**
 * Aplicar más de lo que queda vivo. No bloquea —el servidor es quien manda sobre
 * el saldo y puede haber filas que esta pantalla no ha releído—, pero un importe
 * mayor que el saldo casi siempre es un dígito de más.
 */
const overpays = computed(() => {
  const value = parseAmount(form.appliedAmount)
  return value !== null && value > props.balanceAmount
})

const subtitle = computed(() => {
  const name = props.documentNumber ?? 'Documento #' + props.documentId
  return name + ' · saldo ' + formatAmount(props.balanceAmount)
})

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    summary.value?.focus()
    return
  }
  emit('submit', {
    targetDocumentId: props.documentId,
    sourceKind: form.sourceKind as ApplicationSourceKind,
    paymentId: shape.value?.reference === 'PAYMENT' ? parseId(form.paymentId) : null,
    sourceDocumentId: shape.value?.reference === 'DOCUMENT' ? parseId(form.sourceDocumentId) : null,
    appliedAmount: parseAmount(form.appliedAmount) ?? 0,
    clientRequestId: requestId.value,
  })
}

function isDirty() {
  return ORDER.some((field) => form[field].trim() !== '')
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Registrar una aplicación sobre este documento"
    :subtitle="subtitle"
    :icon="ICONS.RECEIPT"
    compact
    :width="600"
    :return-focus-to="returnFocusTo"
    :confirm-close-when="isDirty"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="La aplicación no se ha registrado. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <MoneyScopeNote />

        <AppSelect
          :id="ids.sourceKind"
          v-model="form.sourceKind"
          :options="SOURCE_OPTIONS"
          label="Origen"
          required
          placeholder="Qué está saldando este documento"
          :hint="kind ? APPLICATION_SOURCE_PRESENTATION[kind].meaning : undefined"
          :error="err('sourceKind')"
          @blur="touched.sourceKind = true"
        />

        <!-- El camino mejor, nombrado donde se elige el peor. -->
        <div v-if="shape?.betterRoute" class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">{{ shape.betterRoute }}</span>
        </div>

        <AppInput
          :id="ids.appliedAmount"
          v-model="form.appliedAmount"
          label="Importe aplicado"
          required
          inputmode="decimal"
          hint="Siempre en positivo: el signo lo da el tipo del documento."
          :error="err('appliedAmount')"
          @blur="touched.appliedAmount = true"
        />

        <p v-if="overpays" class="ds-meta nota">
          El importe supera el saldo vivo del documento ({{ formatAmount(balanceAmount) }}). Se
          puede registrar —manda el saldo del servidor—, pero comprueba que no sobra un dígito.
        </p>

        <AppInput
          v-if="shape?.reference === 'PAYMENT'"
          :id="ids.paymentId"
          v-model="form.paymentId"
          label="Pago"
          required
          inputmode="numeric"
          hint="Identificador del pago recibido, tal como aparece en «Pagos»."
          :error="err('paymentId')"
          @blur="touched.paymentId = true"
        />

        <AppInput
          v-if="shape?.reference === 'DOCUMENT'"
          :id="ids.sourceDocumentId"
          v-model="form.sourceDocumentId"
          label="Documento de origen"
          required
          inputmode="numeric"
          hint="La nota crédito que corrige a este documento."
          :error="err('sourceDocumentId')"
          @blur="touched.sourceDocumentId = true"
        />

        <p v-if="shape?.reference === 'NONE'" class="ds-meta nota">
          Este origen no lleva ninguna referencia en el contrato: la fila dirá «Sin referencia».
        </p>
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Registrando…' : 'Registrar la aplicación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.nota {
  margin: 0;
}
</style>
