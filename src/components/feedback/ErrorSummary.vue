<script lang="ts">
export interface ErrorSummaryItem {
  /** id del CONTROL, no del mensaje. Es el mismo que `<label for>` y que el `id` del input. */
  id: string
  /** Texto EXACTO del error en línea. No se reformula: GOV.UK exige coincidencia literal. */
  text: string
}

/**
 * Convierte el mapa `errors` de un formulario en items del resumen, en el ORDEN DEL DOM.
 *
 * `order` es explícito y no `Object.keys(errors)`: el orden del resumen tiene que ser el
 * orden visual del formulario (WCAG §2.4.3), y el orden de claves de un objeto no lo
 * garantiza en cuanto alguien reordena el `computed` que produce `errors`.
 */
export function toSummaryItems(
  errors: Record<string, string | null | undefined>,
  ids: Record<string, string>,
  order: string[],
): ErrorSummaryItem[] {
  return order.flatMap((k) => {
    const text = errors[k]
    const id = ids[k]
    if (!text || !id) return []
    return [{ id, text }]
  })
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    items?: ErrorSummaryItem[]
    /** Sustituye el encabezado por defecto. Solo para casos donde «problemas» no encaja. */
    title?: string
    /** Identificador de traza, si el resumen viene de un fallo del servidor. */
    traceId?: string | null
  }>(),
  { items: () => [] },
)

const root = ref<HTMLElement | null>(null)

const headline = computed(
  () =>
    props.title ??
    (props.items.length === 1
      ? 'Hay 1 problema en este formulario'
      : `Hay ${props.items.length} problemas en este formulario`),
)

/** El padre lo llama tras un `validate()` fallido. Sin autofoco al montar: estos
 * formularios suelen vivir dentro de `ModalShell`, que ya pone el foco inicial. */
function focus() {
  root.value?.focus({ preventScroll: false })
}

/** El ancla mueve el FOCO, no solo el hash: el contenedor de scroll suele ser un
 * `div` con `overflow: auto`, y el salto por hash del navegador no lo desplaza. */
function goTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.focus({ preventScroll: true })
}

defineExpose({ focus })
</script>

<template>
  <div
    v-if="items.length > 0"
    ref="root"
    class="ds-banner ds-banner--error ds-error-summary"
    role="alert"
    tabindex="-1"
    data-error-anchor
  >
    <p class="ds-error-summary__title">{{ headline }}</p>
    <ul class="ds-error-summary__list">
      <li v-for="it in items" :key="it.id">
        <a :href="`#${it.id}`" @click.prevent="goTo(it.id)">{{ it.text }}</a>
      </li>
    </ul>
    <slot name="trace" :trace-id="traceId" />
  </div>
</template>
