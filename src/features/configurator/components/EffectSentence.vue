<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { ICONS } from '@/constants/icons'
import type { CatalogItemResponse } from '@/features/commercial-catalog/types/commercial-catalog.types'
import {
  EFFECT_TYPE_OPTIONS,
  type ConfiguratorEffectResponse,
  type ConfiguratorEffectType,
  type CreateConfiguratorEffectRequest,
} from '../types/configurator.types'
import {
  parseTrigger,
  type EffectDraft,
  type EffectTriggerOption,
} from '../composables/effect-sentence'

/**
 * El editor de un efecto, como **una frase con huecos**.
 *
 * <p><b>Por qué no son tres desplegables con códigos</b> (especificación §3.6 y
 * §6.2). Un efecto mal puesto no da error: da una cotización sin un artículo, y
 * eso se descubre facturando. Una fila con `optionId`, `catalogItemId` y
 * `effect` en códigos internos esconde el error; una frase legible lo hace
 * visible, porque el operador lee lo que va a pasar en vez de reconstruirlo.
 *
 * <p><b>La frase da contexto, no nombre accesible.</b> Cada `&lt;select&gt;`
 * lleva su `&lt;label&gt;` propia en `.ds-sr-only` («Respuesta que dispara el
 * efecto», «Qué hace», «Artículo afectado», «Cantidad»). Un lector de pantalla
 * que salta de control en control nunca oye la frase entera, así que sin
 * etiqueta oiría «cuadro combinado» tres veces (WCAG 2.2 §4.1.2). La frase NO
 * sustituye a la etiqueta.
 *
 * <p>Son `&lt;select&gt;` nativos y no `AppSelect` a propósito: `AppSelect` es
 * un campo de bloque con su rótulo encima y no puede fluir dentro de un párrafo
 * — y el nativo trae el contrato de teclado del combobox ya hecho.
 *
 * <p><b>El disparador no se edita en un efecto que ya existe.</b>
 * `UpdateConfiguratorEffectRequest` no lleva `optionId` ni `questionId`: la
 * operación no existe. Se pinta como texto, no como un desplegable
 * deshabilitado, que diría que sí existe y que hoy no te dejan (§3.2).
 */
const props = defineProps<{
  initial?: ConfiguratorEffectResponse | null
  /** Respuestas marcables y preguntas numéricas del cuestionario, ya en palabras. */
  triggers: EffectTriggerOption[]
  catalogItems: CatalogItemResponse[]
  /** Texto del disparador cuando el efecto ya existe y por tanto no se puede cambiar. */
  fixedTriggerLabel?: string
  /** Disparador preseleccionado al crear desde el botón «Efecto» de una respuesta. */
  presetTrigger?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateConfiguratorEffectRequest]
  cancel: []
}>()

type Field = keyof EffectDraft

const uid = useId()
const fieldId = (field: Field) => `${uid}-${field}`
const errorId = (field: Field) => `${uid}-${field}-error`
const helpId = `${uid}-help`

const form = reactive<EffectDraft>({
  trigger: '',
  effect: '',
  catalogItemId: null,
  quantity: '',
})
const touched = reactive<Record<Field, boolean>>({
  trigger: false,
  effect: false,
  catalogItemId: false,
  quantity: false,
})
const baseline = ref('')

function reset(initial?: ConfiguratorEffectResponse | null) {
  form.trigger =
    initial?.optionId != null
      ? `o:${String(initial.optionId)}`
      : initial?.questionId != null
        ? `q:${String(initial.questionId)}`
        : (props.presetTrigger ?? '')
  form.effect = initial?.effect ?? ''
  form.catalogItemId = initial?.catalogItemId ?? null
  form.quantity = initial?.quantity == null ? '' : String(initial.quantity)
  for (const key of Object.keys(touched) as Field[]) touched[key] = false
  baseline.value = JSON.stringify(form)
}

watch(
  () => [props.initial, props.presetTrigger] as const,
  () => reset(props.initial),
  { immediate: true },
)

