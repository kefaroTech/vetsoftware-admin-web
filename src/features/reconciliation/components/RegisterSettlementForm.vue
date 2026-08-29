<script setup lang="ts">
import { computed, reactive } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { formatAmount } from '@/composables/format'
import { length } from '@/composables/validators'
import type { RegisterGatewaySettlementRequest } from '../types/reconciliation.types'
import MoneyScopeNote from '@/components/ui/MoneyScopeNote.vue'

/**
 * Dar de alta una liquidación de la pasarela.
 *
 * <p><b>Los cinco importes admiten negativo y el validador lo sabe.</b> Rechazar
 * un negativo obligaría a teclear otra cifra para poder guardar, y esa cifra
 * sería mentira: un lote con más contracargos que cobros existe y hay que poder
 * registrarlo tal cual.
 *
 * <p><b>La cuenta de cobros es opcional y se pide igual.</b> El contrato la
 * declara opcional, pero sin ella la liquidación no se puede contrastar: no hay
 * con qué comparar los cobros atados, y un pago perdido pasa desapercibido. El
 * campo no bloquea, pero avisa de lo que se pierde al dejarlo vacío — que es
 * distinto de fingir que da igual.
 */
const props = defineProps<{ saving?: boolean }>()

const emit = defineEmits<{ submit: [data: RegisterGatewaySettlementRequest]; cancel: [] }>()

type Field =
  | 'gateway'
  | 'settlementReference'
  | 'grossAmount'
  | 'feeAmount'
  | 'feeTaxAmount'
  | 'gmfAmount'
  | 'netAmount'
  | 'paymentCount'
  | 'settledOn'

const FIELDS: Field[] = [
  'gateway',
  'settlementReference',
  'grossAmount',
  'feeAmount',
  'feeTaxAmount',
  'gmfAmount',
  'netAmount',
  'paymentCount',
  'settledOn',
]

const form = reactive<Record<Field, string>>({
  gateway: '',
  settlementReference: '',
  grossAmount: '',
  feeAmount: '',
  feeTaxAmount: '',
  gmfAmount: '',
  netAmount: '',
  paymentCount: '',
  settledOn: '',
})
const touched = reactive<Record<Field, boolean>>({
  gateway: false,
  settlementReference: false,
  grossAmount: false,
  feeAmount: false,
  feeTaxAmount: false,
  gmfAmount: false,
  netAmount: false,
  paymentCount: false,
  settledOn: false,
})
const baseline = JSON.stringify(form)

/** Importe obligatorio: negativo permitido, dos decimales como mucho, coma o punto. */
function amount(value: string, label: string): string {
  if (value.trim() === '') return `${label} es obligatorio.`
  if (!/^-?\d+([.,]\d{1,2})?$/.test(value.trim()))
    return `${label} tiene que ser un importe, con dos decimales como mucho.`
  return ''
}

function toNumber(value: string): number {
  return Number(value.trim().replace(',', '.'))
}

