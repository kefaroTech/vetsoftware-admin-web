<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { selection } from '@/composables/validators'
import {
  LIMIT_ENFORCEMENT_MEANING,
  LIMIT_ENFORCEMENT_OPTIONS,
  LIMIT_MODE_OPTIONS,
  LIMIT_RESET_PERIOD_OPTIONS,
  type CatalogItemLimitResponse,
  type CreateCatalogItemLimitRequest,
  type LimitEnforcement,
  type LimitMode,
  type LimitResetPeriod,
} from '../types/commercial-catalog.types'

/**
 * El techo de fábrica que un artículo concede sobre un eje de cupo.
 *
 * <p><b>Los campos condicionados desaparecen en vez de apagarse.</b> La cantidad
 * solo existe con `LIMITED` y el importe del exceso solo con `OVERAGE`: un campo
 * apagado dice «esto se podría escribir» sobre algo que el servidor va a
 * ignorar, y deja al operador creyendo que puso un número que no viajó.
 *
 * <p><b>El rótulo del rigor lleva su consecuencia al lado.</b> «Bloquear» a secas
 * no dice a quién se le para qué; «la clínica no puede añadir más de eso hasta
 * que amplíe» sí, y es la diferencia entre elegir el rigor y elegir la palabra
 * que suena mejor.
 *
 * <p><b>El eje no se cambia al editar.</b> `UpdateCatalogItemLimitRequest` no lo
 * declara — atar el techo a otro eje es otra fila, no la misma — así que el
 * desplegable queda deshabilitado en vez de mandar un campo que el servidor
 * descarta en silencio.
 */
const props = defineProps<{
  initial?: CatalogItemLimitResponse | null
  /** Los ejes elegibles: los que este artículo todavía no cubre, más el suyo al editar. */
  dimensionOptions: { value: number; label: string }[]
  optionsLoading?: boolean
  optionsError?: string | null
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CreateCatalogItemLimitRequest]
  cancel: []
  retryOptions: []
}>()

type Field =
  | 'limitDimensionId'
  | 'mode'
  | 'limitQuantity'
  | 'resetPeriod'
  | 'enforcement'
  | 'overageUnitAmount'
  | 'warnThreshold'
  | 'trialMode'
  | 'trialLimitQuantity'

const FIELDS: Field[] = [
  'limitDimensionId',
  'mode',
  'limitQuantity',
  'resetPeriod',
  'enforcement',
  'overageUnitAmount',
  'warnThreshold',
  'trialMode',
  'trialLimitQuantity',
]

const form = reactive({
  limitDimensionId: null as number | null,
  mode: 'LIMITED' as LimitMode,
  limitQuantity: '',
  resetPeriod: '' as LimitResetPeriod | '',
  enforcement: 'WARN' as LimitEnforcement,
  overageUnitAmount: '',
  warnThreshold: '80',
  trialMode: 'LIMITED' as LimitMode,
  trialLimitQuantity: '',
})
const touched = reactive<Record<Field, boolean>>({
  limitDimensionId: false,
  mode: false,
  limitQuantity: false,
  resetPeriod: false,
  enforcement: false,
  overageUnitAmount: false,
  warnThreshold: false,
  trialMode: false,
  trialLimitQuantity: false,
})
const baseline = ref('')

