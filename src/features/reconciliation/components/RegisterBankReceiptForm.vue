<script setup lang="ts">
import { computed, reactive } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { length, maxLength } from '@/composables/validators'
import type { RegisterBankReceiptRequest } from '../types/reconciliation.types'

/**
 * Dar de alta un abono del extracto bancario.
 *
 * <p>El importe admite negativo, como en la liquidación: una devolución bancaria
 * es un abono con signo, y hay que poder registrarla tal cual para que el
 * extracto conciliado sea el extracto de verdad.
 */
const props = defineProps<{ saving?: boolean }>()

const emit = defineEmits<{ submit: [data: RegisterBankReceiptRequest]; cancel: [] }>()

type Field = 'bankAccountRef' | 'bankReference' | 'receivedOn' | 'amount' | 'description'

const FIELDS: Field[] = ['bankAccountRef', 'bankReference', 'receivedOn', 'amount', 'description']

const form = reactive<Record<Field, string>>({
  bankAccountRef: '',
  bankReference: '',
  receivedOn: '',
  amount: '',
  description: '',
})
const touched = reactive<Record<Field, boolean>>({
  bankAccountRef: false,
  bankReference: false,
  receivedOn: false,
  amount: false,
  description: false,
})
const baseline = JSON.stringify(form)

const errors = computed<Record<Field, string>>(() => ({
  bankAccountRef: length(form.bankAccountRef, 'La cuenta bancaria', 1, 60),
  bankReference: length(form.bankReference, 'La referencia del banco', 1, 120),
  receivedOn: form.receivedOn ? '' : 'La fecha del abono es obligatoria.',
  amount:
    form.amount.trim() === ''
      ? 'El importe es obligatorio.'
      : /^-?\d+([.,]\d{1,2})?$/.test(form.amount.trim())
        ? ''
        : 'El importe tiene que ser un número, con dos decimales como mucho.',
  description: maxLength(form.description, 'La descripción', 255),
}))

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
  if (!validate() || props.saving) return
  emit('submit', {
    bankAccountRef: form.bankAccountRef.trim(),
    bankReference: form.bankReference.trim(),
    receivedOn: form.receivedOn,
    amount: Number(form.amount.trim().replace(',', '.')),
    description: form.description.trim() || null,
  })
}

function isDirty() {
  return JSON.stringify(form) !== baseline
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <div class="ds-grid-2">
      <AppInput
        v-model="form.bankAccountRef"
        label="Cuenta bancaria"
        required
        :maxlength="60"
        :error="err('bankAccountRef')"
        @blur="touch('bankAccountRef')"
      />
      <AppInput
        v-model="form.bankReference"
        label="Referencia del banco"
        required
        :maxlength="120"
        :error="err('bankReference')"
        @blur="touch('bankReference')"
      />
    </div>

    <div class="ds-grid-2">
      <AppInput
        v-model="form.receivedOn"
        label="Fecha del abono"
        required
        type="date"
        :error="err('receivedOn')"
        @blur="touch('receivedOn')"
      />
      <AppInput
        v-model="form.amount"
        label="Importe"
        required
        inputmode="decimal"
        hint="Negativo si es una devolución: el extracto se registra como es."
        :error="err('amount')"
        @blur="touch('amount')"
      />
    </div>

    <AppTextarea
      v-model="form.description"
      label="Descripción"
      :rows="2"
      :maxlength="255"
      hint="Lo que dice el extracto. Es lo que después permite identificar el abono."
      :error="err('description')"
      @blur="touch('description')"
    />

    <div class="acciones ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Registrar el abono' }}
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
