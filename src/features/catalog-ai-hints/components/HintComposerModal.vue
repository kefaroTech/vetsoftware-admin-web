<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import ErrorSummary, { toSummaryItems } from '@/components/feedback/ErrorSummary.vue'
import { ICONS } from '@/constants/icons'
import HintTextFields from './HintTextFields.vue'
import {
  HINT_MAX_LENGTH,
  HINT_MIN_BLOCKS,
  joinBlocks,
  splitBlocks,
  validateHintBlock,
  validateHintLength,
  validateHintText,
} from '../composables/hintText'
import type { HintFormError } from '../composables/useCatalogAiHints'

/**
 * Escribir o corregir la pista de un artículo.
 *
 * <p><b>Se escribe en modal y se lee el historial en ruta propia.</b> El
 * historial es una tarea de lectura a la que se vuelve y que se enlaza; escribir
 * es un modo con principio y final, y `ModalShell` ya trae verificadas las
 * cuatro piezas de accesibilidad que hacen falta (trampa y devolución de foco,
 * Escape, pila de capas y entrada de historial). Esta consola no tiene primitiva
 * de panel lateral y esta pantalla no es quien debe inventarla.
 *
 * <p><b>Corregir no lleva confirmación</b>, y es deliberado: es la tarea número
 * uno de la pantalla, y confirmar acciones rutinarias enseña a ignorar los
 * avisos. La fricción que sí tiene es la correcta —un formulario largo, el texto
 * vigente delante y un botón que nombra la acción—. Solo la retirada confirma.
 *
 * <p><b>Tres defensas contra perder lo escrito</b>, las tres obligatorias:
 * `confirmCloseWhen` para X/Escape/backdrop, el guardián de ruta que monta la
 * vista, y que este modal <b>no se cierre cuando el envío falla</b>. Cerrarlo al
 * fallar tiraría mil caracteres redactados.
 *
 * <p><b>El botón no se deshabilita por formulario incompleto</b> —un botón
 * apagado no dice qué falta—: se confirma, se valida y el foco salta al resumen
 * de errores. Solo se apaga mientras hay envío en curso.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  mode: 'publish' | 'revise'
  /** Código del artículo, para el título. Lo resuelve quien abre el modal. */
  codigo: string
  /** Texto de la pista vigente, si la hay. Se enseña de solo lectura al corregir. */
  currentText: string | null
  currentRevision: number | null
  /** Texto con el que arrancar, cuando se abre desde «Usar como base». */
  baseText: string | null
  baseRevision: number | null
  /** Fallo del servidor que el operador arregla aquí mismo (409 / 404 / 400). */
  serverError: HintFormError | null
}>()

const emit = defineEmits<{ close: []; submit: [hintText: string] }>()

type Field = 'b0' | 'b1' | 'b2' | 'text'

const BLOCK_FIELDS: Field[] = ['b0', 'b1', 'b2']
const ids: Record<Field, string> = { b0: useId(), b1: useId(), b2: useId(), text: useId() }

const summary = ref<InstanceType<typeof ErrorSummary> | null>(null)
/** Cómo se está editando el texto ahora mismo. No confundir con `props.mode`. */
const editor = ref<'blocks' | 'text'>('blocks')
const blocks = ref<string[]>(['', '', ''])
const texto = ref('')
const inicial = ref('')
/** El texto cargado no tenía tres bloques exactos, así que se abrió como texto. */
const caidaATexto = ref(false)
const submitted = ref(false)
const touched = reactive<Record<Field, boolean>>({ b0: false, b1: false, b2: false, text: false })

const joined = computed(() =>
  editor.value === 'blocks' ? joinBlocks(blocks.value) : texto.value.trim(),
)

const puedeVolverABloques = computed(() => splitBlocks(texto.value).length === HINT_MIN_BLOCKS)

const errors = computed<Record<Field, string>>(() => ({
  b0: validateHintBlock(blocks.value[0] ?? '', 0),
  b1: validateHintBlock(blocks.value[1] ?? '', 1),
  // El exceso de longitud se mide sobre el texto UNIDO y se pinta bajo el último
  // campo, que es donde está el contador.
  b2: validateHintBlock(blocks.value[2] ?? '', 2) || validateHintLength(joined.value),
  text: validateHintText(texto.value),
}))

const orden = computed<Field[]>(() => (editor.value === 'blocks' ? BLOCK_FIELDS : ['text']))

function err(field: Field): string {
  return touched[field] || submitted.value ? errors.value[field] : ''
}

const summaryItems = computed(() => {
  const propios = toSummaryItems(
    Object.fromEntries(orden.value.map((f) => [f, err(f)])),
    ids,
    orden.value,
  )
  if (!props.serverError) return propios
  // El fallo del servidor encabeza el resumen y enlaza al primer control: es lo
  // primero que hay que revisar, y el texto ofensor sigue escrito.
  const primero = orden.value[0] ?? 'text'
  return [{ id: ids[primero], text: props.serverError.message }, ...propios]
})

