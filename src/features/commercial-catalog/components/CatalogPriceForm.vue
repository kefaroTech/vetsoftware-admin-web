<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  BILLING_CYCLE_OPTIONS,
  TAX_TREATMENT_OPTIONS,
  type BillingCycle,
  type CatalogItemResponse,
  type CatalogPriceResponse,
  type CreateCatalogPriceRequest,
  type TaxTreatment,
  type UpdateCatalogPriceRequest,
} from '../types/commercial-catalog.types'

const props = defineProps<{
  priceListId: number
  catalogItems: CatalogItemResponse[]
  initial?: CatalogPriceResponse | null
  saving?: boolean
  optionsLoading?: boolean
  optionsError?: string | null
}>()

const emit = defineEmits<{
  submit: [data: CreateCatalogPriceRequest | UpdateCatalogPriceRequest]
  cancel: []
  retryOptions: []
}>()

interface FormState {
  catalogItemId: number | null
  billingCycle: BillingCycle
  tierMin: string
  tierMax: string
  includedQuantity: string
  unitAmount: string
  setupAmount: string
  taxRate: string
  taxTreatment: TaxTreatment
}

type Field = keyof FormState
const form = reactive<FormState>({
  catalogItemId: null,
  billingCycle: 'MONTHLY',
  tierMin: '1',
  tierMax: '',
  includedQuantity: '0',
  unitAmount: '0',
  setupAmount: '0',
  taxRate: '19',
  taxTreatment: 'TAXED',
})
const touched = reactive<Record<Field, boolean>>({
  catalogItemId: false,
  billingCycle: false,
  tierMin: false,
  tierMax: false,
  includedQuantity: false,
  unitAmount: false,
  setupAmount: false,
  taxRate: false,
  taxTreatment: false,
})
const baseline = ref('')

const catalogItemOptions = computed(() =>
  props.catalogItems.map((item) => ({
    value: item.id,
    label: `${item.code} · ${item.name}${item.enabled ? '' : ' (deshabilitado)'}`,
  })),
)

