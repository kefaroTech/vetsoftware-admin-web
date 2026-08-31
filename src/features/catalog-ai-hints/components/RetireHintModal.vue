<script setup lang="ts">
import { computed } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ICONS } from '@/constants/icons'
import {
  deSujetoEntrecomillado,
  parentesisDelCodigo,
  signerLabel,
  sujetoCorto,
} from '../composables/hintText'
import type { HintFormError } from '../composables/useCatalogAiHints'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'

/**
 * Retirar la pista vigente de un artículo.
 *
 * <p><b>Por qué NO es `SignedActionModal`</b>, la pieza con la que esta consola
 * confirma sus otras acciones con consecuencia. Ese modal exige un motivo de
 * lista cerrada, y su valor es que ese motivo <i>viaja con la operación</i> y
 * queda escrito para quien la audite. `DELETE /catalog-item-ai-hints/{id}` no
 * lleva cuerpo —el javadoc del controller lo subraya: «no hay cuerpo del que
 * pudiera salir»— así que un motivo pedido aquí se tiraría al enviar. Sería
 * teatro de auditoría. Se calca `ConfirmSuppressionModal`, que es el precedente
 * exacto: sujeto a la vista, consecuencias enumeradas, sin motivo que viajar.
 *
 * <p><b>Y no es `useConfirmDialog`</b>: ese pinta un mensaje, una consecuencia y
 * un rótulo, y no sostiene la estructura «qué pasa / qué NO pasa» que esta
 * acción necesita — la mitad del trabajo del diálogo es desmentir lo que un
 * `DELETE` promete.
 *
 * <p><b>No hay deshacer, y por eso el diálogo carga todo el peso.</b> El índice
 * único `uq_catalog_item_ai_hints_text` cubre TODAS las filas, así que
 * republicar el texto retirado —el único «revertir» posible en un modelo
 * append-only— responde 409. La confirmación es lo único que hay.
 */
const props = defineProps<{
  open: boolean
  saving: boolean
  hint: CatalogItemAiHintResponse | null
  /** Quién firma. `null` = la sesión no se pudo identificar: no se confirma. */
  meId: number | null
  serverError: HintFormError | null
  /**
   * A11Y-08 · dónde dejar el foco al cerrar. Se pasa <b>como función</b> porque
   * al retirar desde el listado la fila que abrió el diálogo desaparece con él:
   * sin esto el foco cae al `body` y quien navega con teclado reaparece al
   * principio del documento sin saber qué pasó.
   */
  returnFocusTo?: HTMLElement | (() => HTMLElement | null) | string | null
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()

const codigo = computed(() => (props.hint ? sujetoCorto(props.hint) : ''))
/** El sujeto ya preposicionado y, si procede, entrecomillado. Ver `hintText`. */
const sujetoPregunta = computed(() => (props.hint ? deSujetoEntrecomillado(props.hint) : ''))
/** Vacío cuando repetiría lo que el sujeto ya dice. La regla vive en `hintText`. */
const codigoEntreParentesis = computed(() => (props.hint ? parentesisDelCodigo(props.hint) : ''))
const revision = computed(() => props.hint?.hintRevision ?? 0)
</script>

<template>
  <ModalShell
    :open="open"
    :title="`Retirar la pista de ${codigo}`"
    :icon="ICONS.WARNING"
    accent="danger"
    role="alertdialog"
    compact
    :width="560"
    :return-focus-to="returnFocusTo"
    @close="emit('close')"
  >
    <template #body>
      <div class="ds-stack ds-stack--16">
        <p class="ds-dialog-body">
          ¿Retirar la pista vigente <strong class="sujeto">{{ sujetoPregunta }}</strong
          >{{ codigoEntreParentesis }}?
        </p>

        <div v-if="serverError" class="ds-banner ds-banner--error" role="alert">
          <component :is="ICONS.ERROR" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">{{ serverError.message }}</span>
        </div>

        <div class="ds-banner ds-banner--warning" role="alert">
          <component :is="ICONS.WARNING" :size="16" class="ds-banner-icon" />
          <span class="ds-flex-fill">
            El asistente <strong>dejará de proponer este artículo</strong> en la siguiente
            cotización. Rige de inmediato: no hay despliegue ni revisión de nadie.
          </span>
        </div>

        <div class="ds-stack ds-stack--8">
          <p class="ds-kicker">Qué NO pasa</p>
          <p class="ds-meta">
            <strong>No se borra nada.</strong> La revisión {{ revision }} se queda en el historial
            con su texto y su fecha. Si más adelante vuelves a publicar, la numeración sigue en
            {{ revision + 1 }}.
          </p>
        </div>

        <div class="ds-stack ds-stack--8">
          <p class="ds-kicker">Quién firma</p>
          <p v-if="meId !== null" class="ds-meta">
            Queda firmado por <strong>{{ signerLabel(meId, meId) }}</strong
            >. Es lo único que dirá quién apagó este artículo.
          </p>
          <p v-else class="ds-banner ds-banner--error" role="alert">
            No se pudo identificar la sesión, así que la retirada no quedaría firmada. Vuelve a
            entrar antes de retirar.
          </p>
        </div>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--danger"
        :disabled="saving || meId === null"
        @click="emit('confirm')"
      >
        {{ saving ? 'Retirando…' : 'Retirar la pista' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* El sujeto se lee entero aunque el nombre sea largo: cortarlo por la mitad en
   el diálogo que apaga comercialmente un artículo es el peor sitio donde
   ahorrar espacio. */
.sujeto {
  overflow-wrap: anywhere;
}
</style>
