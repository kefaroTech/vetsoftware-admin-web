<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { formatCurrency } from '@/composables/format'
import { length, maxLength } from '@/composables/validators'
import type {
  ExternalInvoiceReconciliationResponse,
  MatchExternalInvoiceRequest,
} from '../types/reconciliation.types'

/**
 * Casar la factura del emisor con nuestro documento.
 *
 * <p>Lo que se teclea aquí es <b>lo que dice el papel del emisor</b>, no lo que
 * nos gustaría que dijera: por eso el total y el impuesto que ya calculamos se
 * enseñan al lado en solo lectura, sin prerrellenar los campos. Prerrellenarlos
 * con nuestras cifras convierte el cuadre en un trámite —se pulsa «guardar» y
 * siempre coincide— y el veredicto en un adorno.
 *
 * <p>El veredicto no lo decide esta pantalla: se manda lo declarado y el
 * servidor devuelve si cuadra, si cabe en la tolerancia o si no.
 */
const props = defineProps<{
  reconciliation: ExternalInvoiceReconciliationResponse
  saving?: boolean
}>()

const emit = defineEmits<{ submit: [data: MatchExternalInvoiceRequest]; cancel: [] }>()

type Field =
  | 'externalInvoiceId'
  | 'externalCufe'
  | 'externalTotal'
  | 'externalTax'
  | 'externalResolutionNumber'
  | 'externalRangeFrom'
  | 'externalRangeTo'
  | 'resolutionValidUntil'

const FIELDS: Field[] = [
  'externalInvoiceId',
  'externalCufe',
  'externalTotal',
  'externalTax',
  'externalResolutionNumber',
  'externalRangeFrom',
  'externalRangeTo',
  'resolutionValidUntil',
]

const form = reactive<Record<Field, string>>({
  externalInvoiceId: '',
  externalCufe: '',
  externalTotal: '',
  externalTax: '',
  externalResolutionNumber: '',
  externalRangeFrom: '',
  externalRangeTo: '',
  resolutionValidUntil: '',
})
const touched = reactive<Record<Field, boolean>>({
  externalInvoiceId: false,
  externalCufe: false,
  externalTotal: false,
  externalTax: false,
  externalResolutionNumber: false,
  externalRangeFrom: false,
  externalRangeTo: false,
  resolutionValidUntil: false,
})
const baseline = ref('')

function reset(initial: ExternalInvoiceReconciliationResponse) {
  Object.assign(form, {
    externalInvoiceId: initial.externalInvoiceId ?? '',
    externalCufe: initial.externalCufe ?? '',
    externalTotal: initial.externalTotal == null ? '' : String(initial.externalTotal),
    externalTax: initial.externalTax == null ? '' : String(initial.externalTax),
    externalResolutionNumber: initial.externalResolutionNumber ?? '',
    externalRangeFrom: initial.externalRangeFrom == null ? '' : String(initial.externalRangeFrom),
    externalRangeTo: initial.externalRangeTo == null ? '' : String(initial.externalRangeTo),
    resolutionValidUntil: initial.resolutionValidUntil ?? '',
  })
  for (const key of FIELDS) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.reconciliation, reset, { immediate: true })

/**
 * Un importe fiscal: obligatorio y numérico, **con el cero permitido y el
 * negativo también**. Una nota crédito llega con importes en negativo y una
 * factura exenta con impuesto cero; rechazarlos aquí obligaría a inventar otra
 * cifra para poder guardar. Se admite coma o punto porque es lo que el operador
 * copia del papel.
 */
function amount(value: string, label: string): string {
  if (value.trim() === '') return `${label} es obligatorio.`
  if (!/^-?\d+([.,]\d{1,2})?$/.test(value.trim()))
    return `${label} tiene que ser un importe, con dos decimales como mucho.`
  return ''
}

function toNumber(value: string): number {
  return Number(value.trim().replace(',', '.'))
}

/** Un consecutivo de la resolución: entero positivo, y opcional. */
function consecutive(value: string, label: string): string {
  if (value.trim() === '') return ''
  if (!/^\d+$/.test(value.trim())) return `${label} tiene que ser un número entero.`
  return ''
}

