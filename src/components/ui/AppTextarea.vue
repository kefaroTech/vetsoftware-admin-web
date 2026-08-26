<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Área de texto de la consola (6 consumidores).
 *
 * DS-01: mismo patrón de dos capas que `AppInput` — ver allí el porqué de que
 * las tres ramas de tono sean excluyentes.
 *
 * Por qué el `<textarea>` va DENTRO de un envoltorio y no lleva el tono encima,
 * a diferencia de `BaseTextarea` del tenant: `base.css` (gemelo) declara
 * `textarea:focus-visible { border-color; box-shadow: var(--ring) }`, un
 * selector de elemento que pesa (0,1,1) y le gana a `.ds-field-invalid-focus`
 * (0,1,0). Con el tono sobre el propio `<textarea>`, un campo inválido enfocado
 * se pintaba con el anillo morado en vez del rojo, en silencio. El envoltorio
 * es un `<div>`, al que esa regla no llega.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    required?: boolean
    error?: string
    /** Texto de ayuda persistente bajo el campo. Se oculta mientras hay error. */
    hint?: string
    placeholder?: string
    rows?: number
    id?: string
    disabled?: boolean
    /**
     * Longitud máxima del `@Size(max = …)` del DTO del backend. Va **junto** al
     * validador, nunca en su lugar: hace que la restricción exista ANTES de
     * fallar, pero no protege del pegado en todos los navegadores. Aditiva:
     * los consumidores que no la pasan no cambian en nada.
     */
    maxlength?: number
  }>(),
  { rows: 3 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const autoId = useId()
const fieldId = () => props.id ?? autoId

/**
 * A11Y · §5.6 de `docs/ux/suscripciones-consola-especificacion.md`, misma
 * corrección que `AppInput.vue`: el mensaje de error tiene que estar ASOCIADO
 * al control y no solo pintado debajo. Con `aria-invalid` a secas, un lector de
 * pantalla anuncia «no válido» y no lee por qué (WCAG 2.2 §3.3.1). El `hint`
 * viaja por el mismo atributo cuando no hay error, y nunca los dos a la vez
 * porque `hint` no se pinta mientras hay error.
 */
const errorId = computed(() => `${fieldId()}-error`)
const hintId = computed(() => `${fieldId()}-hint`)
const describedBy = computed(() => {
  if (props.error) return errorId.value
  return props.hint ? hintId.value : undefined
})

const focused = ref(false)

/**
 * El desenfoque hace dos cosas —bajar el tono de foco y propagar el evento— y
 * eso no cabe en un binding inline: separarlas con `;` no sobrevive a Prettier,
 * que corre con `semi: false` y deja dos sentencias pegadas que el compilador de
 * plantillas no sabe parsear (rompio el build el 21/08/2026).
 */
function onBlur(event: FocusEvent) {
  focused.value = false
  emit('blur', event)
}

const toneClass = computed(() => {
  if (props.error) return ['ds-field-invalid', focused.value ? 'ds-field-invalid-focus' : null]
  if (props.disabled) return ['tone-border', 'ds-field-disabled']
  return ['ds-field-rest', 'ds-focus-ring']
})
</script>

<template>
  <div class="field ds-stack">
    <label v-if="label" :for="fieldId()" class="label">
      {{ label }}<span v-if="required" class="required">*</span>
    </label>
    <div class="textareabox ds-field" :class="toneClass">
      <textarea
        :id="fieldId()"
        :rows="rows"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        @focus="focused = true"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @blur="onBlur"
      />
    </div>
    <p v-if="error" :id="errorId" class="error">
      <component :is="ICONS.WARNING" :size="11" />
      <span>{{ error }}</span>
    </p>
    <p v-else-if="hint" :id="hintId" class="ds-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  gap: var(--space-6);
  min-width: 0;
}

.label {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  color: var(--text);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: 0.01em;
}

.required {
  color: var(--danger-500);
}

.error {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: 0;
  color: var(--danger-500);
  font-size: var(--text-xs);
}

/* Ver `AppInput.vue`: `.ds-field-disabled` no declara borde y `.ds-field-rest`
   no se puede combinar con ella. */
.tone-border {
  border-color: var(--warm-450);
}

.textareabox {
  display: flex;
  width: 100%;
}

.textareabox:hover:not(.ds-field-invalid, .ds-field-disabled, :focus-within) {
  border-color: var(--warm-500);
}

.textareabox > textarea {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.55;
  resize: vertical;
}

.textareabox > textarea::placeholder {
  color: var(--text-placeholder);
}

/* Issue #102 · sin esto se suman el anillo de `base.css` y el del envoltorio. */
.textareabox > textarea:focus-visible {
  box-shadow: none;
}
</style>