function cargar(desde: string) {
  const partes = splitBlocks(desde)
  const exactos = partes.length === HINT_MIN_BLOCKS
  caidaATexto.value = desde !== '' && !exactos
  editor.value = exactos ? 'blocks' : 'text'
  blocks.value = exactos ? [...partes] : ['', '', '']
  texto.value = exactos ? '' : desde
  inicial.value = desde
  submitted.value = false
  for (const field of ['b0', 'b1', 'b2', 'text'] as Field[]) touched[field] = false
}

watch(
  () => [props.open, props.baseText, props.currentText] as const,
  ([open]) => {
    if (!open) return
    cargar(props.baseText ?? (props.mode === 'revise' ? (props.currentText ?? '') : ''))
  },
  { immediate: true },
)

function aTexto() {
  texto.value = joinBlocks(blocks.value)
  editor.value = 'text'
}

/**
 * Solo se reparte en tres campos un texto con tres bloques exactos. Repartir uno
 * de cuatro perdería el que sobra, en silencio, y lo que se perdería es texto
 * que se le está diciendo al modelo.
 */
function aBloques() {
  const partes = splitBlocks(texto.value)
  if (partes.length !== HINT_MIN_BLOCKS) return
  blocks.value = [...partes]
  caidaATexto.value = false
  editor.value = 'blocks'
}

function isDirty(): boolean {
  return joined.value !== inicial.value
}

function confirmar() {
  submitted.value = true
  for (const field of orden.value) touched[field] = true
  if (orden.value.some((field) => errors.value[field] !== '')) {
    summary.value?.focus()
    return
  }
  emit('submit', joined.value)
}

defineExpose({ isDirty })
</script>

<template>
  <ModalShell
    :open="open"
    :title="`${mode === 'publish' ? 'Escribir' : 'Corregir'} la pista de ${codigo}`"
    :icon="ICONS.AI_HINT"
    compact
    :width="720"
    accent="amatista"
    :confirm-close-when="isDirty"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--16">
        <ErrorSummary ref="summary" :items="summaryItems" :trace-id="serverError?.traceId ?? null">
          <template #trace="{ traceId }">
            <p v-if="traceId" class="ds-meta">Traza: {{ traceId }}</p>
          </template>
        </ErrorSummary>

        <div v-if="baseRevision !== null" class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Estás partiendo de la revisión {{ baseRevision }}.
            <strong>No se puede republicar un texto idéntico</strong>: cambia algo antes de
            publicar.
          </span>
        </div>

        <div v-if="caidaATexto" class="ds-banner ds-banner--info">
          <component :is="ICONS.INFO" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Esta pista no tiene tres bloques exactos, así que se edita como texto. Sepáralos con una
            línea en blanco: al menos tres.
          </span>
        </div>

        <section v-if="mode === 'revise' && currentText" class="ds-card ds-card--flat vigente">
          <p class="ds-kicker">Texto vigente · revisión {{ currentRevision }}</p>
          <p class="pista">{{ currentText }}</p>
        </section>

        <HintTextFields
          :mode="editor"
          :blocks="blocks"
          :text="texto"
          :block-errors="[err('b0'), err('b1'), err('b2')]"
          :text-error="err('text')"
          :block-ids="[ids.b0, ids.b1, ids.b2]"
          :text-id="ids.text"
          @update:blocks="(i, v) => (blocks[i] = v)"
          @update:text="texto = $event"
          @blur="touched[$event as Field] = true"
        />

        <div class="pie">
          <p class="ds-meta">{{ joined.length }} / {{ HINT_MAX_LENGTH }} caracteres</p>
          <button
            v-if="editor === 'blocks'"
            type="button"
            class="ds-btn ds-btn--plain ds-btn--sm"
            @click="aTexto"
          >
            Editar como texto
          </button>
          <button
            v-else
            type="button"
            class="ds-btn ds-btn--plain ds-btn--sm"
            :disabled="!puedeVolverABloques"
            :title="
              puedeVolverABloques
                ? undefined
                : 'Solo se reparte en tres campos un texto con tres bloques exactos: repartir uno de cuatro perdería el que sobra.'
            "
            @click="aBloques"
          >
            Editar por bloques
          </button>
        </div>

        <div class="ds-banner ds-banner--warning">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            Al publicar, el asistente empieza a usar este texto en la siguiente propuesta que
            genere. No hay despliegue y no lo revisa nadie más.
          </span>
        </div>
        <p class="ds-meta">
          Esta pantalla no puede decirte si la recomendación mejora: el efecto se ve en las
          cotizaciones que el asistente genere después.
        </p>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="ds-btn ds-btn--primary" :disabled="saving" @click="confirmar">
        {{
          saving
            ? 'Publicando…'
            : mode === 'publish'
              ? 'Publicar la pista'
              : `Publicar la revisión ${(currentRevision ?? 0) + 1}`
        }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Solo geometría: el tono y la tipografía salen de `ds-card--flat`, `ds-kicker`
   y `ds-meta`. Una regla de color aquí pesaría (0,2,0) y le ganaría a la
   primitiva, que es la trampa de especificidad que AGENTS.md documenta. */
.vigente {
  display: grid;
  gap: var(--space-8);
}

.pista {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.pie p {
  margin: 0;
}
</style>