const errors = computed<Record<Field, string>>(() => {
  const from = form.externalRangeFrom.trim()
  const to = form.externalRangeTo.trim()
  return {
    externalInvoiceId: length(form.externalInvoiceId, 'El número de la factura', 1, 60),
    externalCufe: maxLength(form.externalCufe, 'El CUFE', 100),
    externalTotal: amount(form.externalTotal, 'El total del emisor'),
    externalTax: amount(form.externalTax, 'El impuesto del emisor'),
    externalResolutionNumber: maxLength(form.externalResolutionNumber, 'La resolución', 60),
    externalRangeFrom: consecutive(form.externalRangeFrom, 'El consecutivo inicial'),
    externalRangeTo:
      consecutive(form.externalRangeTo, 'El consecutivo final') ||
      (from && to && Number(to) < Number(from)
        ? 'El consecutivo final no puede ser menor que el inicial.'
        : ''),
    resolutionValidUntil: '',
  }
})

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function touch(field: Field) {
  touched[field] = true
}

function validate() {
  for (const key of FIELDS) touched[key] = true
  return Object.values(errors.value).every((message) => !message)
}

function submit() {
  if (!validate()) return
  emit('submit', {
    externalInvoiceId: form.externalInvoiceId.trim(),
    externalCufe: form.externalCufe.trim() || null,
    externalTotal: toNumber(form.externalTotal),
    externalTax: toNumber(form.externalTax),
    externalResolutionNumber: form.externalResolutionNumber.trim() || null,
    externalRangeFrom: form.externalRangeFrom.trim() ? Number(form.externalRangeFrom) : null,
    externalRangeTo: form.externalRangeTo.trim() ? Number(form.externalRangeTo) : null,
    resolutionValidUntil: form.resolutionValidUntil || null,
  })
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <p class="ds-banner ds-banner--info" role="status">
      <span>
        Teclea lo que dice la factura del emisor, no lo que calculamos nosotros. Nuestro documento
        va por
        <span class="ds-num">{{ formatCurrency(reconciliation.computedTotal) }}</span>
        de total y
        <span class="ds-num">{{ formatCurrency(reconciliation.computedTax) }}</span>
        de impuesto; el veredicto lo decide el servidor comparando las dos cifras.
      </span>
    </p>

    <div class="ds-grid-2">
      <AppInput
        v-model="form.externalInvoiceId"
        label="Número de la factura del emisor"
        required
        :maxlength="60"
        :error="err('externalInvoiceId')"
        @blur="touch('externalInvoiceId')"
      />
      <AppInput
        v-model="form.externalCufe"
        label="CUFE"
        :maxlength="100"
        hint="Opcional: el código único de la factura electrónica."
        :error="err('externalCufe')"
        @blur="touch('externalCufe')"
      />
    </div>

    <div class="ds-grid-2">
      <AppInput
        v-model="form.externalTotal"
        label="Total que declara el emisor"
        required
        inputmode="decimal"
        :error="err('externalTotal')"
        @blur="touch('externalTotal')"
      />
      <AppInput
        v-model="form.externalTax"
        label="Impuesto que declara el emisor"
        required
        inputmode="decimal"
        hint="Cero si la factura es exenta; negativo si es una nota crédito."
        :error="err('externalTax')"
        @blur="touch('externalTax')"
      />
    </div>

    <div class="ds-grid-2 rejilla--resolucion">
      <AppInput
        v-model="form.externalResolutionNumber"
        label="Resolución"
        :maxlength="60"
        :error="err('externalResolutionNumber')"
        @blur="touch('externalResolutionNumber')"
      />
      <AppInput
        v-model="form.externalRangeFrom"
        label="Desde"
        inputmode="numeric"
        :error="err('externalRangeFrom')"
        @blur="touch('externalRangeFrom')"
      />
      <AppInput
        v-model="form.externalRangeTo"
        label="Hasta"
        inputmode="numeric"
        :error="err('externalRangeTo')"
        @blur="touch('externalRangeTo')"
      />
      <AppInput
        v-model="form.resolutionValidUntil"
        label="Vence el"
        type="date"
        :error="err('resolutionValidUntil')"
        @blur="touch('resolutionValidUntil')"
      />
    </div>

    <div class="acciones ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Casar la factura' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* La rejilla de 2 columnas es `.ds-grid-2` (primitives.css); `.rejilla--resolucion`
   solo pisa las columnas donde necesita 4 (FE-08). */
.rejilla--resolucion {
  grid-template-columns: 1.4fr 0.8fr 0.8fr 1fr;
}

.acciones {
  justify-content: flex-end;
}

@media (width <= 680px) {
  .rejilla--resolucion {
    grid-template-columns: 1fr;
  }
}
</style>
