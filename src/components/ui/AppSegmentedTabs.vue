<script setup lang="ts">
import { segmentedTabId, type SegmentedTabOption } from './segmented-tabs'

/**
 * Conmutador segmentado con el patrón APG **Tabs** completo
 * (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
 *
 * ── Por qué nace ──────────────────────────────────────────────────────────
 *
 * Esta consola **no tenía primitiva de pestañas**, y sus conmutadores estaban
 * resueltos cada uno a su manera en cinco sitios. El más cercano
 * (`CommercialCatalogView`) pinta un `role="tablist"` con botones que sí llevan
 * `role="tab"` y `aria-selected`, pero sin `aria-controls`, sin panel con
 * `role="tabpanel"`, sin navegación con flechas y con los dos botones en el
 * orden de tabulación. Eso no es el patrón: es su apariencia.
 *
 * **No se copia el `SegTabs` del front del tenant.** Sería un gemelo TR-02 de
 * facto no declarado — un fichero que dos repositorios tendrían que mantener
 * idéntico sin que ninguna tabla lo diga y sin que ningún gate lo compruebe—,
 * que es justo lo que esa regla existe para evitar.
 *
 * ── El panel NO está aquí dentro, y es deliberado ─────────────────────────
 *
 * Este componente pinta **solo el `role="tablist"`**. El `role="tabpanel"` lo
 * pinta la vista, porque entre el conmutador y el panel puede haber controles
 * que pertenecen a la PANTALLA y no al panel — el buscador del catálogo de
 * medicamentos es el caso: su término se conserva al cambiar de pestaña, así
 * que meterlo dentro del panel le diría al lector de pantalla que es propiedad
 * de la pestaña activa y lo haría desaparecer y reaparecer en cada cambio.
 *
 * De ahí el contrato de identificadores: la vista genera el `id` del panel con
 * `useId()` y lo pasa como `panel-id`; este componente lo usa para el
 * `aria-controls` de cada tab y deriva el `id` de cada tab con `segmentedTabId`,
 * que la vista importa del mismo módulo para su `aria-labelledby`. Los dos
 * extremos calculan lo mismo sin depender de un `ref` que en el primer render
 * todavía es `null`.
 *
 * ── Decisiones del patrón ─────────────────────────────────────────────────
 *
 *  - **Activación automática**: las flechas mueven el foco Y seleccionan. Es el
 *    comportamiento por defecto del APG, y el adecuado cuando mostrar el panel
 *    no tiene coste percibido.
 *  - **Un solo tab en el orden de tabulación** (`tabindex` móvil): Tab entra al
 *    grupo y sale de él, las flechas se mueven dentro. Un `tabindex="0"` por
 *    pestaña convertiría un grupo de N opciones en N paradas de tabulación.
 *  - **El foco se busca por `id`, no por `ref` de `v-for`**: el orden del array
 *    de refs de un `v-for` no está garantizado, y aquí la posición es
 *    exactamente lo que se necesita acertar.
 *  - **Sin `badge` ni contadores por opción.** Un «Activos (153)» exige una
 *    petición extra por pestaña en cada pulsación de tecla del buscador, o un
 *    número que se queda viejo en cuanto se busca. El recuento vive donde es
 *    exacto: el pie del paginador y la región viva del buscador.
 *  - **El estado seleccionado no se distingue solo por color** (WCAG 2.2
 *    §1.4.1): además del tono, lleva peso tipográfico, y `aria-selected` da la
 *    semántica.
 */
const props = defineProps<{
  /** Valor de la opción seleccionada. */
  modelValue: string
  options: readonly SegmentedTabOption[]
  /** Nombre accesible del grupo: «Estado del catálogo», «Vista»… */
  label: string
  /**
   * `id` del `role="tabpanel"` que gobiernan estas pestañas. Lo genera la
   * vista con `useId()`, porque el panel vive fuera de este componente.
   */
  panelId: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function enfocar(value: string) {
  document.getElementById(segmentedTabId(props.panelId, value))?.focus()
}

function seleccionar(value: string) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}

/** Flechas: mueven el foco y seleccionan, con vuelta circular. */
function mover(delta: number) {
  const actual = props.options.findIndex((o) => o.value === props.modelValue)
  const total = props.options.length
  if (total === 0) return
  const destino = props.options[(Math.max(actual, 0) + delta + total) % total]
  if (!destino) return
  seleccionar(destino.value)
  enfocar(destino.value)
}

function irA(indice: number) {
  const destino = props.options[indice]
  if (!destino) return
  seleccionar(destino.value)
  enfocar(destino.value)
}

/**
 * Devuelve el foco a la pestaña activa. Lo llama la vista tras una mutación que
 * hace desaparecer la fila que tenía el foco: sin esto el foco cae al `<body>`
 * y el siguiente Tab reempieza por el principio del documento (WCAG 2.2 §2.4.3).
 */
function focusActive() {
  enfocar(props.modelValue)
}

defineExpose({ focusActive })
</script>

<template>
  <div class="ds-flex-row ds-flex-row--6" role="tablist" :aria-label="label">
    <button
      v-for="opcion in options"
      :id="segmentedTabId(panelId, opcion.value)"
      :key="opcion.value"
      type="button"
      role="tab"
      class="ds-btn ds-btn--sm ds-focus-ring"
      :class="
        opcion.value === modelValue
          ? ['ds-tone--accent-selected', 'pestana-activa']
          : 'ds-tone--neutral-soft'
      "
      :aria-selected="opcion.value === modelValue"
      :aria-controls="panelId"
      :tabindex="opcion.value === modelValue ? 0 : -1"
      @click="seleccionar(opcion.value)"
      @keydown.left.prevent="mover(-1)"
      @keydown.right.prevent="mover(1)"
      @keydown.home.prevent="irA(0)"
      @keydown.end.prevent="irA(options.length - 1)"
    >
      {{ opcion.label }}
    </button>
  </div>
</template>

<style scoped>
/* Lo ÚNICO que este componente escribe: la segunda señal de «seleccionado»,
   que no puede ser el color (WCAG 2.2 §1.4.1). El tono viaja en las clases de
   `primitives.css` desde el marcado, nunca desde aquí. */
.pestana-activa {
  font-weight: var(--weight-semibold);
}
</style>
