<script setup lang="ts">
import { computed, onUnmounted, ref, useId, watch } from 'vue'
import { ICONS } from '@/constants/icons'

/**
 * Campo de búsqueda de un listado de la consola (ficha F3 de
 * `docs/ux/patron-de-busqueda-en-listado.md`).
 *
 * Existe para que el marcado no se copie diecisiete veces: es exactamente lo
 * que `stylelint-plugins/no-duplicate-primitive.mjs` y `css:budget` con
 * `maxDuplicateGroups: 0` existen para impedir.
 *
 * NO es gemelo TR-02: el front del tenant resuelve esto dentro de
 * `ListBody.vue`, que tiene otra forma. Unificarlas es una decisión de paridad
 * aparte, no un efecto colateral de esta ficha.
 *
 * Tres cosas que el marcado a mano de la casa no hacía y aquí son obligatorias:
 *
 *  1. **Etiqueta asociada siempre.** El `placeholder` no es una etiqueta:
 *     desaparece al escribir y el campo se queda sin nombre accesible (WCAG 2.2
 *     §3.3.2 Labels or Instructions, §4.1.2 Name, Role, Value). Si no cabe
 *     visualmente, se oculta con `.ds-sr-only`, que no la retira del árbol de
 *     accesibilidad.
 *  2. **`type="search"`**, no `type="text"`: da el rol correcto.
 *  3. **El icono es decorativo** y va con `aria-hidden`.
 */
const props = withDefaults(
  defineProps<{
    /** Término vigente. El dueño del estado es la vista, no este componente. */
    modelValue: string
    /** Nombre accesible. Obligatorio: «Buscar empresas», «Buscar especies»… */
    label: string
    /** Qué campos mira la búsqueda. Tiene que decir la verdad. */
    placeholder?: string
    /** Oculta la etiqueta visualmente, conservando el nombre accesible. */
    hideLabel?: boolean
    /**
     * Número de coincidencias, para el anuncio del recuento. `null` mientras
     * carga: entonces no se anuncia nada.
     */
    resultCount?: number | null
    /** Retardo del rebote. 300 ms es el número que la casa ya usa. */
    delayMs?: number
  }>(),
  { placeholder: '', hideLabel: false, resultCount: null, delayMs: 300 },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const fieldId = useId()
const inputEl = ref<HTMLInputElement | null>(null)

/** Lo que se está tecleando, antes del rebote. */
const texto = ref(props.modelValue)
let temporizador: ReturnType<typeof setTimeout> | null = null

/**
 * El recuento anunciado va con el MISMO retardo que la búsqueda. Sin él, el
 * lector de pantalla recitaría un número por pulsación y la región viva se
 * volvería ruido del que la gente se defiende apagándola.
 */
const recuentoAnunciado = ref('')

// Si el término cambia desde fuera (limpiar desde el estado vacío, o la URL al
// volver atrás), el campo se pone al día sin disparar otro rebote.
watch(
  () => props.modelValue,
  (valor) => {
    if (valor !== texto.value) {
      texto.value = valor
      cancelar()
    }
  },
)

watch(
  () => [props.resultCount, props.modelValue] as const,
  ([n]) => {
    if (n === null) {
      recuentoAnunciado.value = ''
      return
    }
    recuentoAnunciado.value = n === 0 ? 'Sin resultados' : `${n} resultados`
  },
  { immediate: true },
)

const hayTexto = computed(() => texto.value.length > 0)

function cancelar() {
  if (temporizador) clearTimeout(temporizador)
  temporizador = null
}

function emitir() {
  cancelar()
  if (texto.value !== props.modelValue) emit('update:modelValue', texto.value)
}

function onInput(event: Event) {
  texto.value = (event.target as HTMLInputElement).value
  cancelar()
  temporizador = setTimeout(emitir, props.delayMs)
}

/** Enter busca ya y NUNCA recarga la página: alguien con prisa lo pulsa por
 *  costumbre y no puede perder la pantalla por ello. */
function onEnter() {
  emitir()
}

/** Escape limpia el término y devuelve el listado completo, sin mover el foco. */
function onEscape() {
  if (!hayTexto.value) return
  texto.value = ''
  emitir()
}

function limpiar() {
  texto.value = ''
  emitir()
  inputEl.value?.focus()
}

onUnmounted(cancelar)

defineExpose({ limpiar })
</script>

<template>
  <div class="buscador">
    <label :for="fieldId" class="etiqueta" :class="{ 'ds-sr-only': hideLabel }">{{ label }}</label>
    <div class="caja ds-field ds-field-rest ds-focus-ring ds-flex-row">
      <component :is="ICONS.SEARCH" :size="15" class="icono" aria-hidden="true" />
      <input
        :id="fieldId"
        ref="inputEl"
        type="search"
        class="ds-flex-fill"
        :value="texto"
        :placeholder="placeholder"
        autocomplete="off"
        @input="onInput"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="onEscape"
      />
      <button
        v-if="hayTexto"
        type="button"
        class="limpiar ds-hover-accent"
        aria-label="Limpiar búsqueda"
        @click="limpiar"
      >
        <component :is="ICONS.CLOSE" :size="14" />
      </button>
    </div>
    <!-- Región viva persistente: el nodo existe siempre y solo cambia su texto.
         Si se montara con `v-if` a la vez que el mensaje, muchos lectores no
         anunciarían nada porque la región no existía cuando cambió. -->
    <p class="ds-sr-only" role="status">{{ recuentoAnunciado }}</p>
  </div>
</template>

<style scoped>
.buscador {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  max-width: 360px;
  margin-bottom: var(--space-16);
}

.etiqueta {
  color: var(--text);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: 0.01em;
}

.icono {
  flex-shrink: 0;
  color: var(--text-subtle);
}

/* El relleno vertical lo lleva el `<input>` y no el envoltorio; ver
   `AppInput.vue`. */
.caja {
  padding-block: 0;
}

.caja > input {
  padding-block: var(--space-10);
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
}

.caja > input::placeholder {
  color: var(--text-placeholder);
}

/* El navegador pinta su propia cruz en `type="search"`; con la nuestra al lado
   serían dos botones de limpiar, y el nativo no tiene nombre accesible. */
.caja > input::-webkit-search-cancel-button {
  appearance: none;
}

/* Issue #102 · el `<input>` recibe también la regla global de `base.css`, que
   se sumaría al anillo del envoltorio. */
.caja > input:focus-visible {
  box-shadow: none;
}

/* 24×24 px CSS es el mínimo de §2.5.8 Target Size (AA); la app se usa con una
   mano y el animal en la otra. */
.limpiar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-subtle);
  cursor: pointer;
}
</style>
