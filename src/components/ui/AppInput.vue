<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Campo de texto de la consola (15 consumidores).
 *
 * DS-01: dejó de pintarse con las clases globales `.app-*` sobre los seis
 * hexadecimales `--vs-field-*` y adopta el **patrón de dos capas** de
 * `BaseInput.vue` (front del tenant): `.ds-field` pone la geometría sin color,
 * y el tono lo pone UNA clase de estado, nunca dos a la vez.
 *
 * Por qué los tres tonos son mutuamente excluyentes y no acumulativos: en
 * `primitives.css` `.ds-field-invalid` (:735) y `.ds-field-disabled` (:787) se
 * declaran ANTES que `.ds-field-rest` (:1566) y las tres pesan (0,1,0). Añadir
 * `ds-field-rest` junto a un estado haría que el reposo ganara por orden de
 * fuente y el campo en error se quedaría sin fondo rojo, sin un solo error de
 * compilación. Por eso `toneClass` devuelve una rama u otra, y el borde del
 * estado deshabilitado —que `.ds-field-disabled` no declara— lo pone
 * `.tone-border`, una sola declaración local que no compite con nada.
 *
 * `<style scoped>` se queda SOLO con geometría y tono local: ni un `background`
 * ni un `border-color` en la regla base de `.inputbox`, que pesaría (0,2,0) y le
 * ganaría a las clases de estado (trampa documentada en `AGENTS.md`).
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    required?: boolean
    error?: string
    /** Texto de ayuda persistente bajo el campo. Se oculta mientras hay error. */
    hint?: string
    placeholder?: string
    type?: string
    id?: string
    disabled?: boolean
    readonly?: boolean
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'decimal' | 'search' | 'none'
    /**
     * Presentación monoespaciada y espaciada, para valores que se leen dígito
     * a dígito (el código de verificación de 6 dígitos de `/aprobar-acceso`).
     * Es lo que hace que un solo `<input>` se lea como seis casillas sin
     * serlo — ver por qué no son seis controles en `AprobarAccesoView.vue`.
     * Aditiva: los 15 consumidores que no la pasan no cambian en nada.
     */
    mono?: boolean
  }>(),
  { type: 'text' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const autoId = useId()
const fieldId = () => props.id ?? autoId

/**
 * A11Y · §5.6 de `docs/ux/suscripciones-consola-especificacion.md`.
 *
 * El campo ya declaraba `aria-invalid`, pero el mensaje de error vivía en un
 * `<p>` sin `id` que nada ataba al control: un lector de pantalla anunciaba
 * «Nombre, no válido» y **no leía por qué**, así que quien no ve la pantalla
 * sabe que algo está mal y no qué (WCAG 2.2 §3.3.1). Es el hueco sistémico que
 * la especificación pide no heredar en las pantallas nuevas — se cierra aquí,
 * una vez, en el campo que usan los 15 formularios de la consola, en vez de
 * repetirlo en cada uno.
 *
 * El `hint` viaja por el mismo atributo cuando no hay error: es texto de ayuda
 * persistente y también describe al control. Nunca los dos a la vez, porque
 * `hint` no se pinta mientras hay error.
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
    <div class="inputbox ds-field ds-flex-row" :class="toneClass">
      <input
        :id="fieldId()"
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :aria-invalid="!!error || undefined"
        :aria-describedby="describedBy"
        class="ds-flex-fill"
        :class="mono ? 'mono' : null"
        @focus="focused = true"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="onBlur"
      />
      <!-- Control opcional al final del campo (el ojo de mostrar/ocultar
           contraseña). Va como slot y no como prop porque su marcado, su
           `aria-label` y su icono los decide el consumidor; los 15 que ya usan
           este componente no lo declaran y no cambian en nada. Al ser contenido
           de slot, se compila con el `data-v` del PADRE: su estilo vive en el
           `<style scoped>` de quien lo pasa, no aquí. -->
      <slot name="trailing" />
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

/* Solo el tono del borde en reposo cuando el campo está deshabilitado:
   `.ds-field-disabled` aporta fondo, color y cursor pero no borde, y
   `.ds-field-rest` no se puede combinar con ella (ver la cabecera). */
.tone-border {
  border-color: var(--warm-450);
}

.inputbox:hover:not(.ds-field-invalid, .ds-field-disabled, :focus-within) {
  border-color: var(--warm-500);
}

/* El `<input>` nativo hereda la superficie del envoltorio: aquí solo se le
   quita la suya. */
.inputbox > input {
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}

/* El `text-indent` compensa el hueco que el `letter-spacing` deja sobrante
   tras el último carácter, que si no descentra el valor. */
.inputbox > input.mono {
  font-family: var(--font-mono);
  font-size: var(--text-h3);
  letter-spacing: 0.4em;
  text-indent: 0.4em;
  font-variant-numeric: tabular-nums;
}

.inputbox > input::placeholder {
  color: var(--text-placeholder);
}

/* Issue #102 · el `<input>` de dentro también recibe la regla global de
   `base.css` (`input:focus-visible { box-shadow: var(--ring) }`), que se
   sumaría al anillo del envoltorio y dejaría un doble anillo. El envoltorio YA
   es el anillo visible de este patrón. */
.inputbox > input:focus-visible {
  box-shadow: none;
}
</style>