const isEdit = computed(() => !!props.initial)
const needsQuantity = computed(() => form.effect === 'SET_QUANTITY')
const triggerIsNumeric = computed(
  () => props.triggers.find((t) => t.value === form.trigger)?.numeric ?? false,
)

const catalogOptions = computed(() =>
  [...props.catalogItems]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'))
    .map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
)

const errors = computed<Record<Field, string>>(() => {
  const quantity = Number(form.quantity)
  return {
    trigger: isEdit.value || form.trigger ? '' : 'Debes elegir la respuesta que dispara el efecto.',
    effect: form.effect ? '' : 'Debes elegir qué hace el efecto.',
    catalogItemId: form.catalogItemId ? '' : 'Debes elegir el artículo afectado.',
    quantity: !needsQuantity.value
      ? ''
      : !form.quantity.trim()
        ? 'La cantidad es obligatoria cuando el efecto fija una cantidad.'
        : !Number.isInteger(quantity) || quantity < 1
          ? 'La cantidad debe ser un número entero mayor o igual a 1.'
          : '',
  }
})

/**
 * La incoherencia que el backend castiga con un 409 al guardar
 * (`QuantityFromAnswerGuard`): «fija la cantidad con el número del cliente»
 * colgado de algo que no es una pregunta numérica. Se dice aquí, con el
 * remedio, en vez de dejar que vuelva del servidor.
 */
const incoherence = computed(() =>
  form.effect === 'QUANTITY_FROM_ANSWER' && form.trigger && !triggerIsNumeric.value
    ? '«Fija la cantidad con el número del cliente» solo funciona sobre una pregunta que se responde con un número. Elige una pregunta numérica o cambia lo que hace el efecto.'
    : '',
)

function err(field: Field) {
  return touched[field] ? errors.value[field] : ''
}

function describedBy(field: Field) {
  return err(field) ? errorId(field) : undefined
}

function touch(field: Field) {
  touched[field] = true
}

function validate() {
  for (const key of Object.keys(touched) as Field[]) touched[key] = true
  return Object.values(errors.value).every((message) => !message) && !incoherence.value
}

function submit() {
  if (!validate() || !form.effect || form.catalogItemId == null) return
  const { optionId, questionId } = props.initial
    ? { optionId: props.initial.optionId, questionId: props.initial.questionId }
    : parseTrigger(form.trigger)
  emit('submit', {
    optionId,
    questionId,
    catalogItemId: form.catalogItemId,
    effect: form.effect as ConfiguratorEffectType,
    quantity: needsQuantity.value ? Number(form.quantity) : null,
  })
}

/** Para `useUnsavedChangesGuard`: si hay algo escrito que se perdería al salir. */
function isDirty() {
  return JSON.stringify(form) !== baseline.value
}

defineExpose({ validate, isDirty })
</script>