function reset(initial?: CatalogPriceResponse | null) {
  Object.assign(form, {
    catalogItemId: initial?.catalogItemId ?? null,
    billingCycle: initial?.billingCycle ?? 'MONTHLY',
    tierMin: String(initial?.tierMin ?? 1),
    tierMax: initial?.tierMax == null ? '' : String(initial.tierMax),
    includedQuantity: String(initial?.includedQuantity ?? 0),
    unitAmount: String(initial?.unitAmount ?? 0),
    setupAmount: String(initial?.setupAmount ?? 0),
    taxRate: String(initial?.taxRate ?? 19),
    taxTreatment: initial?.taxTreatment ?? 'TAXED',
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })
watch(
  () => form.taxTreatment,
  (treatment) => {
    if (treatment !== 'TAXED') form.taxRate = '0'
  },
)

function integer(value: string, label: string, minimum: number): string {
  const parsed = Number(value)
  return value.trim() && Number.isInteger(parsed) && parsed >= minimum
    ? ''
    : `${label} debe ser un entero mayor o igual a ${minimum}.`
}

function decimal(value: string, label: string, minimum: number, maximum?: number): string {
  const parsed = Number(value.replace(',', '.'))
  if (!value.trim() || !Number.isFinite(parsed) || parsed < minimum)
    return `${label} debe ser mayor o igual a ${minimum}.`
  if (maximum !== undefined && parsed > maximum) return `${label} no puede superar ${maximum}.`
  return ''
}

const errors = computed<Record<Field, string>>(() => {
  const tierMin = Number(form.tierMin)
  const tierMax = form.tierMax.trim() ? Number(form.tierMax) : null
  const taxRate = Number(form.taxRate.replace(',', '.'))
  return {
    catalogItemId: form.catalogItemId ? '' : 'Debes seleccionar el artículo.',
    billingCycle: form.billingCycle ? '' : 'Debes seleccionar el ciclo de facturación.',
    tierMin: integer(form.tierMin, 'El tramo mínimo', 1),
    tierMax:
      tierMax == null
        ? ''
        : !Number.isInteger(tierMax) || tierMax < tierMin
          ? 'El tramo máximo debe ser un entero mayor o igual al mínimo.'
          : '',
    includedQuantity: integer(form.includedQuantity, 'La cantidad incluida', 0),
    unitAmount: decimal(form.unitAmount, 'El precio unitario', 0),
    setupAmount: decimal(form.setupAmount, 'El cobro inicial', 0),
    taxRate:
      decimal(form.taxRate, 'La tarifa de impuesto', 0, 100) ||
      (form.taxTreatment === 'TAXED' && taxRate <= 0
        ? 'Un precio gravado requiere una tarifa mayor que cero.'
        : form.taxTreatment !== 'TAXED' && taxRate !== 0
          ? 'Un precio exento o excluido requiere tarifa cero.'
          : ''),
    taxTreatment: form.taxTreatment ? '' : 'Debes seleccionar el tratamiento fiscal.',
  }
})

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function touch(field: Field) {
  touched[field] = true
}

function validate() {
  for (const key of Object.keys(touched) as Field[]) touched[key] = true
  return Object.values(errors.value).every((message) => !message)
}

function numberValue(value: string) {
  return Number(value.replace(',', '.'))
}

function submit() {
  if (!validate() || !form.catalogItemId) return
  const common: UpdateCatalogPriceRequest = {
    billingCycle: form.billingCycle,
    tierMin: Number(form.tierMin),
    tierMax: form.tierMax.trim() ? Number(form.tierMax) : null,
    includedQuantity: Number(form.includedQuantity),
    unitAmount: numberValue(form.unitAmount),
    setupAmount: numberValue(form.setupAmount),
    taxRate: numberValue(form.taxRate),
    taxTreatment: form.taxTreatment,
  }
  emit(
    'submit',
    props.initial
      ? common
      : {
          priceListId: props.priceListId,
          catalogItemId: form.catalogItemId,
          ...common,
        },
  )
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <div v-if="optionsError" class="ds-banner ds-banner--error" role="alert">
      <span class="ds-flex-fill">{{ optionsError }}</span>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--sm" @click="emit('retryOptions')">
        Reintentar
      </button>
    </div>

    <AppSelect
      v-model="form.catalogItemId"
      :options="catalogItemOptions"
      label="Artículo"
      required
      :disabled="!!initial || optionsLoading"
      :placeholder="optionsLoading ? 'Cargando…' : 'Selecciona un artículo'"
      :error="err('catalogItemId')"
      @blur="touch('catalogItemId')"
    />

    <div class="grid grid--3">
      <AppSelect
        v-model="form.billingCycle"
        :options="BILLING_CYCLE_OPTIONS"
        label="Ciclo"
        required
        :error="err('billingCycle')"
        @blur="touch('billingCycle')"
      />
      <AppInput
        v-model="form.tierMin"
        label="Tramo mínimo"
        required
        type="number"
        :error="err('tierMin')"
        @blur="touch('tierMin')"
      />
      <AppInput
        v-model="form.tierMax"
        label="Tramo máximo"
        type="number"
        placeholder="Sin límite"
        :error="err('tierMax')"
        @blur="touch('tierMax')"
      />
    </div>

    <div class="grid grid--3">
      <AppInput
        v-model="form.includedQuantity"
        label="Cantidad incluida"
        required
        type="number"
        :error="err('includedQuantity')"
        @blur="touch('includedQuantity')"
      />
      <AppInput
        v-model="form.unitAmount"
        label="Precio unitario"
        required
        inputmode="decimal"
        :error="err('unitAmount')"
        @blur="touch('unitAmount')"
      />
      <AppInput
        v-model="form.setupAmount"
        label="Cobro inicial"
        required
        inputmode="decimal"
        :error="err('setupAmount')"
        @blur="touch('setupAmount')"
      />
    </div>

    <div class="grid grid--2">
      <AppSelect
        v-model="form.taxTreatment"
        :options="TAX_TREATMENT_OPTIONS"
        label="Tratamiento fiscal"
        required
        :error="err('taxTreatment')"
        @blur="touch('taxTreatment')"
      />
      <AppInput
        v-model="form.taxRate"
        label="Impuesto (%)"
        required
        inputmode="decimal"
        :disabled="form.taxTreatment !== 'TAXED'"
        :error="err('taxRate')"
        @blur="touch('taxRate')"
      />
    </div>

    <div class="actions ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button
        type="submit"
        class="ds-btn ds-btn--primary"
        :disabled="saving || optionsLoading || !!optionsError"
      >
        {{ saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Agregar precio' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.grid {
  display: grid;
  gap: var(--space-12);
}

.grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.actions {
  justify-content: flex-end;
}

@media (width <= 680px) {
  .grid--2,
  .grid--3 {
    grid-template-columns: 1fr;
  }
}
</style>
