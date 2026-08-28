<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import SignedActionModal, {
  type SignedActionSignature,
} from '@/components/ui/SignedActionModal.vue'
import { ICONS } from '@/constants/icons'
import {
  newRequestId,
  parseAmount,
  parseId,
  validateAmount,
  validateDate,
  validateId,
} from '../composables/moneyFields'
import {
  CREDIT_ORIGIN_KINDS,
  CREDIT_ORIGIN_LABEL,
  type CreditOriginKind,
  type GrantCustomerCreditRequest,
} from '../types/customer-credit.types'

/**
 * <b>Abrir un lote de saldo a favor.</b>
 *
 * <p><b>Es una acción firmada porque crea dinero del cliente.</b> El origen es una
 * lista cerrada —pagó de más, nota crédito, cancelación, redondeo, concesión
 * manual…— y es lo que después permite contar cuánto saldo nació de errores
 * nuestros y cuánto de decisiones comerciales. Con texto libre esa cuenta no se
 * puede hacer.
 *
 * <p><b>La concesión manual exige explicación escrita</b> y por eso `MANUAL` va en
 * `noteRequiredReasons`: es el único origen que no se explica solo — los otros seis
 * apuntan a un hecho que ya ocurrió, y este apunta a alguien que decidió.
 *
 * <p><b>La caducidad no se rellena sola.</b> Un lote sin fecha no caduca nunca, y
 * eso es una decisión, no un descuido: el campo está vacío y su ayuda dice qué pasa
 * si se deja así. Poner una fecha por defecto haría que el cliente perdiera saldo
 * por una convención que nadie eligió.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  defaultCompanyId?: number | null
}>()

const emit = defineEmits<{
  close: []
  submit: [companyId: number, payload: GrantCustomerCreditRequest]
}>()

type Field =
  | 'companyId'
  | 'amount'
  | 'expiresOn'
  | 'originPaymentId'
  | 'originDocumentId'
  | 'originSubscriptionId'

const ORDER: Field[] = [
  'companyId',
  'amount',
  'expiresOn',
  'originDocumentId',
  'originPaymentId',
  'originSubscriptionId',
]

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const ORIGIN_OPTIONS = CREDIT_ORIGIN_KINDS.map((value) => ({
  value: value as string,
  label: CREDIT_ORIGIN_LABEL[value],
}))

/** El único origen que no se explica solo: lo decidió una persona. */
const NOTE_REQUIRED = ['MANUAL']

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const requestId = ref(newRequestId())

const form = reactive<Record<Field, string>>({
  companyId: '',
  amount: '',
  expiresOn: '',
  originPaymentId: '',
  originDocumentId: '',
  originSubscriptionId: '',
})

const touched = reactive<Record<Field, boolean>>({
  companyId: false,
  amount: false,
  expiresOn: false,
  originPaymentId: false,
  originDocumentId: false,
  originSubscriptionId: false,
})

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

const errors = computed<Record<Field, string>>(() => ({
  companyId: validateId(form.companyId, 'La empresa'),
  amount: validateAmount(form.amount, 'El importe del lote'),
  expiresOn: form.expiresOn.trim()
    ? validateDate(form.expiresOn, 'La fecha de caducidad', true)
    : '',
  originPaymentId: validateId(form.originPaymentId, 'El pago de origen', false),
  originDocumentId: validateId(form.originDocumentId, 'El documento de origen', false),
  originSubscriptionId: validateId(form.originSubscriptionId, 'El contrato de origen', false),
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

function onSigned(signature: SignedActionSignature) {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    void summary.value?.focus()
    return
  }
  emit('submit', Number(form.companyId), {
    amount: parseAmount(form.amount) ?? 0,
    originKind: signature.reason as CreditOriginKind,
    originPaymentId: parseId(form.originPaymentId),
    originDocumentId: parseId(form.originDocumentId),
    originSubscriptionId: parseId(form.originSubscriptionId),
    expiresOn: form.expiresOn.trim() || null,
    clientRequestId: requestId.value,
  })
}
</script>

<template>
  <SignedActionModal
    :open="open"
    title="Abrir un lote de saldo a favor"
    question="¿Conceder este saldo a la empresa?"
    consequence="El saldo se consume por lotes, empezando por el que antes caduca. Si el lote vence sin usarse, el cliente lo pierde."
    :reasons="ORIGIN_OPTIONS"
    reason-label="Origen del saldo"
    reason-hint="Lista cerrada: es lo que permite contar cuánto saldo nació de errores nuestros."
    :note-required-reasons="NOTE_REQUIRED"
    note-label="Nota"
    note-hint="Obligatoria en una concesión manual: es el único origen que no se explica solo."
    confirm-label="Abrir el lote"
    confirm-tone="primary"
    accent="amatista"
    :saving="saving"
    saving-label="Abriendo…"
    :width="600"
    :icon="ICONS.ADD"
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
          :error="err('companyId')"
          @blur="touched.companyId = true"
        />

        <AppInput
          :id="ids.amount"
          v-model="form.amount"
          label="Importe del lote"
          required
          inputmode="decimal"
          hint="Siempre en positivo."
          :error="err('amount')"
          @blur="touched.amount = true"
        />

        <AppInput
          :id="ids.expiresOn"
          v-model="form.expiresOn"
          label="Caduca el"
          type="date"
          hint="Si lo dejas vacío, el lote no caduca nunca. No se pone fecha por defecto: sería hacer perder saldo por una convención que nadie eligió."
          :error="err('expiresOn')"
          @blur="touched.expiresOn = true"
        />

        <AppInput
          :id="ids.originDocumentId"
          v-model="form.originDocumentId"
          label="Documento de origen"
          inputmode="numeric"
          hint="Opcional: la cuenta de cobro de la que nace el saldo."
          :error="err('originDocumentId')"
          @blur="touched.originDocumentId = true"
        />

        <AppInput
          :id="ids.originPaymentId"
          v-model="form.originPaymentId"
          label="Pago de origen"
          inputmode="numeric"
          hint="Opcional: el pago con el que la empresa pagó de más."
          :error="err('originPaymentId')"
          @blur="touched.originPaymentId = true"
        />

        <AppInput
          :id="ids.originSubscriptionId"
          v-model="form.originSubscriptionId"
          label="Contrato de origen"
          inputmode="numeric"
          hint="Opcional: el contrato cancelado que dejó el saldo."
          :error="err('originSubscriptionId')"
          @blur="touched.originSubscriptionId = true"
        />
      </div>
    </template>
  </SignedActionModal>
</template>
