<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  REVISION_STATE_LABEL,
  provenanceText,
  revisionState,
  type RevisionState,
} from '../composables/hintText'
import type { CatalogItemAiHintResponse } from '../types/catalog-ai-hints.types'

/**
 * El historial de revisiones de un artículo, de la más nueva a la más vieja
 * —que es el orden en que lo sirve el endpoint—.
 *
 * <p><b>No es una tabla.</b> Cada elemento contiene hasta mil caracteres en
 * varios párrafos, y una celda con eso dentro rompe el modelo de tabla de datos
 * y el `AppTable` de la casa.
 *
 * <p><b>Ningún recorte y ningún «ver más».</b> La revisión reemplazada existe
 * para poder leerla entera meses después: plegarla esconde la única evidencia de
 * con qué texto se generó una propuesta pasada.
 *
 * <p><b>Nunca `v-html`</b>: esto es texto de entrada de un formulario, y el
 * asistente lo consume como texto plano. Los saltos se conservan con
 * `white-space: pre-wrap`, que es geometría y no marcado.
 */
defineProps<{
  revisions: CatalogItemAiHintResponse[]
  meId: number | null
}>()

const emit = defineEmits<{ base: [hint: CatalogItemAiHintResponse] }>()

const BADGE_VARIANT: Record<RevisionState, 'success' | 'warning' | 'neutral'> = {
  current: 'success',
  retired: 'warning',
  superseded: 'neutral',
}
</script>

<template>
  <!-- `data-testid` porque un `<ol>` sin nombre accesible no se puede localizar
       por rol sin chocar con las listas del armazón (menú lateral, migas), y
       ponerle un `aria-label` solo para las pruebas cambiaría lo que anuncia el
       lector de pantalla. Lo que hay dentro sí se busca por rol. -->
  <ol class="ds-list-reset historial" data-testid="historial-revisiones">
    <li v-for="(hint, i) in revisions" :key="hint.id" class="ds-card ds-card--tight revision">
      <div class="cabecera">
        <p class="ds-item-label">Revisión {{ hint.hintRevision }}</p>
        <AppBadge
          :variant="BADGE_VARIANT[revisionState(hint, i)]"
          :label="REVISION_STATE_LABEL[revisionState(hint, i)]"
        />
      </div>

      <p class="texto">{{ hint.hintText }}</p>

      <p class="ds-meta">{{ provenanceText(hint, meId) }}</p>

      <div class="ds-actions ds-actions--start">
        <button type="button" class="ds-btn ds-btn--sm ds-btn--ghost" @click="emit('base', hint)">
          Usar como base
        </button>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.historial {
  display: grid;
  gap: var(--space-14);
}

.revision {
  display: grid;
  gap: var(--space-10);
}

.cabecera {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.cabecera p,
.revision p {
  margin: 0;
}

.texto {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
