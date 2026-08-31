<script setup lang="ts">
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { HINT_BLOCK_HINTS, HINT_BLOCK_LABELS } from '../composables/hintText'

/**
 * Los campos del compositor: tres áreas de texto, o una sola.
 *
 * <p><b>Por qué tres y no un `textarea` grande.</b> Convierte una invariante del
 * servidor —al menos tres bloques separados por línea en blanco— en la forma del
 * formulario, en vez de en un error que el operador descubre al enviar. Y cada
 * bloque gana su propia etiqueta, su propia ayuda y su propio mensaje asociados
 * al control (WCAG 2.2 §3.3.2 y §3.3.1): un solo campo solo puede tener un
 * mensaje para tres problemas distintos.
 *
 * <p><b>Por qué existe el modo de un solo campo, y por qué es obligatorio.</b>
 * Una pista guardada puede tener cuatro bloques o siete. Repartirla en tres
 * campos perdería los que sobran <b>en silencio</b>, y lo que se perdería es
 * texto que se le está diciendo al modelo. Cuando el texto no tiene exactamente
 * tres bloques se edita entero, y el compositor lo dice.
 *
 * <p><b>Sin `maxlength`.</b> Con tres campos no hay un tope por campo que sea
 * correcto —el del servidor mide el texto unido— y un `maxlength` que corta a
 * mitad de palabra al pegar es peor que un error explícito. El contador y el
 * mensaje viven en el compositor, sobre el texto ya unido.
 */
defineProps<{
  mode: 'blocks' | 'text'
  blocks: readonly string[]
  text: string
  /** Error ya filtrado por `touched`, uno por bloque. */
  blockErrors: readonly string[]
  textError: string
  /** `id` de cada control, generados por el compositor para el resumen de errores. */
  blockIds: readonly string[]
  textId: string
}>()

const emit = defineEmits<{
  'update:blocks': [index: number, value: string]
  'update:text': [value: string]
  blur: [field: string]
}>()
</script>

<template>
  <div class="ds-stack ds-stack--16">
    <template v-if="mode === 'blocks'">
      <AppTextarea
        v-for="(label, i) in HINT_BLOCK_LABELS"
        :id="blockIds[i]"
        :key="label"
        :model-value="blocks[i] ?? ''"
        :label="label"
        required
        :rows="i === 1 ? 4 : 3"
        :hint="HINT_BLOCK_HINTS[i]"
        :error="blockErrors[i] ?? ''"
        @update:model-value="emit('update:blocks', i, $event)"
        @blur="emit('blur', `b${i}`)"
      />
    </template>

    <AppTextarea
      v-else
      :id="textId"
      :model-value="text"
      label="Texto de la pista"
      required
      :rows="12"
      hint="Separa los bloques con una línea en blanco: qué es, qué señales lo activan y cuándo NO aplica."
      :error="textError"
      @update:model-value="emit('update:text', $event)"
      @blur="emit('blur', 'text')"
    />
  </div>
</template>