const errors = computed<Record<Field, string>>(() => ({
  gateway: length(form.gateway, 'La pasarela', 1, 40),
  settlementReference: length(form.settlementReference, 'La referencia de la liquidación', 1, 120),
  grossAmount: amount(form.grossAmount, 'El bruto'),
  feeAmount: amount(form.feeAmount, 'La comisión'),
  feeTaxAmount: amount(form.feeTaxAmount, 'El impuesto de la comisión'),
  gmfAmount: amount(form.gmfAmount, 'El gravamen de salida'),
  netAmount: amount(form.netAmount, 'El neto'),
  paymentCount:
    form.paymentCount.trim() === '' || /^\d+$/.test(form.paymentCount.trim())
      ? ''
      : 'La cuenta de cobros tiene que ser un número entero.',
  settledOn: form.settledOn ? '' : 'La fecha de liquidación es obligatoria.',
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function touch(field: Field) {
  touched[field] = true
}

/** Lo que el lote dirá de sí mismo, para verlo antes de guardarlo. */
const preview = computed(() => {
  const parse = (raw: string): number | null =>
    /^-?\d+([.,]\d{1,2})?$/.test(raw.trim()) ? toNumber(raw) : null
  const gross = parse(form.grossAmount)
  const fee = parse(form.feeAmount)
  const feeTax = parse(form.feeTaxAmount)
  const gmf = parse(form.gmfAmount)
  if (gross === null || fee === null || feeTax === null || gmf === null) return null
  const cost = fee + feeTax + gmf
  return { cost, expectedNet: gross - cost }
})

function validate() {
  for (const key of FIELDS) touched[key] = true
  return Object.values(errors.value).every((message) => !message)
}

function submit() {
  if (!validate() || props.saving) return
  emit('submit', {
    gateway: form.gateway.trim(),
    settlementReference: form.settlementReference.trim(),
    grossAmount: toNumber(form.grossAmount),
    feeAmount: toNumber(form.feeAmount),
    feeTaxAmount: toNumber(form.feeTaxAmount),
    gmfAmount: toNumber(form.gmfAmount),
    netAmount: toNumber(form.netAmount),
    paymentCount: form.paymentCount.trim() ? Number(form.paymentCount) : null,
    settledOn: form.settledOn,
  })
}

function isDirty() {
  return JSON.stringify(form) !== baseline
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <MoneyScopeNote />

    <div class="ds-grid-2">
      <AppInput
        v-model="form.gateway"
        label="Pasarela"
        required
        :maxlength="40"
        :error="err('gateway')"
        @blur="touch('gateway')"
      />
      <AppInput
        v-model="form.settlementReference"
        label="Referencia de la liquidación"
        required
        :maxlength="120"
        hint="La que aparece en el portal de la pasarela. Se lee y se copia a mano: aquí no navega a ningún sitio."
        :error="err('settlementReference')"
        @blur="touch('settlementReference')"
      />
    </div>

    <div class="ds-grid-2 rejilla--importes">
      <AppInput
        v-model="form.grossAmount"
        label="Bruto"
        required
        inputmode="decimal"
        :error="err('grossAmount')"
        @blur="touch('grossAmount')"
      />
      <AppInput
        v-model="form.feeAmount"
        label="Comisión"
        required
        inputmode="decimal"
        :error="err('feeAmount')"
        @blur="touch('feeAmount')"
      />
      <AppInput
        v-model="form.feeTaxAmount"
        label="Impuesto de la comisión"
        required
        inputmode="decimal"
        :error="err('feeTaxAmount')"
        @blur="touch('feeTaxAmount')"
      />
      <AppInput
        v-model="form.gmfAmount"
        label="Gravamen de salida"
        required
        inputmode="decimal"
        :error="err('gmfAmount')"
        @blur="touch('gmfAmount')"
      />
      <AppInput
        v-model="form.netAmount"
        label="Neto"
        required
        inputmode="decimal"
        hint="Se admite negativo: un lote con más contracargos que cobros existe."
        :error="err('netAmount')"
        @blur="touch('netAmount')"
      />
    </div>

    <p v-if="preview" class="ds-meta">
      Con estas cifras, cobrar costó
      <span class="ds-num">{{ formatAmount(preview.cost) }}</span>
      y el neto debería ser
      <span class="ds-num">{{ formatAmount(preview.expectedNet) }}</span>
      .
    </p>

    <div class="ds-grid-2">
      <AppInput
        v-model="form.paymentCount"
        label="Cobros que declara el lote"
        inputmode="numeric"
        hint="Opcional en el contrato, pero sin este número el lote no se puede contrastar y un pago perdido no se ve."
        :error="err('paymentCount')"
        @blur="touch('paymentCount')"
      />
      <AppInput
        v-model="form.settledOn"
        label="Fecha de liquidación"
        required
        type="date"
        :error="err('settledOn')"
        @blur="touch('settledOn')"
      />
    </div>

    <div class="acciones ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Registrar la liquidación' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* La rejilla de 2 columnas es `.ds-grid-2` (primitives.css); `.rejilla--importes`
   solo pisa las columnas donde necesita 5 (FE-08). */
.rejilla--importes {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.acciones {
  justify-content: flex-end;
}

@media (width <= 900px) {
  .rejilla--importes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 680px) {
  .rejilla--importes {
    grid-template-columns: 1fr;
  }
}
</style>
