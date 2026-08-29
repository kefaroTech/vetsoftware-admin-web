<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import {
  newRequestId,
  parseAmount,
  parseId,
  validateAmount,
  validateId,
} from '../composables/moneyFields'
import { formatAmount } from '@/composables/format'
import type {
  ConsumeCustomerCreditRequest,
  CustomerCreditBalanceResponse,
} from '../types/customer-credit.types'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'

/**
 * <b>Aplicar saldo a favor a una cuenta de cobro.</b>
 *
 * <p><b>No se elige el lote, y eso no es una simplificación.</b> El servidor salda
 * empezando por el que antes caduca, y dejar elegir permitiría gastar el lote de
 * diciembre y perder el de septiembre. Por eso este formulario tiene tres campos y
 * no una lista de lotes: el orden es una regla del negocio, no una preferencia.
 *
 * <p><b>El resultado puede ser más de un movimiento.</b> Un consumo de 100.000 sobre
 * lotes de 40.000, 40.000 y 60.000 toca tres y produce tres filas. La pantalla lo
 * dice al confirmar, porque el operador pidió un importe y no puede deducir de dónde
 * salió.
 *
 * <p><b>`clientRequestId` se genera al abrir</b>, no al enviar: es la llave de
 * idempotencia y tiene que ser la misma en el reintento del mismo envío. Sin ella,
 * un doble clic gastaría el saldo dos veces.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  /** El saldo desde el que se abrió, para poder avisar si se pide más de lo que hay. */
  balance: CustomerCreditBalanceResponse | null
}>()

const emit = defineEmits<{
  close: []
  submit: [companyId: number, payload: ConsumeCustomerCreditRequest]
}>()

type Field = 'companyId' | 'amount' | 'originDocumentId'

const ORDER: Field[] = ['companyId', 'amount', 'originDocumentId']

const ids = Object.fromEntries(ORDER.map((field) => [field, useId()])) as Record<Field, string>

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
const requestId = ref(newRequestId())

const form = reactive<Record<Field, string>>({
  companyId: '',
  amount: '',
  originDocumentId: '',
})

const touched = reactive<Record<Field, boolean>>({
  companyId: false,
  amount: false,
  originDocumentId: false,
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    for (const field of ORDER) {
      form[field] = ''
      touched[field] = false
    }
    form.companyId = props.balance ? String(props.balance.companyId) : ''
    requestId.value = newRequestId()
  },
)

const errors = computed<Record<Field, string>>(() => ({
  companyId: validateId(form.companyId, 'La empresa'),
  amount: validateAmount(form.amount, 'El importe a aplicar'),
  originDocumentId: validateId(form.originDocumentId, 'El documento que se salda'),
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

const summaryItems = computed(() =>
  toSummaryItems(Object.fromEntries(ORDER.map((field) => [field, err(field)])), ids, ORDER),
)

/**
 * Pedir más de lo que hay. No bloquea —el saldo del servidor es el que manda y esta
 * pantalla puede llevar minutos abierta—, pero avisa: casi siempre es un dígito de
 * más.
 */
const overdraws = computed(() => {
  const value = parseAmount(form.amount)
  return props.balance !== null && value !== null && value > props.balance.balanceAmount
})

const subtitle = computed(() =>
  props.balance
    ? `Empresa #${props.balance.companyId} · saldo ${formatAmount(props.balance.balanceAmount)}`
    : '',
)

function submit() {
  for (const field of ORDER) touched[field] = true
  if (ORDER.some((field) => errors.value[field])) {
    summary.value?.focus()
    return
  }
  emit('submit', Number(form.companyId), {
    amount: parseAmount(form.amount) ?? 0,
    originDocumentId: parseId(form.originDocumentId) ?? 0,
    clientRequestId: requestId.value,
  })
}

function isDirty() {
  return form.amount.trim() !== '' || form.originDocumentId.trim() !== ''
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Aplicar saldo a favor"
    :subtitle="subtitle"
    :icon="ICONS.ARROW_RIGHT"
    compact
    :width="560"
    :confirm-close-when="isDirty"
    confirm-close-title="Se perderán los datos escritos"
    confirm-close-message="El saldo no se ha aplicado. Si sales ahora se pierde lo escrito."
    @close="emit('close')"
  >
    <template #body>
      <form class="ds-stack ds-stack--16" @submit.prevent="submit">
        <ErrorSummary ref="summary" :items="summaryItems" />

        <MoneyScopeNote />

        <div class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" aria-hidden="true" />
          <span class="ds-flex-fill">
            El saldo se gasta <strong>empezando por el lote que antes caduca</strong>, y el reparto
            lo decide el servidor. Un solo importe puede tocar varios lotes; al terminar se dice
            cuántos.
          </span>
        </div>

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
          label="Importe a aplicar"
          required
          inputmode="decimal"
          :error="err('amount')"
          @blur="touched.amount = true"
        />

        <p v-if="overdraws && balance" class="ds-meta nota">
          Pides más que el saldo consolidado ({{ formatAmount(balance.balanceAmount) }}). El
          servidor es quien manda sobre el saldo, pero comprueba que no sobra un dígito.
        </p>

        <AppInput
          :id="ids.originDocumentId"
          v-model="form.originDocumentId"
          label="Documento que se salda"
          required
          inputmode="numeric"
          hint="La cuenta de cobro contra la que se aplica el saldo."
          :error="err('originDocumentId')"
          @blur="touched.originDocumentId = true"
        />
      </form>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="submit">
        {{ saving ? 'Aplicando…' : 'Aplicar el saldo' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.nota {
  margin: 0;
}
</style>
