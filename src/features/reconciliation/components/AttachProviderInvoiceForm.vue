<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { length } from '@/composables/validators'
import type {
  AttachProviderInvoiceRequest,
  GatewaySettlementResponse,
} from '../types/reconciliation.types'

/**
 * La factura que la pasarela nos emite **por su comisión**.
 *
 * <p>No es la liquidación: la liquidación es el dinero que nos transfiere, y esto
 * es el documento con el que nos cobra por transferirlo. Sin él, lo que la
 * pasarela se quedó —comisión, impuesto y gravamen— es un gasto sin soporte, y un
 * gasto sin soporte no se deduce.
 *
 * <p>Los dos campos son obligatorios en el contrato y aquí también: un número de
 * factura sin el NIT del emisor no identifica a nadie a efectos fiscales.
 */
const props = defineProps<{ settlement: GatewaySettlementResponse; saving?: boolean }>()

const emit = defineEmits<{ submit: [data: AttachProviderInvoiceRequest]; cancel: [] }>()

type Field = 'providerInvoiceRef' | 'providerTaxId'
const FIELDS: Field[] = ['providerInvoiceRef', 'providerTaxId']

const form = reactive<Record<Field, string>>({ providerInvoiceRef: '', providerTaxId: '' })
const touched = reactive<Record<Field, boolean>>({
  providerInvoiceRef: false,
  providerTaxId: false,
})
const baseline = ref('')

function reset(settlement: GatewaySettlementResponse) {
  form.providerInvoiceRef = settlement.providerInvoiceRef ?? ''
  form.providerTaxId = settlement.providerTaxId ?? ''
  for (const key of FIELDS) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.settlement, reset, { immediate: true })

const errors = computed<Record<Field, string>>(() => ({
  providerInvoiceRef: length(form.providerInvoiceRef, 'El número de la factura', 1, 60),
  providerTaxId: length(form.providerTaxId, 'El NIT del emisor', 1, 50),
}))

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function validate() {
  for (const key of FIELDS) touched[key] = true
  return Object.values(errors.value).every((message) => !message)
}

function submit() {
  if (!validate() || props.saving) return
  emit('submit', {
    providerInvoiceRef: form.providerInvoiceRef.trim(),
    providerTaxId: form.providerTaxId.trim(),
  })
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--12" @submit.prevent="submit">
    <div class="ds-grid-2">
      <AppInput
        v-model="form.providerInvoiceRef"
        label="Factura de la pasarela"
        required
        :maxlength="60"
        :error="err('providerInvoiceRef')"
        @blur="touched.providerInvoiceRef = true"
      />
      <AppInput
        v-model="form.providerTaxId"
        label="NIT del emisor"
        required
        :maxlength="50"
        :error="err('providerTaxId')"
        @blur="touched.providerTaxId = true"
      />
    </div>

    <div class="acciones ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Adjuntar la factura' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* La rejilla de 2 columnas es `.ds-grid-2` (primitives.css); FE-08. */
.acciones {
  justify-content: flex-end;
}
</style>
