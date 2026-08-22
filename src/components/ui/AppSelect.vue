<script setup lang="ts" generic="T extends string | number">
import { Check, ChevronDown } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { ICONS } from '@/constants/icons'

interface Option {
  value: T
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: T | null
    options: Option[]
    label?: string
    required?: boolean
    error?: string
    /** Texto de ayuda persistente bajo el campo. Se oculta mientras hay error. */
    hint?: string
    placeholder?: string
    id?: string
    disabled?: boolean
  }>(),
  { placeholder: 'Selecciona una opción' },
)

const emit = defineEmits<{
  'update:modelValue': [value: T]
  blur: []
}>()

const autoId = useId()
const controlId = computed(() => props.id ?? autoId)

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const open = ref(false)
const highlighted = ref(-1)
const panelStyle = ref<Record<string, string>>({})

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const selectedIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))

function updatePosition() {
  const t = trigger.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  const spaceAbove = r.top
  const openUp = spaceBelow < 260 && spaceAbove > spaceBelow
  panelStyle.value = {
    position: 'fixed',
    left: `${Math.round(r.left)}px`,
    width: `${Math.round(r.width)}px`,
    maxHeight: `${Math.max(160, Math.round((openUp ? spaceAbove : spaceBelow) - 12))}px`,
    ...(openUp
      ? { bottom: `${Math.round(window.innerHeight - r.top + 4)}px` }
      : { top: `${Math.round(r.bottom + 4)}px` }),
  }
}

function onScrollResize() {
  if (open.value) updatePosition()
}

function openPanel() {
  if (props.disabled || open.value) return
  open.value = true
  highlighted.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  updatePosition()
  window.addEventListener('scroll', onScrollResize, true)
  window.addEventListener('resize', onScrollResize)
  nextTick(scrollHighlightedIntoView)
}

function close(refocus = false) {
  if (!open.value) return
  open.value = false
  window.removeEventListener('scroll', onScrollResize, true)
  window.removeEventListener('resize', onScrollResize)
  if (refocus) trigger.value?.focus()
}

function toggle() {
  open.value ? close(true) : openPanel()
}

function pick(opt: Option) {
  emit('update:modelValue', opt.value)
  close()
  emit('blur')
}