function reset(initial?: CatalogItemLimitResponse | null) {
  form.limitDimensionId = initial?.limitDimensionId ?? null
  form.mode = initial?.mode ?? 'LIMITED'
  form.limitQuantity = initial?.limitQuantity == null ? '' : String(initial.limitQuantity)
  form.resetPeriod = initial?.resetPeriod ?? ''
  form.enforcement = initial?.enforcement ?? 'WARN'
  form.overageUnitAmount =
    initial?.overageUnitAmount == null ? '' : String(initial.overageUnitAmount)
  form.warnThreshold = String(initial?.warnThreshold ?? 80)
  form.trialMode = initial?.trialMode ?? 'LIMITED'
  form.trialLimitQuantity =
    initial?.trialLimitQuantity == null ? '' : String(initial.trialLimitQuantity)
  for (const key of FIELDS) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(() => props.initial, reset, { immediate: true })

const isLimited = computed(() => form.mode === 'LIMITED')
const isTrialLimited = computed(() => form.trialMode === 'LIMITED')
const isOverage = computed(() => form.enforcement === 'OVERAGE')

const enforcementHint = computed(() => LIMIT_ENFORCEMENT_MEANING[form.enforcement])

/** Cantidad entera positiva. Cero no es un techo, es una prohibición disfrazada. */
function quantity(value: string, label: string, requiredNow: boolean): string {
  if (!requiredNow) return ''
  if (value.trim() === '') return `${label} es obligatoria cuando hay techo.`
  if (!/^\d+$/.test(value.trim())) return `${label} tiene que ser un número entero.`
  if (Number(value) <= 0) return `${label} tiene que ser mayor que cero.`
  return ''
}

const errors = computed<Record<Field, string>>(() => ({
  limitDimensionId: selection(form.limitDimensionId, 'El eje de cupo'),
  mode: '',
  limitQuantity: quantity(form.limitQuantity, 'La cantidad', isLimited.value),
  resetPeriod: '',
  enforcement: '',
  overageUnitAmount: isOverage.value
    ? form.overageUnitAmount.trim() === ''
      ? 'Con «cobrar el exceso» hace falta el precio de cada unidad de más.'
      : /^\d+([.,]\d{1,2})?$/.test(form.overageUnitAmount.trim())
        ? ''
        : 'El precio del exceso tiene que ser un importe positivo.'
    : '',
  warnThreshold:
    /^\d+$/.test(form.warnThreshold.trim()) &&
    Number(form.warnThreshold) >= 1 &&
    Number(form.warnThreshold) <= 100
      ? ''
      : 'El aviso va entre 1 y 100 por ciento del techo.',
  trialMode: '',
  trialLimitQuantity: quantity(
    form.trialLimitQuantity,
    'La cantidad durante la prueba',
    isTrialLimited.value,
  ),
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
  const dimensionId = form.limitDimensionId
  if (dimensionId === null) return
  emit('submit', {
    limitDimensionId: dimensionId,
    mode: form.mode,
    limitQuantity: isLimited.value ? Number(form.limitQuantity) : null,
    resetPeriod: form.resetPeriod === '' ? null : form.resetPeriod,
    enforcement: form.enforcement,
    overageUnitAmount: isOverage.value
      ? Number(form.overageUnitAmount.trim().replace(',', '.'))
      : null,
    warnThreshold: Number(form.warnThreshold),
    trialMode: form.trialMode,
    trialLimitQuantity: isTrialLimited.value ? Number(form.trialLimitQuantity) : null,
  })
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
      v-model="form.limitDimensionId"
      :options="dimensionOptions"
      label="Eje de cupo"
      required
      :disabled="!!initial || optionsLoading"
      :placeholder="optionsLoading ? 'Cargando…' : 'Selecciona el eje'"
      :hint="
        initial
          ? 'El eje no se cambia: atar el techo a otro eje es otra fila, no la misma.'
          : 'Mascotas, citas, usuarios, sedes… Un artículo solo puede conceder un techo por eje.'
      "
      :error="err('limitDimensionId')"
      @blur="touch('limitDimensionId')"
    />

    <div class="ds-grid-2 rejilla">
      <AppSelect
        v-model="form.mode"
        :options="LIMIT_MODE_OPTIONS"
        label="Techo de pago"
        required
        :error="err('mode')"
        @blur="touch('mode')"
      />
      <AppInput
        v-if="isLimited"
        v-model="form.limitQuantity"
        label="Cantidad"
        required
        inputmode="numeric"
        :error="err('limitQuantity')"
        @blur="touch('limitQuantity')"
      />
    </div>

    <div class="ds-grid-2 rejilla">
      <AppSelect
        v-model="form.trialMode"
        :options="LIMIT_MODE_OPTIONS"
        label="Techo durante la prueba"
        required
        hint="Puede ser distinto del de pago: es lo que la clínica tiene mientras prueba."
        :error="err('trialMode')"
        @blur="touch('trialMode')"
      />
      <AppInput
        v-if="isTrialLimited"
        v-model="form.trialLimitQuantity"
        label="Cantidad durante la prueba"
        required
        inputmode="numeric"
        :error="err('trialLimitQuantity')"
        @blur="touch('trialLimitQuantity')"
      />
    </div>

    <div class="ds-grid-2 rejilla">
      <AppSelect
        v-model="form.enforcement"
        :options="LIMIT_ENFORCEMENT_OPTIONS"
        label="Al llegar al techo"
        required
        :hint="enforcementHint"
        :error="err('enforcement')"
        @blur="touch('enforcement')"
      />
      <AppInput
        v-if="isOverage"
        v-model="form.overageUnitAmount"
        label="Precio de cada unidad de más"
        required
        inputmode="decimal"
        :error="err('overageUnitAmount')"
        @blur="touch('overageUnitAmount')"
      />
    </div>

    <div class="ds-grid-2 rejilla">
      <AppSelect
        v-model="form.resetPeriod"
        :options="LIMIT_RESET_PERIOD_OPTIONS"
        label="Se reinicia"
        hint="Solo tiene sentido en los ejes que se acumulan; los de existencia no se reinician."
        :error="err('resetPeriod')"
        @blur="touch('resetPeriod')"
      />
      <AppInput
        v-model="form.warnThreshold"
        label="Avisar al (%)"
        required
        inputmode="numeric"
        hint="Porcentaje del techo a partir del cual la clínica ve el aviso."
        :error="err('warnThreshold')"
        @blur="touch('warnThreshold')"
      />
    </div>

    <div class="acciones ds-flex-row">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : initial ? 'Guardar el techo' : 'Añadir el techo' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* La rejilla en sí es `.ds-grid-2` (primitives.css); esta clase solo aporta
   lo que la primitiva no cubre (FE-08). */
.rejilla {
  align-items: start;
}

.acciones {
  justify-content: flex-end;
}
</style>