<template>
  <form class="ds-stack ds-stack--16" @submit.prevent="submit">
    <p :id="helpId" class="ds-hint">
      Se lee como una frase. Cada hueco es un desplegable: léela entera antes de guardar, porque un
      efecto mal puesto se traduce en cotizar de menos.
    </p>

    <p class="frase">
      <span>Si responde</span>

      <template v-if="isEdit">
        <strong class="fijo">{{ fixedTriggerLabel ?? '—' }}</strong>
      </template>
      <template v-else>
        <label class="ds-sr-only" :for="fieldId('trigger')">Respuesta que dispara el efecto</label>
        <select
          :id="fieldId('trigger')"
          v-model="form.trigger"
          class="hueco ds-field ds-focus-ring"
          :class="err('trigger') ? 'ds-field-invalid' : 'ds-field-rest'"
          :aria-invalid="err('trigger') ? 'true' : undefined"
          :aria-describedby="describedBy('trigger')"
          @blur="touch('trigger')"
        >
          <option value="">— elige una respuesta —</option>
          <option v-for="option in triggers" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </template>

      <span aria-hidden="true">→</span>
      <span class="ds-sr-only">entonces</span>

      <label class="ds-sr-only" :for="fieldId('effect')">Qué hace el efecto</label>
      <select
        :id="fieldId('effect')"
        v-model="form.effect"
        class="hueco ds-field ds-focus-ring"
        :class="err('effect') ? 'ds-field-invalid' : 'ds-field-rest'"
        :aria-invalid="err('effect') ? 'true' : undefined"
        :aria-describedby="describedBy('effect')"
        @blur="touch('effect')"
      >
        <option value="">— elige qué hace —</option>
        <option v-for="option in EFFECT_TYPE_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <label class="ds-sr-only" :for="fieldId('catalogItemId')">Artículo afectado</label>
      <select
        :id="fieldId('catalogItemId')"
        v-model.number="form.catalogItemId"
        class="hueco ds-field ds-focus-ring"
        :class="err('catalogItemId') ? 'ds-field-invalid' : 'ds-field-rest'"
        :aria-invalid="err('catalogItemId') ? 'true' : undefined"
        :aria-describedby="describedBy('catalogItemId')"
        @blur="touch('catalogItemId')"
      >
        <option :value="null">— elige un artículo —</option>
        <option v-for="option in catalogOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <template v-if="needsQuantity">
        <span>en</span>
        <label class="ds-sr-only" :for="fieldId('quantity')">Cantidad</label>
        <input
          :id="fieldId('quantity')"
          v-model="form.quantity"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          class="hueco hueco--num ds-field ds-focus-ring"
          :class="err('quantity') ? 'ds-field-invalid' : 'ds-field-rest'"
          :aria-invalid="err('quantity') ? 'true' : undefined"
          :aria-describedby="describedBy('quantity')"
          @blur="touch('quantity')"
        />
      </template>
      <span v-else-if="form.effect === 'QUANTITY_FROM_ANSWER'">
        en el número que escriba el cliente
      </span>
      <span aria-hidden="true">.</span>
    </p>

    <p
      v-for="field in ['trigger', 'effect', 'catalogItemId', 'quantity'] as const"
      v-show="err(field)"
      :id="errorId(field)"
      :key="field"
      class="error ds-flex-row ds-flex-row--6"
    >
      <component :is="ICONS.WARNING" :size="12" />
      <span>{{ err(field) }}</span>
    </p>

    <p v-if="incoherence" class="ds-banner ds-banner--warning" role="alert">
      <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
      <span>{{ incoherence }}</span>
    </p>

    <p v-if="catalogItems.length === 0" class="ds-banner ds-banner--info">
      <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
      <span>
        El catálogo comercial no tiene artículos todavía, así que no hay nada que un efecto pueda
        añadir. Siémbralo en «Catálogo y precios» antes de escribir efectos.
      </span>
    </p>

    <div class="ds-actions">
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </button>
      <button type="submit" class="ds-btn ds-btn--primary" :disabled="saving">
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar efecto' : 'Crear efecto' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Solo geometría: el color de cada hueco lo pone la clase de estado
   (`.ds-field-rest` / `.ds-field-invalid`) desde el marcado, nunca una regla
   base de aquí, que pesaría (0,2,0) y le ganaría — trampa documentada en
   `AGENTS.md`. */
.frase {
  margin: 0;
  line-height: 2.4;
}

.hueco {
  display: inline-block;
  width: auto;
  max-width: 100%;
  padding-block: var(--space-4);
  font-family: inherit;
}

.hueco--num {
  width: 7ch;
}

.fijo {
  font-weight: var(--weight-semibold);
}

/* La geometria la ponen `.ds-flex-row` + `.ds-flex-row--6` desde el marcado;
   aqui solo queda el tono, que ninguna primitiva aporta para texto de error en
   linea. Escribir el cuerpo entero habria hecho de este el cuarto componente
   con la misma regla y `css:budget` no tolera ningun grupo duplicado. */
.error {
  margin: 0;
  color: var(--danger-500);
  font-size: var(--text-xs);
}
</style>
