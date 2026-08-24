<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { length, maxLength, selection } from '@/composables/validators'
import {
  CAPACITY_UNIT_OPTIONS,
  CATALOG_ITEM_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  type CapacityUnit,
  type CatalogItemResponse,
  type CatalogItemStatus,
  type CreateCatalogItemRequest,
  type ItemType,
  type UpdateCatalogItemRequest,
} from '../types/commercial-catalog.types'

const props = defineProps<{
  initial?: CatalogItemResponse | null
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateCatalogItemRequest | UpdateCatalogItemRequest]
  cancel: []
}>()

interface FormState {
  code: string
  name: string
  shortDescription: string
  longDescription: string
  itemType: ItemType | ''
  capacityUnit: CapacityUnit | ''
  core: boolean
  minQuantity: string
  maxQuantity: string
  sortOrder: string
  status: CatalogItemStatus
}

type Field = keyof FormState

const form = reactive<FormState>({
  code: '',
  name: '',
  shortDescription: '',
  longDescription: '',
  itemType: '',
  capacityUnit: '',
  core: false,
  minQuantity: '1',
  maxQuantity: '',
  sortOrder: '0',
  status: 'DRAFT',
})
const touched = reactive<Record<Field, boolean>>({
  code: false,
  name: false,
  shortDescription: false,
  longDescription: false,
  itemType: false,
  capacityUnit: false,
  core: false,
  minQuantity: false,
  maxQuantity: false,
  sortOrder: false,
  status: false,
})
const baseline = ref('')

function reset(initial?: CatalogItemResponse | null) {
  Object.assign(form, {
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    shortDescription: initial?.shortDescription ?? '',
    longDescription: initial?.longDescription ?? '',
    itemType: initial?.itemType ?? '',
    capacityUnit: initial?.capacityUnit ?? '',
    core: initial?.core ?? false,
    minQuantity: String(initial?.minQuantity ?? 1),
    maxQuantity: initial?.maxQuantity == null ? '' : String(initial.maxQuantity),
    sortOrder: String(initial?.sortOrder ?? 0),
    status: initial?.status ?? 'DRAFT',
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })
watch(
  () => form.itemType,
  (type) => {
    if (type !== 'CAPACITY') form.capacityUnit = ''
  },
)

function wholeNumber(value: string, label: string, minimum: number): string {
  if (!value.trim()) return `${label} es obligatoria.`
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum
    ? ''
    : `${label} debe ser un número entero mayor o igual a ${minimum}.`
}

const errors = computed<Record<Field, string>>(() => {
  const min = Number(form.minQuantity)
  const max = form.maxQuantity.trim() ? Number(form.maxQuantity) : null
  return {
    code: props.initial ? '' : length(form.code, 'El código', 1, 50),
    name: length(form.name, 'El nombre', 1, 120),
    shortDescription: maxLength(form.shortDescription, 'La descripción corta', 255),
    longDescription: '',
    itemType: selection(form.itemType, 'el tipo de artículo'),
    capacityUnit:
      form.itemType === 'CAPACITY' ? selection(form.capacityUnit, 'la unidad de capacidad') : '',
    core: '',
    minQuantity: wholeNumber(form.minQuantity, 'La cantidad mínima', 0),
    maxQuantity:
      max == null
        ? ''
        : !Number.isInteger(max) || max < min
          ? 'La cantidad máxima debe ser un entero mayor o igual a la mínima.'
          : '',
    sortOrder: wholeNumber(form.sortOrder, 'El orden', 0),
    status: selection(form.status, 'el estado'),
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

function submit() {
  if (!validate() || !form.itemType) return
  const common: UpdateCatalogItemRequest = {
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim() || null,
    longDescription: form.longDescription.trim() || null,
    itemType: form.itemType,
    capacityUnit: form.capacityUnit || null,
    core: form.core,
    minQuantity: Number(form.minQuantity),
    maxQuantity: form.maxQuantity.trim() ? Number(form.maxQuantity) : null,
    sortOrder: Number(form.sortOrder),
    status: form.status,
  }
  emit('submit', props.initial ? common : { code: form.code.trim(), ...common })
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="form ds-stack ds-stack--16" @submit.prevent="submit">
    <div class="grid grid--2">
      <AppInput
        v-model="form.code"
        label="Código"
        required
        :disabled="!!initial"
        :error="err('code')"
        @blur="touch('code')"
      />
      <AppInput
        v-model="form.name"
        label="Nombre"
        required
        :error="err('name')"
        @blur="touch('name')"
      />
    </div>

    <AppInput
      v-model="form.shortDescription"
      label="Descripción corta"
      :error="err('shortDescription')"
      @blur="touch('shortDescription')"
    />
    <AppTextarea v-model="form.longDescription" label="Descripción detallada" :rows="3" />

    <div class="grid grid--2">
      <AppSelect
        v-model="form.itemType"
        :options="ITEM_TYPE_OPTIONS"
        label="Tipo de artículo"
        required
        :error="err('itemType')"
        @blur="touch('itemType')"
      />
      <AppSelect
        v-model="form.capacityUnit"
        :options="CAPACITY_UNIT_OPTIONS"
        label="Unidad de capacidad"
        :required="form.itemType === 'CAPACITY'"
        :disabled="form.itemType !== 'CAPACITY'"
        :error="err('capacityUnit')"
        @blur="touch('capacityUnit')"
      />
    </div>

    <div class="grid grid--3">
      <AppInput
        v-model="form.minQuantity"
        label="Cantidad mínima"
        required
        type="number"
        inputmode="numeric"
        :error="err('minQuantity')"
        @blur="touch('minQuantity')"
      />
      <AppInput
        v-model="form.maxQuantity"
        label="Cantidad máxima"
        type="number"
        inputmode="numeric"
        placeholder="Sin límite"
        :error="err('maxQuantity')"
        @blur="touch('maxQuantity')"
      />
      <AppInput
        v-model="form.sortOrder"
        label="Orden"
        required
        type="number"
        inputmode="numeric"
        :error="err('sortOrder')"
        @blur="touch('sortOrder')"
      />
    </div>

    <div class="grid grid--2 align-end">
      <AppSelect
        v-model="form.status"
        :options="CATALOG_ITEM_STATUS_OPTIONS"
        label="Estado comercial"
        required
        :error="err('status')"
        @blur="touch('status')"
      />
      <AppCheckbox v-model="form.core" label="Artículo esencial del catálogo" />
    </div>

    <div class="actions ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear artículo' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form {
  min-width: 0;
}

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

.align-end {
  align-items: end;
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