function scrollHighlightedIntoView() {
  panel.value
    ?.querySelector<HTMLElement>(`[data-idx="${highlighted.value}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}

function move(delta: number) {
  const n = props.options.length
  if (n === 0) return
  highlighted.value = (highlighted.value + delta + n) % n
  nextTick(scrollHighlightedIntoView)
}

// Typeahead: salta a la opción cuya etiqueta empieza por lo tecleado.
let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | null = null
function onType(char: string) {
  typeahead += char.toLowerCase()
  if (typeaheadTimer) clearTimeout(typeaheadTimer)
  typeaheadTimer = setTimeout(() => (typeahead = ''), 600)
  const idx = props.options.findIndex((o) => o.label.toLowerCase().startsWith(typeahead))
  if (idx >= 0) {
    highlighted.value = idx
    nextTick(scrollHighlightedIntoView)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      open.value ? move(1) : openPanel()
      break
    case 'ArrowUp':
      e.preventDefault()
      open.value ? move(-1) : openPanel()
      break
    case 'Home':
      if (open.value) {
        e.preventDefault()
        highlighted.value = 0
        nextTick(scrollHighlightedIntoView)
      }
      break
    case 'End':
      if (open.value) {
        e.preventDefault()
        highlighted.value = props.options.length - 1
        nextTick(scrollHighlightedIntoView)
      }
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (!open.value) openPanel()
      else {
        const highlightedOption = props.options[highlighted.value]
        if (highlightedOption) pick(highlightedOption)
      }
      break
    case 'Escape':
      if (open.value) {
        e.preventDefault()
        close(true)
        emit('blur')
      }
      break
    case 'Tab':
      if (open.value) {
        close()
        emit('blur')
      }
      break
    default:
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!open.value) openPanel()
        onType(e.key)
      }
  }
}

function onDocMouseDown(e: MouseEvent) {
  if (!open.value) return
  const t = e.target as Node
  if (root.value?.contains(t) || panel.value?.contains(t)) return
  close()
  emit('blur')
}

// Si las opciones cambian y la resaltada queda fuera de rango, reajusta.
watch(
  () => props.options.length,
  (n) => {
    if (highlighted.value >= n) highlighted.value = n - 1
  },
)

onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  window.removeEventListener('scroll', onScrollResize, true)
  window.removeEventListener('resize', onScrollResize)
  if (typeaheadTimer) clearTimeout(typeaheadTimer)
})

/**
 * DS-01: el disparador adopta el patrón de dos capas de `AppInput` — `.ds-field`
 * pone la geometría y UNA sola clase de estado pone el tono. Ver la cabecera de
 * `AppInput.vue` para el porqué de que las ramas sean excluyentes.
 *
 * `.ds-focus-ring--no-outline` acompaña siempre a `.ds-focus-ring` porque el
 * disparador es un `<button>`: la primera aporta borde y anillo, la segunda solo
 * apaga el `outline` nativo que si no se sumaría al anillo.
 *
 * El estado abierto ya no necesita regla propia: `.ds-focus-ring:focus` cubre el
 * clic de ratón (que deja el foco en el botón) además del `:focus-visible` del
 * teclado, así que el disparador abierto sale con el mismo anillo que enfocado.
 */
const toneClass = computed(() => {
  if (props.error) return ['ds-field-invalid', open.value ? 'ds-field-invalid-focus' : null]
  if (props.disabled) return ['tone-border', 'ds-field-disabled']
  return ['ds-field-rest', 'ds-focus-ring', 'ds-focus-ring--no-outline']
})
</script>

<template>
  <div class="field ds-stack">
    <label v-if="label" :for="controlId" class="label">
      {{ label }}<span v-if="required" class="required">*</span>
    </label>
    <div ref="root" class="select">
      <button
        :id="controlId"
        ref="trigger"
        type="button"
        class="trigger ds-field ds-flex-row"
        :class="toneClass"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-invalid="!!error || undefined"
        :aria-activedescendant="
          open && highlighted >= 0 ? `${controlId}-opt-${highlighted}` : undefined
        "
        :disabled="disabled"
        @click="toggle"
        @keydown="onKeydown"
      >
        <span class="value ds-flex-fill ds-truncate" :class="{ 'is-placeholder': !selected }">
          {{ selected?.label ?? placeholder }}
        </span>
        <ChevronDown class="chev" :size="16" />
      </button>

      <Teleport to="body">
        <ul v-if="open" ref="panel" class="app-select-panel" role="listbox" :style="panelStyle">
          <li v-if="options.length === 0" class="app-select-panel__empty">Sin opciones</li>
          <li
            v-for="(o, i) in options"
            :id="`${controlId}-opt-${i}`"
            :key="String(o.value)"
            class="app-select-panel__item"
            :class="{ active: i === highlighted, selected: o.value === modelValue }"
            role="option"
            :aria-selected="o.value === modelValue"
            :data-idx="i"
            @mousedown.prevent="pick(o)"
            @mousemove="highlighted = i"
          >
            <span class="ds-flex-fill ds-truncate">{{ o.label }}</span>
            <Check v-if="o.value === modelValue" class="app-select-panel__check" :size="15" />
          </li>
        </ul>
      </Teleport>
    </div>
    <p v-if="error" class="error">
      <component :is="ICONS.WARNING" :size="11" />
      <span>{{ error }}</span>
    </p>
    <p v-else-if="hint" class="ds-hint">{{ hint }}</p>
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

.select {
  position: relative;
}

.trigger {
  width: 100%;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}

.trigger:hover:not(.ds-field-invalid, .ds-field-disabled, :focus) {
  border-color: var(--warm-500);
}

.value {
  text-align: left;
}

.value.is-placeholder {
  color: var(--text-placeholder);
}

.chev {
  flex-shrink: 0;
  color: var(--text-subtle);
  pointer-events: none;
  transition:
    transform 0.18s ease,
    color var(--transition-base);
}

.trigger[aria-expanded='true'] .chev {
  transform: rotate(180deg);
  color: var(--amatista-500);
}
</style>

<style>
/* El panel se teletransporta a <body>: estilos globales acotados por la clase.
   DS-01 retiró sus cinco hexadecimales (#fff, #f3e8ff, #6b21a8, #7e22ce,
   #a89bbd) y la familia `Inter` literal — el panel vive fuera del árbol de la
   app, así que no heredaba la tipografía de `base.css` y la traía a mano. */
.app-select-panel {
  z-index: var(--z-popover);
  margin: 0;
  padding: var(--space-4);
  list-style: none;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  font-family: var(--font-sans);
  animation: app-select-pop 0.13s ease;
}

@keyframes app-select-pop {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-select-panel__item {
  display: flex;
  align-items: center;
  gap: var(--space-10);
  padding: var(--space-8) var(--space-11);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  color: var(--text);
  cursor: pointer;
}

.app-select-panel__item + .app-select-panel__item {
  margin-top: var(--space-2);
}

.app-select-panel__check {
  flex-shrink: 0;
  color: var(--amatista-700);
}

.app-select-panel__item.active {
  background: var(--amatista-50);
  color: var(--amatista-800);
}

.app-select-panel__item.selected {
  font-weight: var(--weight-semibold);
  color: var(--amatista-800);
}

.app-select-panel__empty {
  padding: var(--space-12) var(--space-11);
  font-size: var(--text-body);
  color: var(--text-subtle);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .app-select-panel {
    animation: none;
  }
}
</style>
