<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import { ICONS } from '@/constants/icons'
import {
  newRequestId,
  parseAmount,
  parseId,
  toInstant,
  validateAmount,
  validateDate,
  validateId,
  validateInstant,
} from '../composables/moneyFields'
import {
  REFUND_METHODS,
  REFUND_METHOD_LABEL,
  REFUND_METHOD_MEANING,
  REFUND_REASON_CODES,
  REFUND_REASON_LABEL,
  type RefundMethod,
  type RefundReasonCode,
  type RegisterPaymentRefundRequest,
} from '../types/payment-refunds.types'

/**
 * <b>Registrar una devolución de dinero.</b>
 *
 * <p><b>Sacar dinero exige firma, y por eso esto es un `SignedActionModal` y no un
 * formulario cualquiera.</b> El contrato lo pide con su propia forma: importe,
 * medio, cuenta destino, fecha de giro, fecha valor, motivo de <b>lista cerrada</b>,
 * motivo <b>escrito</b> y <b>autorizante</b>. Los ocho, y el modal compartido aporta
 * los dos últimos con su regla: sin motivo no se emite nunca.
 *
 * <p><b>La nota es obligatoria en los seis motivos</b>, no solo en «Otro»: el
 * contrato declara `reason` requerido, así que ninguna devolución puede quedar sin
 * explicación escrita. Es lo que se lee dentro de dos ejercicios cuando alguien
 * pregunta por qué salieron 400.000 pesos.
 *
 * <p><b>Devolver a saldo a favor NO es devolver dinero.</b> Con
 * `CUSTOMER_CREDIT` no sale nada de la cuenta: se abre un lote que el cliente
 * consumirá en su próxima cuenta de cobro y que <b>caduca</b>. El aviso lo dice al
 * elegirlo, porque el cliente que pidió su plata y recibió un crédito que se le
 * vence es el peor final posible de esta pantalla.
 *
 * <p><b>La empresa se escribe, no se hereda.</b> El endpoint la exige y tiene que
 * ser la del pago que se devuelve. Se propone la del filtro activo cuando lo hay,
 * pero es un campo visible: una empresa implícita en una salida de caja es el
 * mecanismo con el que se le devuelve el dinero a la clínica equivocada.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  /** La empresa del filtro activo, si la hay. Se propone; no se impone. */
  defaultCompanyId?: number | null
}>()

const emit = defineEmits<{
  close: []
  submit: [companyId: number, payload: RegisterPaymentRefundRequest]
}>()

type Field =
  | 'companyId'
  | 'paymentId'
  | 'sourceDocumentId'
  | 'amount'
  | 'method'
  | 'destinationReference'
  | 'refundedAt'
  | 'valueDate'
  | 'authorizedBySystemUserId'

/** El orden del resumen es el orden VISUAL del formulario (WCAG §2.4.3). */
const ORDER: Field[] = [
  'companyId',
  'paymentId',
  'amount',
  'method',
  'destinationReference',
  'refundedAt',
  'valueDate',
  'authorizedBySystemUserId',
  'sourceDocumentId',
]

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const REASON_OPTIONS = REFUND_REASON_CODES.map((value) => ({
  value: value as string,
  label: REFUND_REASON_LABEL[value],
}))

/** Los seis: `reason` es obligatorio en el contrato, así que la nota nunca es opcional. */
const NOTE_REQUIRED = REFUND_REASON_CODES.map((value) => value as string)

const METHOD_OPTIONS: { value: string; label: string }[] = REFUND_METHODS.map((value) => ({
  value,
  label: REFUND_METHOD_LABEL[value],
}))

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const requestId = ref(newRequestId())

const form = reactive<Record<Field, string>>({
  companyId: '',
  paymentId: '',
  sourceDocumentId: '',
  amount: '',
  method: '',
  destinationReference: '',
  refundedAt: '',
  valueDate: '',
  authorizedBySystemUserId: '',
})

const touched = reactive<Record<Field, boolean>>({
  companyId: false,
  paymentId: false,
  sourceDocumentId: false,
  amount: false,
  method: false,
  destinationReference: false,
  refundedAt: false,
  valueDate: false,
  authorizedBySystemUserId: false,
})

/** Cada apertura empieza en blanco y con llave nueva: es otra salida de caja. */
watch(
  () => props.open,
  (open) => {
    if (!open) return
    for (const field of ORDER) {
      form[field] = ''
      touched[field] = false
    }
    form.companyId = props.defaultCompanyId ? String(props.defaultCompanyId) : ''
    requestId.value = newRequestId()
  },
)

const method = computed(() => (form.method ? (form.method as RefundMethod) : null))

/**
 * La cuenta destino solo se exige en una transferencia: en un reverso a tarjeta la
 * pone la pasarela y en saldo a favor no hay cuenta a la que ir.
 */
function validateDestination(): string {
  const text = form.destinationReference.trim()
  if (!text) {
    return method.value === 'BANK_TRANSFER'
      ? 'La cuenta destino es obligatoria en una transferencia.'
      : ''
  }
  return text.length > 120 ? 'La cuenta destino no puede pasar de 120 caracteres.' : ''
}

