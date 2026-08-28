<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { length, pattern } from '@/composables/validators'
import type {
  CreatePriceListRequest,
  PriceListResponse,
  UpdatePriceListRequest,
} from '../types/commercial-catalog.types'

const props = defineProps<{ initial?: PriceListResponse | null; saving?: boolean }>()
const emit = defineEmits<{
  submit: [data: CreatePriceListRequest | UpdatePriceListRequest]
  cancel: []
}>()

type Field = 'code' | 'name' | 'currency' | 'validFrom' | 'validTo'
const form = reactive<Record<Field, string>>({
  code: '',
  name: '',
  currency: 'COP',
  validFrom: '',
  validTo: '',
})
const touched = reactive<Record<Field, boolean>>({
  code: false,
  name: false,
  currency: false,
  validFrom: false,
  validTo: false,
})
const baseline = ref('')

function reset(initial?: PriceListResponse | null) {
  Object.assign(form, {
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    currency: initial?.currency ?? 'COP',
    validFrom: initial?.validFrom ?? '',
    validTo: initial?.validTo ?? '',
  })
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

const errors = computed<Record<Field, string>>(() => ({
  code: props.initial ? '' : length(form.code, 'El código', 1, 50),
  name: length(form.name, 'El nombre', 1, 120),
  currency: pattern(form.currency, 'La moneda', /^[A-Z]{3}$/, 'COP'),
  validFrom: form.validFrom ? '' : 'La fecha inicial es obligatoria.',
  validTo:
    form.validTo && form.validFrom && form.validTo < form.validFrom
      ? 'La fecha final no puede ser anterior a la inicial.'
      : '',
}))

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
  if (!validate()) return
  const common: UpdatePriceListRequest = {
    name: form.name.trim(),
    currency: form.currency.trim().toUpperCase(),
    validFrom: form.validFrom,
    validTo: form.validTo || null,
  }
  emit('submit', props.initial ? common : { code: form.code.trim(), ...common })
}

function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <div class="ds-grid-2">
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
    <div class="ds-grid-2 grid--dates">
      <AppInput
        v-model="form.currency"
        label="Moneda"
        required
        placeholder="COP"
        :error="err('currency')"
        @update:model-value="form.currency = $event.toUpperCase()"
        @blur="touch('currency')"
      />
      <AppInput
        v-model="form.validFrom"
        label="Válida desde"
        required
        type="date"
        :error="err('validFrom')"
        @blur="touch('validFrom')"
      />
      <AppInput
        v-model="form.validTo"
        label="Válida hasta"
        type="date"
        :error="err('validTo')"
        @blur="touch('validTo')"
      />
    </div>
    <div class="actions ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear lista' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* La rejilla de 2 columnas es `.ds-grid-2` (primitives.css); `.grid--dates`
   solo pisa las columnas donde necesita 3 (FE-08). */
.grid--dates {
  grid-template-columns: 0.7fr 1fr 1fr;
}

.actions {
  justify-content: flex-end;
}

@media (width <= 680px) {
  .grid--dates {
    grid-template-columns: 1fr;
  }
}
</style>
