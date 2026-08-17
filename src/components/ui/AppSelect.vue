<script setup lang="ts" generic="T extends string | number">
import { Check, ChevronDown } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

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
</script>

<template>
  <div class="app-field">
    <label v-if="label" :for="controlId" class="app-label">
      {{ label }}<span v-if="required" class="app-req">*</span>
    </label>
    <div ref="root" class="app-select" :class="{ disabled, 'has-error': !!error, open }">
      <button
        :id="controlId"
        ref="trigger"
        type="button"
        class="app-select__trigger"
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
        <span
          class="app-select__value ds-flex-fill ds-truncate"
          :class="{ placeholder: !selected }"
        >
          {{ selected?.label ?? placeholder }}
        </span>
        <ChevronDown class="app-select__chev" :size="16" />
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
    <p v-if="error" class="app-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
}

.app-select__value {
  text-align: left;
}

.app-select__value.placeholder {
  color: #a89bbd;
}

.app-select__chev {
  flex-shrink: 0;
  color: #a89bbd;
  pointer-events: none;
  transition:
    transform 0.18s ease,
    color 0.15s ease;
}

.app-select.open .app-select__chev {
  transform: rotate(180deg);
  color: var(--vs-field-focus);
}
</style>

<style>
/* El panel se teletransporta a <body>: estilos globales acotados por la clase. */
.app-select-panel {
  z-index: 2100;
  margin: 0;
  padding: 5px;
  list-style: none;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--vs-field-border);
  border-radius: 11px;
  box-shadow: 0 14px 38px rgb(88 28 135 / 18%);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
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
  gap: 10px;
  padding: 9px 11px;
  border-radius: 8px;
  font-size: 14px;
  color: #3d2e57;
  cursor: pointer;
}

.app-select-panel__item + .app-select-panel__item {
  margin-top: 2px;
}

.app-select-panel__check {
  flex-shrink: 0;
  color: #7e22ce;
}

.app-select-panel__item.active {
  background: #f3e8ff;
  color: #6b21a8;
}

.app-select-panel__item.selected {
  font-weight: 600;
  color: #6b21a8;
}

.app-select-panel__empty {
  padding: 12px 11px;
  font-size: 13px;
  color: #a89bbd;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .app-select-panel {
    animation: none;
  }
}
</style>