const errors = computed<Record<Field, string>>(() => ({
  companyId: validateId(form.companyId, 'La empresa'),
  paymentId: validateId(form.paymentId, 'El pago que se devuelve'),
  sourceDocumentId: validateId(form.sourceDocumentId, 'El documento de origen', false),
  amount: validateAmount(form.amount, 'El importe a devolver'),
  method: form.method ? '' : 'Debes seleccionar el medio por el que sale el dinero.',
  destinationReference: validateDestination(),
  refundedAt: validateInstant(form.refundedAt, 'La fecha del giro', false),
  valueDate: validateDate(form.valueDate, 'La fecha valor', false),
  authorizedBySystemUserId: validateId(form.authorizedBySystemUserId, 'El autorizante'),
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

/**
 * La firma llega válida del modal compartido —motivo y nota— y aquí se valida el
 * resto. Si algo falta, no se emite y el foco salta al resumen de estos campos.
 */
function onSigned(signature: SignedActionSignature) {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }
  emit('submit', Number(form.companyId), {
    paymentId: parseId(form.paymentId) ?? 0,
    sourceDocumentId: parseId(form.sourceDocumentId),
    amount: parseAmount(form.amount) ?? 0,
    method: form.method as RefundMethod,
    destinationReference: form.destinationReference.trim() || null,
    refundedAt: toInstant(form.refundedAt),
    valueDate: form.valueDate,
    reasonCode: signature.reason as RefundReasonCode,
    reason: signature.note ?? '',
    authorizedBySystemUserId: Number(form.authorizedBySystemUserId),
    clientRequestId: requestId.value,
  })
}
</script>

<template>
  <SignedActionModal
    :open="open"
    title="Registrar una devolución de dinero"
    question="¿Registrar esta salida de caja?"
    consequence="La plata sale de la cuenta de la plataforma y el registro no se borra: corregir una devolución equivocada es registrar el movimiento contrario, no eliminar este."
    :reasons="REASON_OPTIONS"
    reason-label="Motivo de la devolución"
    reason-hint="Lista cerrada: es lo que después se puede contar por tipo."
    :note-required-reasons="NOTE_REQUIRED"
    note-label="Por qué se devuelve"
    note-hint="Obligatorio siempre: el contrato exige el motivo escrito, no solo el código."
    :max-note-length="255"
    confirm-label="Registrar la devolución"
    confirm-tone="danger"
    :saving="saving"
    saving-label="Registrando…"
    :width="640"
    :icon="ICONS.WARNING"
    @close="emit('close')"
    @submit="onSigned"
  >
    <template #details>
      <div class="ds-stack ds-stack--16">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <AppInput
          :id="ids.companyId"
          v-model="form.companyId"
          label="Empresa"
          required
          inputmode="numeric"
          hint="Tiene que ser la del pago que se devuelve. Nunca se hereda de la pantalla."
          :error="err('companyId')"
          @blur="touched.companyId = true"
        />

        <AppInput
          :id="ids.paymentId"
          v-model="form.paymentId"
          label="Pago que se devuelve"
          required
          inputmode="numeric"
          :error="err('paymentId')"
          @blur="touched.paymentId = true"
        />

        <AppInput
          :id="ids.amount"
          v-model="form.amount"
          label="Importe a devolver"
          required
          inputmode="decimal"
          hint="Siempre en positivo: que sea una salida lo dice la operación, no el signo."
          :error="err('amount')"
          @blur="touched.amount = true"
        />

        <AppSelect
          :id="ids.method"
          v-model="form.method"
          :options="METHOD_OPTIONS"
          label="Medio"
          required
          placeholder="Por dónde sale el dinero"
          :hint="method ? REFUND_METHOD_MEANING[method] : undefined"
          :error="err('method')"
          @blur="touched.method = true"
        />

        <!-- El aviso que evita el peor final: creer que se devolvió plata cuando
             lo que se abrió fue un crédito que caduca. -->
        <div v-if="method === 'CUSTOMER_CREDIT'" class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            Con este medio <strong>no sale plata de la cuenta</strong>: se abre saldo a favor, que
            el cliente consume en su próxima cuenta de cobro y que <strong>caduca</strong>. Si el
            cliente pidió su dinero, este no es el medio.
          </span>
        </div>

        <AppInput
          :id="ids.destinationReference"
          v-model="form.destinationReference"
          label="Cuenta destino o referencia"
          :required="method === 'BANK_TRANSFER'"
          :maxlength="120"
          hint="Obligatoria en una transferencia. En un reverso a tarjeta la pone la pasarela."
          :error="err('destinationReference')"
          @blur="touched.destinationReference = true"
        />

        <AppInput
          :id="ids.refundedAt"
          v-model="form.refundedAt"
          label="Fecha y hora del giro"
          required
          type="datetime-local"
          hint="Cuándo salió de verdad. No puede ser futura."
          :error="err('refundedAt')"
          @blur="touched.refundedAt = true"
        />

        <AppInput
          :id="ids.valueDate"
          v-model="form.valueDate"
          label="Fecha valor"
          required
          type="date"
          hint="Con la que entra en la contabilidad. No tiene por qué coincidir con la del giro."
          :error="err('valueDate')"
          @blur="touched.valueDate = true"
        />

        <AppInput
          :id="ids.authorizedBySystemUserId"
          v-model="form.authorizedBySystemUserId"
          label="Autorizante"
          required
          inputmode="numeric"
          hint="Identificador del usuario de plataforma que autoriza la salida de caja."
          :error="err('authorizedBySystemUserId')"
          @blur="touched.authorizedBySystemUserId = true"
        />

        <AppInput
          :id="ids.sourceDocumentId"
          v-model="form.sourceDocumentId"
          label="Documento de origen"
          inputmode="numeric"
          hint="Opcional: la cuenta de cobro de la que nace la devolución, si la hay."
          :error="err('sourceDocumentId')"
          @blur="touched.sourceDocumentId = true"
        />
      </div>
    </template>
  </SignedActionModal>
</template>
